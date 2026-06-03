import { createClient } from "@/lib/supabase/server";
import CommunityTabs from "../CommunityTabs";
import PrayerPage from "@/app/prayer/page";
import DailyPrayerCard from "./DailyPrayerCard";
import { getTodayPrayer } from "@/lib/prayer/dailyFetch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prions ensemble — Communauté CCB" };

/**
 * Onglet "Prions Ensemble" du module Communauté.
 *
 * - Affiche la PRIÈRE DU JOUR auto-publiée (carte premium), sur le même
 *   modèle que la méditation du jour (table daily_prayers + cron 00:00 Paris).
 * - Réutilise INTÉGRALEMENT le mur de prière existant (app/prayer/page.tsx)
 *   par composition de Server Component : aucune logique, base, permission,
 *   notification ou interaction du module n'est modifiée.
 */
export default async function CommunityPrayerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Prière du jour (date Europe/Paris) — DB ou fallback statique
  const todayPrayer = await getTodayPrayer(supabase);

  // Compteur "ont prié" + état de l'utilisateur
  let prayed = false;
  let count = 0;
  if (todayPrayer.id) {
    try {
      const { count: c } = await supabase
        .from("daily_prayer_intercessions")
        .select("id", { count: "exact", head: true })
        .eq("daily_prayer_id", todayPrayer.id);
      count = c ?? 0;
      if (user) {
        const { data: mine } = await supabase
          .from("daily_prayer_intercessions")
          .select("id")
          .eq("daily_prayer_id", todayPrayer.id)
          .eq("user_id", user.id)
          .maybeSingle();
        prayed = !!mine;
      }
    } catch { /* table v51 pas migrée → 0 */ }
  }

  return (
    <>
      <CommunityTabs />
      <DailyPrayerCard
        prayer={todayPrayer}
        userId={user?.id ?? null}
        initialPrayed={prayed}
        initialCount={count}
      />
      <PrayerPage />
    </>
  );
}
