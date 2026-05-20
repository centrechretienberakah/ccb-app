import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getNotchPayConfig } from "@/lib/dons/server";

export const runtime = "nodejs";

// POST { recordId: string, channel?: "mtn"|"orange"|"cm.mobile" }
// → { authorization_url: string, reference: string }
//
// Notch Pay : provider Cameroun multi-canal (MTN MoMo + Orange Money + Visa)
// Doc : https://developer.notchpay.co/
export async function POST(req: NextRequest) {
  const cfg = getNotchPayConfig();
  if (!cfg.publicKey) {
    return NextResponse.json({ error: "Notch Pay non configuré (NEXT_PUBLIC_NOTCH_PAY_PUBLIC_KEY requis)" }, { status: 503 });
  }

  const { recordId, channel } = await req.json();
  if (!recordId) return NextResponse.json({ error: "recordId requis" }, { status: 400 });

  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("donations_records")
    .select("id, user_id, kind, amount_native, currency, amount_xaf, status, reference, donor_email")
    .eq("id", recordId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Record introuvable" }, { status: 404 });
  if (data.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (data.status !== "pending") return NextResponse.json({ error: "Record déjà " + data.status }, { status: 409 });

  // Construit l'URL de callback côté CCB
  const h = await headers();
  const host = h.get("host") ?? "centrechretienberakah.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const callbackUrl = `${proto}://${host}/dons/payer/${data.id}?paid=1`;

  // Notch Pay accepte XAF directement
  const payload = {
    email: data.donor_email ?? user.email ?? "noemail@ccb.app",
    amount: Number(data.amount_xaf), // toujours en XAF
    currency: "XAF",
    description: `Don CCB - ${data.kind} - ${data.reference ?? ""}`.slice(0, 100),
    reference: data.id, // notre id local = unique
    callback: callbackUrl,
    ...(channel ? { channel } : {}),
  };

  const res = await fetch(`${cfg.base}/payments/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": cfg.publicKey,
    },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: result?.message ?? "Notch Pay init failed", details: result }, { status: res.status });
  }

  const authUrl = result?.authorization_url as string | undefined;
  const reference = result?.transaction?.reference as string | undefined;
  if (!authUrl) {
    return NextResponse.json({ error: "authorization_url manquante", details: result }, { status: 502 });
  }

  // Pré-tag le record
  await sb.from("donations_records").update({
    payment_provider: "notchpay",
    provider_ref: reference ?? data.id,
    provider_status: "PENDING",
  }).eq("id", data.id);

  return NextResponse.json({ authorization_url: authUrl, reference });
}
