import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDonsClient from "./AdminDonsClient";
import type { DonationCampaign } from "@/lib/dons/theme";

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
  try {
    const { data } = await supabase
      .from("donations_campaigns")
      .select("id, slug, title, subtitle, description, cover_url, kind, target_amount_xaf, current_amount_xaf, donors_count, starts_at, ends_at, is_active, is_featured, order_index")
      .order("is_featured", { ascending: false })
      .order("order_index", { ascending: true });
    campaigns = (data ?? []) as DonationCampaign[];
  } catch { /* table pas migrée */ }

  return <AdminDonsClient initialCampaigns={campaigns} />;
}
