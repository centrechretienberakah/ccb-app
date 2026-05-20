import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getPayPalAccessToken, getPayPalConfig, getAdminClient } from "@/lib/dons/server";

export const runtime = "nodejs";

// POST { orderId: string, recordId: string }
// → { status: "confirmed" | "failed", record: {...} }
export async function POST(req: NextRequest) {
  const cfg = getPayPalConfig();
  if (!cfg.clientSecret) {
    return NextResponse.json({ error: "PayPal non configuré" }, { status: 503 });
  }

  const { orderId, recordId } = await req.json();
  if (!orderId || !recordId) return NextResponse.json({ error: "orderId + recordId requis" }, { status: 400 });

  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getPayPalAccessToken();
  if (!token) return NextResponse.json({ error: "Token PayPal indisponible" }, { status: 503 });

  const capRes = await fetch(`${cfg.base}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "PayPal-Request-Id": `cap-${orderId}`, // idempotency
    },
  });
  const captureData = await capRes.json();
  if (!capRes.ok) {
    return NextResponse.json({ error: `PayPal capture failed`, details: captureData }, { status: capRes.status });
  }

  // Si le paiement est COMPLETED → on confirme le record (via admin client)
  const status = captureData?.status as string | undefined;
  const admin = getAdminClient() ?? sb;

  if (status === "COMPLETED") {
    const { data: updated, error: upErr } = await admin
      .from("donations_records")
      .update({
        status: "confirmed",
        payment_provider: "paypal",
        provider_ref: orderId,
        provider_status: status,
        provider_payload: captureData,
      })
      .eq("id", recordId)
      .select().single();
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ status: "confirmed", record: updated });
  }

  // Sinon, on garde pending + log le statut
  await admin.from("donations_records").update({
    provider_status: status ?? "UNKNOWN",
    provider_payload: captureData,
  }).eq("id", recordId);

  return NextResponse.json({ status: "failed", providerStatus: status });
}
