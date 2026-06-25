import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getParisDateString, getParisDayIndex } from "@/app/devotion/devotions-data";
import { STATIC_PRAYERS, buildPrayerContent } from "@/app/community/prions-ensemble/daily-prayers-data";
import { ensureDevotionInDb } from "@/lib/devotion/ensure";
import { resolveDailyDevotionInput } from "@/lib/devotion/resolveDaily";
import { ensureDailyPrayerInDb } from "@/lib/prayer/dailyEnsure";
import { reindexAiKnowledge } from "@/lib/ai/reindex";

export const runtime = "nodejs";

/**
 * GET /api/cron/daily
 *
 * Cron quotidien combiné (déclenché par Vercel à 00:00 Paris, cf vercel.json).
 * Pré-enregistre EN UNE SEULE EXÉCUTION :
 *   - la méditation du jour (table devotions)
 *   - la prière du jour (table daily_prayers)
 * pour que likes / intercessions fonctionnent dès minuit.
 *
 * Combiné en un seul endpoint pour rester dans les limites de cron
 * (2 jobs max sur Vercel Hobby). Idempotent.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 503 });
  }

  const date = getParisDateString();
  const dayIndex = getParisDayIndex();

  // 1) Méditation du jour — SOURCE : calendrier éditorial (thème+verset) +
  //    rédaction IA si défini, sinon rotation statique (repli inchangé).
  const { input: devInput, source: devSource } = await resolveDailyDevotionInput(admin, date, dayIndex);
  const devotion = await ensureDevotionInDb(admin, devInput);

  // 2) Prière du jour
  const pr = STATIC_PRAYERS[dayIndex];
  const prayer = await ensureDailyPrayerInDb(admin, {
    date, title: pr.theme, verse_ref: pr.verse_ref, verse_text: pr.verse_text,
    content: buildPrayerContent(pr), author: pr.author,
  });

  // 3) Réindexation de la base documentaire BERAKAH AI (RAG) — best-effort.
  let rag: { total: number; errors: number } = { total: 0, errors: 0 };
  try {
    const r = await reindexAiKnowledge(admin);
    rag = { total: r.total, errors: r.errors.length };
  } catch { /* table ai_knowledge pas encore migrée → silencieux */ }

  return NextResponse.json({
    ok: true,
    date,
    devotion: devotion.id ? { id: devotion.id, created: devotion.created, source: devSource } : { error: devotion.error, source: devSource },
    prayer: prayer.id ? { id: prayer.id, created: prayer.created } : { error: prayer.error },
    rag,
  });
}
