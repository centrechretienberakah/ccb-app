import type { SupabaseClient } from "@supabase/supabase-js";
import { STATIC_DEVOTIONS } from "@/app/devotion/devotions-data";
import { getCalendarForDate } from "./calendar";
import { generateMeditation } from "./generate";
import { findDevotionId, type DevotionEnsureInput } from "./ensure";

function frenchDate(date: string): string {
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return date;
  }
}

export type DevotionSource = "calendar" | "static" | "existing";

/**
 * Détermine la méditation à publier pour une date donnée — NOUVELLE SOURCE :
 *
 *   1) Si elle est DÉJÀ publiée en base → on n'y touche pas (source="existing").
 *   2) Sinon, si le CALENDRIER ÉDITORIAL définit un thème + verset pour ce
 *      jour → l'IA rédige la méditation au format actuel (source="calendar").
 *   3) Sinon (pas de calendrier, pas de clé IA, ou échec) → rotation statique
 *      existante (source="static").
 *
 * Garantit qu'on ne casse jamais la publication quotidienne : tout échec
 * retombe sur le comportement actuel.
 */
export async function resolveDailyDevotionInput(
  admin: SupabaseClient,
  date: string,
  dayIndex: number,
): Promise<{ input: DevotionEnsureInput; source: DevotionSource }> {
  const s = STATIC_DEVOTIONS[dayIndex];
  const staticInput: DevotionEnsureInput = {
    date,
    title: s.title,
    verse_ref: s.verse_ref,
    verse_text: s.verse_text,
    content: s.content,
    application: s.application,
    prayer: s.prayer,
    declaration: s.declaration,
    author: s.author,
  };

  // 1) Déjà publié → ensureDevotionInDb renverra l'existant (pas de génération).
  const existing = await findDevotionId(admin, date);
  if (existing) return { input: staticInput, source: "existing" };

  // 2) Calendrier éditorial → rédaction IA.
  try {
    const cal = await getCalendarForDate(admin, date);
    if (cal) {
      const gen = await generateMeditation(cal, frenchDate(date));
      if (gen) {
        return {
          input: { date, author: "Rév. Elvis NGUIFFO", ...gen },
          source: "calendar",
        };
      }
    }
  } catch { /* repli statique ci-dessous */ }

  // 3) Repli statique (comportement actuel inchangé).
  return { input: staticInput, source: "static" };
}
