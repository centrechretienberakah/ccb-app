import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getParisDateString, getParisDayIndex } from "@/app/devotion/devotions-data";
import { STATIC_PRAYERS, buildPrayerContent } from "@/app/community/prions-ensemble/daily-prayers-data";
import { ensureDailyPrayerInDb } from "@/lib/prayer/dailyEnsure";

export const runtime = "nodejs";

/**
 * GET /api/daily-prayer/cron
 *
 * Déclenché par le cron Vercel à 00:00 heure de Paris (cf vercel.json).
 * Pré-enregistre la prière du jour (date Europe/Paris) dans daily_prayers
 * pour qu'elle ait un UUID réel dès minuit → intercession "J'ai prié"
 * fonctionnelle instantanément.
 *
 * Idempotent. Miroir de /api/devotion/cron.
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
  const p = STATIC_PRAYERS[dayIndex];

  const result = await ensureDailyPrayerInDb(admin, {
    date,
    title: p.theme,
    verse_ref: p.verse_ref,
    verse_text: p.verse_text,
    content: buildPrayerContent(p),
    author: p.author,
  });

  if (result.id) {
    return NextResponse.json({ ok: true, date, id: result.id, created: result.created, title: p.theme });
  }

  console.error("[daily-prayer/cron] échec:", result.attempts);
  return NextResponse.json({ ok: false, date, error: result.error, attempts: result.attempts }, { status: 500 });
}
