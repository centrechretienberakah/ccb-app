import CommunityTabs from "../CommunityTabs";
import PrayerPage from "@/app/prayer/page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prions ensemble — Communauté CCB" };

/**
 * Onglet "Prions Ensemble" du module Communauté.
 *
 * Réutilise INTÉGRALEMENT le module de prière existant (app/prayer/page.tsx)
 * par composition de Server Component : aucune logique métier, base de
 * données, permission, notification ou interaction n'est modifiée. On se
 * contente d'afficher la barre d'onglets Communauté au-dessus.
 */
export default async function CommunityPrayerPage() {
  return (
    <>
      <CommunityTabs />
      <PrayerPage />
    </>
  );
}
