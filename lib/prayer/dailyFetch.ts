import type { SupabaseClient } from "@supabase/supabase-js";
import { getParisDateString } from "@/app/devotion/devotions-data";
import { getDailyPrayer } from "@/app/community/prions-ensemble/daily-prayers-data";

export interface UnifiedDailyPrayer {
  id: string | null;
  date: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  author: string;
}

interface PrayerRow {
  id: string;
  prayer_date?: string;
  date?: string;
  title: string;
  verse_reference?: string | null;
  verse_text?: string | null;
  content?: string | null;
  author?: string | null;
}

function normalize(d: PrayerRow | null): UnifiedDailyPrayer | null {
  if (!d) return null;
  return {
    id: d.id,
    date: d.prayer_date || d.date || getParisDateString(),
    title: d.title,
    verse_ref: d.verse_reference || "",
    verse_text: d.verse_text || "",
    content: d.content || "",
    author: d.author || "Rév. Elvis NGUIFFO",
  };
}

/**
 * Récupère la prière du jour (date Europe/Paris) depuis `daily_prayers`,
 * avec fallback sur la rotation statique si absente. Lecture seule.
 * Le `id` peut être null si pas encore en base — l'enregistrement à la
 * demande est géré côté client via /api/daily-prayer/ensure.
 *
 * Modèle identique à getTodayDevotion (méditations).
 */
export async function getTodayPrayer(
  supabase: SupabaseClient,
): Promise<UnifiedDailyPrayer> {
  const today = getParisDateString();

  let prayer: UnifiedDailyPrayer | null = null;
  try {
    const { data: byDate } = await supabase
      .from("daily_prayers").select("*").eq("prayer_date", today).maybeSingle();
    if (byDate) prayer = normalize(byDate as PrayerRow);
    if (!prayer) {
      const { data: byDate2 } = await supabase
        .from("daily_prayers").select("*").eq("date", today).maybeSingle();
      if (byDate2) prayer = normalize(byDate2 as PrayerRow);
    }
  } catch { /* table absente → fallback statique */ }

  if (!prayer) {
    const f = getDailyPrayer();
    prayer = {
      id: f.id,
      date: today,
      title: f.title,
      verse_ref: f.verse_ref,
      verse_text: f.verse_text,
      content: f.content,
      author: f.author,
    };
  }

  return prayer;
}
