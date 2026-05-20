import { NextRequest, NextResponse } from "next/server";
import { getNotchPayConfig, getAdminClient } from "@/lib/dons/server";

export const runtime = "nodejs";

/**
 * Webhook Notch Pay — POST entrant.
 * Header attendu : `x-notch-signature` ou hash secret partagé.
 *
 * Configurer côté Notch Pay Dashboard :
 *   - URL : https://<ton-domaine>/api/dons/notchpay/webhook
 *   - Events : payment.complete, payment.failed
 *   - Hash secret → NOTCH_PAY_WEBHOOK_HASH
 */
export async function POST(req: NextRequest) {
  const cfg = getNotchPayConfig();
  if (!cfg.secretKey) {
    return NextResponse.json({ error: "Notch Pay non configuré" }, { status: 503 });
  }

  // Vérifie le hash (si configuré). Notch Pay envoie le hash en header `x-notch-signature`.
  if (cfg.webhookHash) {
    const sig = req.headers.get("x-notch-signature") ?? "";
    if (sig !== cfg.webhookHash) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }
  }

  const event = await req.json() as Record<string, unknown>;
  const eventType = (event["event"] ?? event["type"]) as string | undefined;
  const data = (event["data"] ?? {}) as Record<string, unknown>;
  const reference = (data["reference"] ?? data["merchant_reference"]) as string | undefined;
  const providerStatus = (data["status"] as string | undefined) ?? "UNKNOWN";

  if (!reference) {
    return NextResponse.json({ error: "Reference manquante dans le payload" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });

  // Cherche le record (notre id local OU provider_ref qu'on a stocké)
  const { data: rec } = await admin
    .from("donations_records")
    .select("id, status")
    .or(`id.eq.${reference},provider_ref.eq.${reference}`)
    .maybeSingle();
  if (!rec) {
    return NextResponse.json({ error: "Record introuvable pour cette référence" }, { status: 404 });
  }
  const record = rec as { id: string; status: string };

  // Mapping des events Notch Pay
  let newStatus: "confirmed" | "cancelled" | "pending" = "pending";
  if (eventType === "payment.complete" || providerStatus === "complete" || providerStatus === "completed") {
    newStatus = "confirmed";
  } else if (eventType === "payment.failed" || eventType === "payment.canceled"
          || providerStatus === "failed" || providerStatus === "canceled" || providerStatus === "cancelled") {
    newStatus = "cancelled";
  }

  // Idempotence : ne touche pas si déjà confirmé/annulé
  if (record.status !== "pending" && newStatus !== "pending") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const update: Record<string, unknown> = {
    provider_status: providerStatus,
    provider_payload: event,
  };
  if (newStatus !== "pending") update.status = newStatus;

  const { error: upErr } = await admin
    .from("donations_records").update(update).eq("id", record.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ received: true, status: newStatus });
}
