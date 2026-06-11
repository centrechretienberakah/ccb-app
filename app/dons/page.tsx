import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site-content";
import { createClient } from "@/lib/supabase/server";
import DonsClient from "./DonsClient";
import { parsePaymentModes, DEFAULT_DONS_PAIEMENT_MD, type DonationCampaign } from "@/lib/dons/theme";

export const metadata: Metadata = {
  title: "Faire un Don — Centre Chrétien Berakah",
  description: "Soutiens le ministère du CCB : dîme, offrande, projets, missions. Mobile Money, virement SEPA, PayPal.",
};

export const dynamic = "force-dynamic";

export default async function DonsPage() {
  const cms = await getSiteContent("dons");
  const heroTitle = cms?.title || "Soutiens le ministère";
  const heroIntro = cms?.body_md
    || "Ta générosité permet au Centre Chrétien Berakah de proclamer l'Évangile, former des disciples et transformer des vies pour la gloire de Dieu.";

  const supabase = await createClient();

  // Détecte rôle admin (pour afficher CTA admin)
  let isAdmin = false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) isAdmin = true;
    }
  } catch { /* noop */ }

  // Campagnes actives (fallback graceful si SQL v33 pas exécuté)
  let campaigns: DonationCampaign[] = [];
  try {
    const { data } = await supabase
      .from("donations_campaigns")
      .select("id, slug, title, subtitle, description, cover_url, kind, target_amount_xaf, current_amount_xaf, donors_count, starts_at, ends_at, is_active, is_featured, order_index")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("order_index", { ascending: true });
    campaigns = (data ?? []) as DonationCampaign[];
  } catch { /* table pas migrée */ }

  const cmsPay = await getSiteContent("dons-paiement");
  const paymentModes = parsePaymentModes(cmsPay?.body_md || DEFAULT_DONS_PAIEMENT_MD);

  return (
    <DonsClient
      heroTitle={heroTitle}
      heroIntro={heroIntro}
      campaigns={campaigns}
      isAdmin={isAdmin}
      paymentModes={paymentModes}
    />
  );
}
