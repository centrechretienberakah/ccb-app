import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DonsAnalyticsClient, {
  type GlobalKpis, type MonthlyPoint, type KindStat, type TopDonor, type CampaignStat,
} from "./DonsAnalyticsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Dons" };

const EMPTY_KPIS: GlobalKpis = {
  confirmed_count: 0, total_xaf_confirmed: 0,
  pending_count: 0,   total_xaf_pending: 0,
  unique_donors: 0, active_campaigns: 0, avg_xaf_per_donation: 0,
};

export default async function DonsAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dons/admin/analytics");
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect("/dons/admin");
  }

  let kpis: GlobalKpis = EMPTY_KPIS;
  let monthly: MonthlyPoint[] = [];
  let byKind: KindStat[] = [];
  let topDonors: TopDonor[] = [];
  let campaignStats: CampaignStat[] = [];
  let sqlReady = true;

  try {
    const { data, error } = await supabase.from("donations_global_kpis").select("*").maybeSingle();
    if (error) sqlReady = false;
    else if (data) kpis = data as GlobalKpis;
  } catch { sqlReady = false; }

  if (sqlReady) {
    try {
      const { data } = await supabase.from("donations_monthly_12m").select("*");
      monthly = (data ?? []) as MonthlyPoint[];
    } catch { /* noop */ }
    try {
      const { data } = await supabase.from("donations_by_kind").select("*");
      byKind = (data ?? []) as KindStat[];
    } catch { /* noop */ }
    try {
      const { data } = await supabase.from("donations_top_donors").select("*").limit(15);
      topDonors = (data ?? []) as TopDonor[];
    } catch { /* noop */ }
    try {
      const { data } = await supabase.from("donations_campaign_stats").select("*");
      campaignStats = (data ?? []) as CampaignStat[];
    } catch { /* noop */ }
  }

  return (
    <DonsAnalyticsClient
      kpis={kpis}
      monthly={monthly}
      byKind={byKind}
      topDonors={topDonors}
      campaignStats={campaignStats}
      sqlReady={sqlReady}
    />
  );
}
