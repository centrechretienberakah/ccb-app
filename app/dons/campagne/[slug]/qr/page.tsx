import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import QrClient from "./QrClient";
import type { DonationCampaign } from "@/lib/dons/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "QR Code — Campagne CCB" };

export default async function CampagneQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // QR accessible aux mod+ uniquement (pour éviter la fuite de campagnes brouillons)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/dons/campagne/${slug}/qr`);
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect(`/dons`);
  }

  const { data } = await supabase
    .from("donations_campaigns")
    .select("id, slug, title, subtitle, description, cover_url, kind, target_amount_xaf, current_amount_xaf, donors_count, starts_at, ends_at, is_active, is_featured, order_index")
    .eq("slug", slug).maybeSingle();
  if (!data) return notFound();
  const campaign = data as DonationCampaign;

  // Construit l'URL publique de la campagne
  const h = await headers();
  const host = h.get("host") ?? "centrechretienberakah.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const targetUrl = `${proto}://${host}/dons?campaign=${campaign.slug}`;

  return <QrClient campaign={campaign} targetUrl={targetUrl} />;
}
