import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalConfig, getAdminClient } from "@/lib/dons/server";

export const runtime = "nodejs";

/**
 * Webhook PayPal — POST entrant signé par PayPal.
 * Vérifie la signature via API verify-webhook-signature puis confirme le record.
 *
 * Configurer côté PayPal Developer Dashboard :
 *   - URL : https://<ton-domaine>/api/dons/paypal/webhook
 *   - Events : PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED
 *   - Récupère le webhook ID → PAYPAL_WEBHOOK_ID
 */
export async function POST(req: NextRequest) {
  const cfg = getPayPalConfig();
  if (!cfg.clientSecret) {
    return NextResponse.json({ error: "PayPal non configuré" }, { status: 503 });
  }

  const rawBody = await req.text();
  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  // 1) Vérification signature (si webhookId configuré)
  if (cfg.webhookId) {
    const token = await getPayPalAccessToken();
    if (!token) return NextResponse.json({ error: "Token indispo" }, { status: 503 });

    const verifyRes = await fetch(`${cfg.base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        auth_algo:         req.headers.get("paypal-auth-algo"),
        cert_url:          req.headers.get("paypal-cert-url"),
        transmission_id:   req.headers.get("paypal-transmission-id"),
        transmission_sig:  req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id:        cfg.webhookId,
        webhook_event:     event,
      }),
    });
    if (!verifyRes.ok) return NextResponse.json({ error: "Vérification webhook échouée" }, { status: 401 });
    const verifyData = await verifyRes.json() as { verification_status: string };
    if (verifyData.verification_status !== "SUCCESS") {
      return NextResponse.json({ error: "Webhook non vérifié" }, { status: 401 });
    }
  }
  // Si pas de webhookId configuré → on accepte (sandbox / dev) mais on log

  const eventType = (event["event_type"] as string) || "";
  const resource = (event["resource"] as Record<string, unknown>) || {};

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });

  // PAYMENT.CAPTURE.COMPLETED → confirme le record correspondant
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    // Le custom_id ou reference_id contient notre recordId
    const purchaseUnits = (resource["supplementary_data"] as Record<string, unknown> | undefined)?.["related_ids"];
    const orderId = (purchaseUnits as Record<string, unknown> | undefined)?.["order_id"] as string | undefined
      ?? (resource["invoice_id"] as string | undefined);

    if (orderId) {
      // Cherche le record par provider_ref (l'orderId qu'on avait stocké)
      const { data: rec } = await admin
        .from("donations_records")
        .select("id, status")
        .eq("provider_ref", orderId).maybeSingle();
      if (rec && (rec as { status: string }).status === "pending") {
        await admin.from("donations_records").update({
          status: "confirmed",
          provider_status: "COMPLETED",
          provider_payload: event,
        }).eq("id", (rec as { id: string }).id);
      }
    }
  }

  // PAYMENT.CAPTURE.REFUNDED → on annule le record
  if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
    const orderId = (resource["invoice_id"] as string | undefined);
    if (orderId) {
      const { data: rec } = await admin
        .from("donations_records").select("id").eq("provider_ref", orderId).maybeSingle();
      if (rec) {
        await admin.from("donations_records").update({
          status: "cancelled",
          provider_status: "REFUNDED",
          provider_payload: event,
        }).eq("id", (rec as { id: string }).id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
