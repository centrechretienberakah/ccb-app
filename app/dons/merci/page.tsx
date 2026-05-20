import { createClient } from "@/lib/supabase/server";
import MerciClient from "./MerciClient";
import type { DonationRecord } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merci — Don déclaré" };

export default async function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; guest?: string; intent?: string }>;
}) {
  const params = await searchParams;
  const id = params?.id ?? null;

  let record: DonationRecord | null = null;
  if (id) {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("donations_records")
        .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at, receipt_number")
        .eq("id", id).maybeSingle();
      record = (data ?? null) as DonationRecord | null;
    } catch { /* noop */ }
  }

  // Si campaign lié, on récupère son titre pour le récap
  let campaignTitle: string | null = null;
  if (record?.campaign_id) {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("donations_campaigns").select("title").eq("id", record.campaign_id).maybeSingle();
      campaignTitle = (data as { title: string } | null)?.title ?? null;
    } catch { /* noop */ }
  }

  return <MerciClient record={record} campaignTitle={campaignTitle} isGuest={params?.guest === "1"} />;
}
