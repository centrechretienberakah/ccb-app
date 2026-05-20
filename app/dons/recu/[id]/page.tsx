import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import RecuClient from "./RecuClient";
import type { DonationRecord } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reçu de don — CCB" };

export default async function RecuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/dons/recu/${id}`);

  const { data: rec } = await supabase
    .from("donations_records")
    .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at, receipt_number")
    .eq("id", id).maybeSingle();
  if (!rec) return notFound();
  const record = rec as DonationRecord;

  // Sécurité : seul le donateur lui-même ou un admin peut voir le reçu
  let canAccess = record.user_id === user.id;
  if (!canAccess) {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = (roleRow as { role: string } | null)?.role;
    if (role && ["owner", "admin", "leader", "moderator"].includes(role)) canAccess = true;
  }
  if (!canAccess) redirect("/dons/mes-dons");

  // Le reçu n'a de sens qu'en status confirmé
  if (record.status !== "confirmed") redirect("/dons/mes-dons");

  // Récupère le nom du donateur si possible
  let donorName = record.donor_name ?? "";
  if (!donorName && record.user_id) {
    const { data: prof } = await supabase
      .from("user_profiles")
      .select("display_name, full_name")
      .eq("user_id", record.user_id)
      .maybeSingle();
    const p = prof as { display_name: string | null; full_name: string | null } | null;
    donorName = p?.display_name || p?.full_name || "—";
  }
  if (!donorName) donorName = "Donateur";

  // Récupère le titre de la campagne si liée
  let campaignTitle: string | null = null;
  if (record.campaign_id) {
    const { data } = await supabase
      .from("donations_campaigns").select("title").eq("id", record.campaign_id).maybeSingle();
    campaignTitle = (data as { title: string } | null)?.title ?? null;
  }

  return <RecuClient record={record} donorName={donorName} campaignTitle={campaignTitle} />;
}
