import type { SupabaseClient } from "@supabase/supabase-js";

export interface DailyPrayerInput {
  date: string;        // YYYY-MM-DD (Europe/Paris)
  title: string;
  verse_ref?: string;
  verse_text?: string;
  content: string;
  author?: string;
}

export interface DailyPrayerEnsureResult {
  id?: string;
  created?: boolean;
  error?: string;
  attempts?: string[];
}

/**
 * Garantit qu'une prière du jour existe dans `daily_prayers` et renvoie
 * son UUID. Insert adaptatif (retire les colonnes inexistantes / générées),
 * gère NOT NULL et race duplicate key. `admin` = client service_role.
 *
 * Même logique que ensureDevotionInDb — modèle identique aux méditations.
 */
export async function ensureDailyPrayerInDb(
  admin: SupabaseClient,
  input: DailyPrayerInput,
): Promise<DailyPrayerEnsureResult> {
  const date = input.date;

  // Existe déjà ?
  try {
    const { data } = await admin
      .from("daily_prayers").select("id").eq("prayer_date", date).maybeSingle();
    if (data?.id) return { id: data.id as string, created: false };
  } catch { /* colonne prayer_date absente → tente date */ }
  try {
    const { data } = await admin
      .from("daily_prayers").select("id").eq("date", date).maybeSingle();
    if (data?.id) return { id: data.id as string, created: false };
  } catch { /* noop */ }

  // Insert adaptatif (pas de `date` : souvent GENERATED ALWAYS)
  const payload: Record<string, unknown> = {
    prayer_date: date,
    title: input.title,
    verse_reference: input.verse_ref || "",
    verse_text: input.verse_text || "",
    content: input.content,
    author: input.author || "Rév. Elvis NGUIFFO",
  };

  const attempts: string[] = [];
  let lastErr = "";

  for (let i = 0; i < 12; i++) {
    const ins = await admin.from("daily_prayers").insert(payload).select("id").single();
    if (!ins.error && ins.data?.id) return { id: ins.data.id as string, created: true };
    lastErr = ins.error?.message ?? "unknown";
    attempts.push(lastErr);

    const colMatch = lastErr.match(/Could not find the '([^']+)' column/i)
      ?? lastErr.match(/column "([^"]+)" of relation/i);
    if (colMatch && colMatch[1] && colMatch[1] in payload) { delete payload[colMatch[1]]; continue; }

    const genMatch = lastErr.match(/column "([^"]+)" can only be updated to DEFAULT/i)
      ?? lastErr.match(/non-DEFAULT value into column "([^"]+)"/i)
      ?? lastErr.match(/generated column "([^"]+)"/i);
    if (genMatch && genMatch[1] && genMatch[1] in payload) { delete payload[genMatch[1]]; continue; }

    const nullMatch = lastErr.match(/null value in column "([^"]+)"/i);
    if (nullMatch && nullMatch[1] && !(nullMatch[1] in payload)) {
      payload[nullMatch[1]] = input.content || input.title || "—"; continue;
    }

    if (/duplicate key|unique/i.test(lastErr)) {
      const { data: raced } = await admin
        .from("daily_prayers").select("id").eq("prayer_date", date).maybeSingle();
      if (raced?.id) return { id: raced.id as string, created: false };
    }
    break;
  }

  return { error: lastErr, attempts };
}
