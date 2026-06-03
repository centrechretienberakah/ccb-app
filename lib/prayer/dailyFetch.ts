import type { SupabaseClient } from "@supabase/supabase-js";
import { getParisDateString } from "@/app/devotion/devotions-data";
import { getDailyPrayer, buildPrayerContent } from "@/app/community/prions-ensemble/daily-prayers-data";

export interface UnifiedDailyPrayer {
  id: string | null;
  date: string;
  dayLabel: string;
  theme: string;
  verse_ref: string;
  verse_text: string;
  intro: string;
  exhortation: string[];
  prayerPoints: string[];
  guidedPrayer: string;
  declarations: string[];
  author: string;
  content: string;     // script aplati (DB + partage)
}

/**
 * Récupère la prière du jour (date Europe/Paris).
 *
 * Le CONTENU affiché provient de la rotation statique structurée (que nous
 * maîtrisons, riche et premium), pour respecter intégralement la structure
 * officielle CCB. La base `daily_prayers` ne sert qu'à fournir un ID stable
 * (pour le compteur d'intercessions "J'ai prié") : on cherche la ligne du
 * jour et on récupère son id si elle existe.
 *
 * Modèle aligné sur la méditation du jour (bascule à 00:00 Paris).
 */
export async function getTodayPrayer(
  supabase: SupabaseClient,
): Promise<UnifiedDailyPrayer> {
  const today = getParisDateString();
  const p = getDailyPrayer();

  // Cherche l'id en base (best-effort) pour le suivi des intercessions
  let dbId: string | null = null;
  try {
    const { data } = await supabase
      .from("daily_prayers").select("id").eq("prayer_date", today).maybeSingle();
    dbId = (data as { id: string } | null)?.id ?? null;
    if (!dbId) {
      const { data: d2 } = await supabase
        .from("daily_prayers").select("id").eq("date", today).maybeSingle();
      dbId = (d2 as { id: string } | null)?.id ?? null;
    }
  } catch { /* table v51 pas migrée → id null, géré côté client */ }

  return {
    id: dbId,
    date: today,
    dayLabel: p.dayLabel,
    theme: p.theme,
    verse_ref: p.verse_ref,
    verse_text: p.verse_text,
    intro: p.intro,
    exhortation: p.exhortation,
    prayerPoints: p.prayerPoints,
    guidedPrayer: p.guidedPrayer,
    declarations: p.declarations,
    author: p.author,
    content: buildPrayerContent(p),
  };
}
