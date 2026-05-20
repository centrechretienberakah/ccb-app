import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDonsClient from "./AdminDonsClient";
import type { DonationCampaign, DonationRecord } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Dons & Campagnes" };

export default async function DonsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dons/admin");

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect("/dons");
  }

  let campaigns: DonationCampaign[] = [];
  let records: DonationRecord[] = [];
  let pendingCount = 0;
  try {
    const { data } = await supabase
      .from("donations_campaigns")
      .select("id, slug, title, subtitle, description, cover_url, kind, target_amount_xaf, current_amount_xaf, donors_count, starts_at, ends_at, is_active, is_featured, order_index")
      .order("is_featured", { ascending: false })
      .order("order_index", { ascending: true });
    campaigns = (data ?? []) as DonationCampaign[];
  } catch { /* table pas migrée */ }

  try {
    const { data } = await supabase
      .from("donations_records")
      .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    records = (data ?? []) as DonationRecord[];
    pendingCount = records.filter((r) => r.status === "pending").length;
  } catch { /* noop */ }

  return <AdminDonsClient initialCampaigns={campaigns} initialRecords={records} pendingCount={pendingCount} />;
}
