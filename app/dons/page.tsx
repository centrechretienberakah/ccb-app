import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site-content";
import DonsClient from "./DonsClient";

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

  return <DonsClient heroTitle={heroTitle} heroIntro={heroIntro} />;
}
