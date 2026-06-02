import type { SupabaseClient } from "@supabase/supabase-js";
import { getDailyDevotion, getParisDateString } from "@/app/devotion/devotions-data";

export interface UnifiedDevotion {
  id: string | null;
  date: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  application: string;
  prayer: string;
  declaration: string;
}

interface DevotionRow {
  id: string;
  devotion_date?: string;
  date?: string;
  title: string;
  verse_reference?: string;
  verse_ref?: string;
  verse_text: string;
  meditation_p1?: string | null;
  meditation_p2?: string | null;
  meditation_p3?: string | null;
  reflection_question?: string | null;
  content?: string | null;
  application?: string | null;
  prayer?: string | null;
  declaration?: string | null;
}

function normalize(d: DevotionRow | null): UnifiedDevotion | null {
  if (!d) return null;
  const dateStr = d.devotion_date || d.date || getParisDateString();
  const meditationParts = [d.meditation_p1, d.meditation_p2, d.meditation_p3].filter(Boolean) as string[];
  const content = meditationParts.length > 0 ? meditationParts.join("\n\n") : (d.content || "");
  return {
    id: d.id,
    date: dateStr,
    title: d.title,
    verse_ref: d.verse_reference || d.verse_ref || "",
    verse_text: d.verse_text,
    content,
    application: d.application || d.reflection_question || "",
    prayer: d.prayer || "",
    declaration: d.declaration || "",
  };
}

/**
 * Récupère la méditation du jour (date Europe/Paris) depuis la table
 * `devotions`, avec fallback sur la rotation statique si absente.
 *
 * Lecture seule (pas d'insert). Le `id` peut être null si la méditation
 * n'est pas encore en base — l'enregistrement à la demande est géré côté
 * client via /api/devotion/ensure (au moment du like / marquer-comme-lu).
 *
 * Réutilise exactement la même logique que /devotion sans toucher cette page.
 */
export async function getTodayDevotion(
  supabase: SupabaseClient,
): Promise<UnifiedDevotion> {
  const today = getParisDateString();

  let todayDevotion: UnifiedDevotion | null = null;
  try {
    const { data: byDate } = await supabase
      .from("devotions").select("*").eq("date", today).maybeSingle();
    if (byDate) todayDevotion = normalize(byDate as DevotionRow);
    if (!todayDevotion) {
      const { data: byDevDate } = await supabase
        .from("devotions").select("*").eq("devotion_date", today).maybeSingle();
      if (byDevDate) todayDevotion = normalize(byDevDate as DevotionRow);
    }
  } catch { /* table absente → fallback statique */ }

  if (!todayDevotion) {
    const f = getDailyDevotion();
    todayDevotion = {
      id: f.id,
      date: today,
      title: f.title,
      verse_ref: f.verse_ref,
      verse_text: f.verse_text,
      content: f.content,
      application: f.application,
      prayer: f.prayer,
      declaration: f.declaration,
    };
  }

  return todayDevotion;
}
