import type { SupabaseClient } from "@supabase/supabase-js";

export interface DevotionEnsureInput {
  date: string;            // YYYY-MM-DD (Europe/Paris)
  title: string;
  verse_ref?: string;
  verse_text: string;
  content?: string;
  application?: string;
  prayer?: string;
  declaration?: string;
  author?: string;
}

export interface DevotionEnsureResult {
  id?: string;
  created?: boolean;
  error?: string;
  attempts?: string[];
}

/**
 * Garantit qu'une méditation existe dans la table `devotions` et renvoie
 * son UUID. Insert ADAPTATIF : retire dynamiquement toute colonne signalée
 * inexistante / générée par PostgREST, gère NOT NULL et race duplicate key.
 *
 * `admin` doit être un client service_role (bypass RLS pour l'écriture).
 */
export async function ensureDevotionInDb(
  admin: SupabaseClient,
  input: DevotionEnsureInput,
): Promise<DevotionEnsureResult> {
  const date = input.date;

  // 1) Existe déjà ? (par devotion_date puis date)
  try {
    const { data: existing } = await admin
      .from("devotions").select("id").eq("devotion_date", date).maybeSingle();
    if (existing?.id) return { id: existing.id as string, created: false };
  } catch { /* colonne devotion_date peut ne pas exister */ }
  try {
    const { data: existing2 } = await admin
      .from("devotions").select("id").eq("date", date).maybeSingle();
    if (existing2?.id) return { id: existing2.id as string, created: false };
  } catch { /* noop */ }

  // 2) Insert adaptatif
  // NB : pas de `date` dans le payload (souvent GENERATED ALWAYS).
  const payload: Record<string, unknown> = {
    devotion_date: date,
    title: input.title,
    verse_reference: input.verse_ref || "",
    verse_ref: input.verse_ref || "",
    verse_text: input.verse_text,
    meditation_p1: input.content || "",
    reflection_question: input.application || null,
    application: input.application || null,
    prayer: input.prayer || "",
    declaration: input.declaration || "",
    content: input.content || "",
    author: input.author || "Rév. Elvis NGUIFFO",
  };

  const attempts: string[] = [];
  let lastErr = "";

  for (let i = 0; i < 14; i++) {
    const ins = await admin.from("devotions").insert(payload).select("id").single();
    if (!ins.error && ins.data?.id) {
      return { id: ins.data.id as string, created: true };
    }
    lastErr = ins.error?.message ?? "unknown";
    attempts.push(lastErr);

    // a) Colonne inexistante
    const colMatch = lastErr.match(/Could not find the '([^']+)' column/i)
      ?? lastErr.match(/column "([^"]+)" of relation/i)
      ?? lastErr.match(/'([a-z_]+)' column/i);
    if (colMatch && colMatch[1] && colMatch[1] in payload) {
      delete payload[colMatch[1]];
      continue;
    }
    // a-bis) Colonne générée (ex: date)
    const genMatch = lastErr.match(/column "([^"]+)" can only be updated to DEFAULT/i)
      ?? lastErr.match(/non-DEFAULT value into column "([^"]+)"/i)
      ?? lastErr.match(/generated column "([^"]+)"/i);
    if (genMatch && genMatch[1] && genMatch[1] in payload) {
      delete payload[genMatch[1]];
      continue;
    }
    // b) NOT NULL manquant
    const nullMatch = lastErr.match(/null value in column "([^"]+)"/i);
    if (nullMatch && nullMatch[1] && !(nullMatch[1] in payload)) {
      payload[nullMatch[1]] = input.content || input.title || "—";
      continue;
    }
    // c) Race duplicate key
    if (/duplicate key|unique/i.test(lastErr)) {
      const { data: raced } = await admin
        .from("devotions").select("id").eq("devotion_date", date).maybeSingle();
      if (raced?.id) return { id: raced.id as string, created: false };
      const { data: raced2 } = await admin
        .from("devotions").select("id").eq("date", date).maybeSingle();
      if (raced2?.id) return { id: raced2.id as string, created: false };
    }
    // d) erreur non gérée
    break;
  }

  return { error: lastErr, attempts };
}
