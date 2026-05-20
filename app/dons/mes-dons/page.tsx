import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MesDonsClient from "./MesDonsClient";
import type { DonationRecord, DonationRecurring } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes dons — CCB" };

interface CampaignLite {
  id: string;
  slug: string;
  title: string;
}

export default async function MesDonsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dons/mes-dons");

  let records: DonationRecord[] = [];
  let recurring: DonationRecurring[] = [];
  let campaigns: CampaignLite[] = [];
  try {
    const { data } = await supabase
      .from("donations_records")
      .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at, receipt_number, dedication")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    records = (data ?? []) as DonationRecord[];
  } catch { /* table pas migrée */ }

  try {
    const { data } = await supabase
      .from("donations_recurring")
      .select("id, user_id, kind, campaign_id, amount_native, currency, amount_xaf, day_of_month, preferred_mode, is_active, notes, started_at, last_paid_at, ended_at, created_at")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("started_at", { ascending: false });
    recurring = (data ?? []) as DonationRecurring[];
  } catch { /* noop */ }

  const campIds = new Set<string>();
  records.forEach((r) => { if (r.campaign_id) campIds.add(r.campaign_id); });
  recurring.forEach((r) => { if (r.campaign_id) campIds.add(r.campaign_id); });
  if (campIds.size > 0) {
    const { data } = await supabase
      .from("donations_campaigns").select("id, slug, title").in("id", Array.from(campIds));
    campaigns = (data ?? []) as CampaignLite[];
  }

  return <MesDonsClient records={records} recurring={recurring} campaigns={campaigns} />;
}
