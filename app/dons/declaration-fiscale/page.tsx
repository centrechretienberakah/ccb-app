import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DeclarationClient from "./DeclarationClient";
import type { DonationRecord } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Déclaration fiscale — Mes dons" };

export default async function DeclarationPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dons/declaration-fiscale");

  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const askedYear = sp?.year ? parseInt(sp.year, 10) : currentYear - 1;
  const year = !isNaN(askedYear) && askedYear > 2020 && askedYear <= currentYear + 1 ? askedYear : currentYear - 1;

  // Tous les records confirmed de l'année pour ce user
  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd = new Date(year + 1, 0, 1).toISOString();

  let records: DonationRecord[] = [];
  try {
    const { data } = await supabase
      .from("donations_records")
      .select("id, user_id, campaign_id, kind, amount_native, currency, amount_xaf, payment_mode, reference, status, donor_name, donor_email, is_anonymous, notes, paid_at, confirmed_at, cancelled_at, created_at, receipt_number")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .gte("paid_at", yearStart)
      .lt("paid_at", yearEnd)
      .order("paid_at", { ascending: true });
    records = (data ?? []) as DonationRecord[];
  } catch { /* noop */ }

  // Profile pour le nom
  let donorName = "—";
  try {
    const { data } = await supabase
      .from("user_profiles").select("display_name, full_name").eq("user_id", user.id).maybeSingle();
    const p = data as { display_name: string | null; full_name: string | null } | null;
    donorName = p?.display_name || p?.full_name || user.email || "—";
  } catch { /* noop */ }

  // Années disponibles dans l'historique du user
  let availableYears: number[] = [];
  try {
    const { data } = await supabase
      .from("donations_yearly_per_user")
      .select("year").eq("user_id", user.id);
    availableYears = ((data ?? []) as Array<{ year: number }>).map((r) => r.year).sort((a, b) => b - a);
  } catch { /* fallback ci-dessous */ }
  if (availableYears.length === 0) {
    availableYears = [currentYear, currentYear - 1, currentYear - 2];
  }

  // Campagnes (pour résoudre les titres)
  const campaignIds = Array.from(new Set(records.map((r) => r.campaign_id).filter(Boolean) as string[]));
  let campaigns: { id: string; title: string }[] = [];
  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from("donations_campaigns").select("id, title").in("id", campaignIds);
    campaigns = (data ?? []) as { id: string; title: string }[];
  }

  return (
    <DeclarationClient
      year={year}
      availableYears={availableYears}
      records={records}
      donorName={donorName}
      donorEmail={user.email ?? ""}
      campaigns={campaigns}
    />
  );
}
