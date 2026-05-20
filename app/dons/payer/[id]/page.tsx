import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import PayerClient from "./PayerClient";
import type { DonationRecord } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payer mon don — CCB" };

export default async function PayerPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/dons/payer/${id}`);

  const { data } = await supabase
    .from("donations_records")
    .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at, receipt_number, dedication, payment_provider, provider_ref, provider_status")
    .eq("id", id).maybeSingle();
  if (!data) return notFound();
  const record = data as DonationRecord;
  if (record.user_id !== user.id) redirect("/dons/mes-dons");

  // Si déjà confirmé → redirige vers merci
  if (record.status === "confirmed") {
    redirect(`/dons/merci?id=${record.id}&paid=1`);
  }
  if (record.status === "cancelled") {
    redirect(`/dons/mes-dons`);
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const paypalEnv = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
  const notchPayEnabled = Boolean(process.env.NEXT_PUBLIC_NOTCH_PAY_PUBLIC_KEY);

  return (
    <PayerClient
      record={record}
      paypalClientId={paypalClientId}
      paypalEnv={paypalEnv}
      notchPayEnabled={notchPayEnabled}
      justPaid={sp?.paid === "1"}
    />
  );
}
