import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MesDonsClient from "./MesDonsClient";
import type { DonationRecord } from "@/lib/dons/theme";

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
  let campaigns: CampaignLite[] = [];
  try {
    const { data } = await supabase
      .from("donations_records")
      .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    records = (data ?? []) as DonationRecord[];
  } catch { /* table pas migrée */ }

  if (records.length > 0) {
    const ids = Array.from(new Set(records.map((r) => r.campaign_id).filter(Boolean) as string[]));
    if (ids.length > 0) {
      const { data } = await supabase
        .from("donations_campaigns").select("id, slug, title").in("id", ids);
      campaigns = (data ?? []) as CampaignLite[];
    }
  }

  return <MesDonsClient records={records} campaigns={campaigns} />;
}
