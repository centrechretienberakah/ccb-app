import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Contexte éditorial d'un jour : la hiérarchie complète mois → semaine → jour
 * du calendrier « Méditons ensemble ». Sert de SOURCE aux thèmes/versets
 * (remplace la rotation semi-aléatoire) — la prière/les paragraphes restent
 * rédigés par l'IA au format actuel.
 */
export interface CalendarContext {
  monthLabel: string;
  monthTheme: string;
  mainVerse: string;
  weekNo: number;
  weekTheme: string;
  dayNo: number;
  dayTheme: string;   // thème journalier (base principale)
  dayVerse: string;   // référence du verset journalier (base principale)
}

interface DayRow {
  month_id: string;
  day_no: number;
  week_no: number;
  day_theme: string | null;
  day_verse: string | null;
}
interface MonthRow { label: string | null; theme: string | null; main_verse: string | null }
interface WeekRow { theme: string | null }

/**
 * Récupère le contexte éditorial pour une date (YYYY-MM-DD).
 *
 * Lecture seule, TOLÉRANTE : renvoie `null` si la table n'existe pas encore
 * (migration v77 non exécutée), si aucun jour n'est programmé pour cette
 * date, ou si le thème/verset du jour est vide → l'appelant retombe alors
 * sur la rotation statique existante. Ne jette jamais.
 *
 * Fonctionne avec un client service_role (cron, bypass RLS) comme avec un
 * client utilisateur modérateur (prévisualisation admin).
 */
export async function getCalendarForDate(
  sb: SupabaseClient,
  date: string,
): Promise<CalendarContext | null> {
  try {
    const { data: day } = await sb
      .from("devotion_cal_days")
      .select("month_id, day_no, week_no, day_theme, day_verse")
      .eq("cal_date", date)
      .maybeSingle();

    const d = day as DayRow | null;
    if (!d) return null;

    const dayTheme = (d.day_theme || "").trim();
    const dayVerse = (d.day_verse || "").trim();
    // RÈGLE : si le jour n'a pas de thème ET de verset, on ne force rien.
    if (!dayTheme || !dayVerse) return null;

    const { data: month } = await sb
      .from("devotion_cal_months")
      .select("label, theme, main_verse")
      .eq("id", d.month_id)
      .maybeSingle();
    const m = (month as MonthRow | null) ?? { label: "", theme: "", main_verse: "" };

    let weekTheme = "";
    try {
      const { data: week } = await sb
        .from("devotion_cal_weeks")
        .select("theme")
        .eq("month_id", d.month_id)
        .eq("week_no", d.week_no)
        .maybeSingle();
      weekTheme = ((week as WeekRow | null)?.theme || "").trim();
    } catch { /* semaine optionnelle */ }

    return {
      monthLabel: (m.label || "").trim(),
      monthTheme: (m.theme || "").trim(),
      mainVerse: (m.main_verse || "").trim(),
      weekNo: d.week_no,
      weekTheme,
      dayNo: d.day_no,
      dayTheme,
      dayVerse,
    };
  } catch {
    // Table absente / erreur réseau → repli statique côté appelant.
    return null;
  }
}
