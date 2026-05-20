import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getPayPalAccessToken, getPayPalConfig, toPayPalAmount } from "@/lib/dons/server";

export const runtime = "nodejs";

// POST { recordId: string }
// → { orderId: string }
export async function POST(req: NextRequest) {
  const cfg = getPayPalConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.json({ error: "PayPal non configuré (NEXT_PUBLIC_PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET requis)" }, { status: 503 });
  }

  const { recordId } = await req.json();
  if (!recordId) return NextResponse.json({ error: "recordId requis" }, { status: 400 });

  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("donations_records")
    .select("id, user_id, kind, amount_native, currency, amount_xaf, status, reference, campaign_id")
    .eq("id", recordId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Record introuvable" }, { status: 404 });
  if (data.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (data.status !== "pending") return NextResponse.json({ error: "Record déjà " + data.status }, { status: 409 });

  // PayPal n'accepte pas XAF/CDF → on convertit en EUR (sauf si déjà EUR ou USD)
  const targetCurrency: "EUR" | "USD" = data.currency === "USD" ? "USD" : "EUR";
  const amount = data.currency === targetCurrency
    ? { value: Number(data.amount_native).toFixed(2), currency_code: targetCurrency as "EUR" | "USD" }
    : toPayPalAmount(Number(data.amount_xaf), targetCurrency);

  const token = await getPayPalAccessToken();
  if (!token) return NextResponse.json({ error: "Token PayPal indisponible" }, { status: 503 });

  const orderRes = await fetch(`${cfg.base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "PayPal-Request-Id": data.id, // idempotency
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: data.id,
        description: `Don CCB - ${data.kind} - ${data.reference ?? ""}`.slice(0, 127),
        amount,
      }],
      application_context: {
        brand_name: "Centre Chrétien Berakah",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    }),
  });
  if (!orderRes.ok) {
    const err = await orderRes.text();
    return NextResponse.json({ error: `PayPal create-order failed: ${err}` }, { status: orderRes.status });
  }
  const order = await orderRes.json() as { id: string };

  // Pré-tag le record avec le provider + ref pour audit
  await sb.from("donations_records").update({
    payment_provider: "paypal",
    provider_ref: order.id,
    provider_status: "CREATED",
  }).eq("id", data.id);

  return NextResponse.json({ orderId: order.id });
}
