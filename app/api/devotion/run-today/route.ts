import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { isModerator } from "@/lib/rbac";
import { getParisDateString, getParisDayIndex } from "@/app/devotion/devotions-data";
import { ensureDevotionInDb } from "@/lib/devotion/ensure";
import { resolveDailyDevotionInput } from "@/lib/devotion/resolveDaily";
import { notifyDevotionForParisDate } from "@/lib/devotion/notifyAll";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/devotion/run-today  (réservé modérateur / admin)
 *
 * Déclenche MANUELLEMENT le travail quotidien de la méditation, comme le cron
 * de minuit : publie la méditation du jour (calendrier + IA, sinon statique)
 * ET envoie la notification push à tous. Sert de filet quand le cron Vercel
 * (best-effort sur Hobby) n'a pas tourné à l'heure. Idempotent (anti-doublon
 * notif via devotion_push_log). Auth par session (pas de CRON_SECRET requis).
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!isModerator(roleRow?.role || "member")) {
    return NextResponse.json({ error: "Accès réservé à l'administration" }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 503 });

  const date = getParisDateString();
  const dayIndex = getParisDayIndex();

  // 1) Publie la méditation du jour (ne réécrit pas si déjà publiée).
  const { input, source } = await resolveDailyDevotionInput(admin, date, dayIndex);
  const devotion = await ensureDevotionInDb(admin, input);

  // 2) Envoie la notif « méditation du jour » à tous (anti-doublon 1×/jour).
  let push: { sent: number; failed: number; skipped: number } = { sent: 0, failed: 0, skipped: 0 };
  try {
    const r = await notifyDevotionForParisDate(admin);
    push = { sent: r.sent ?? 0, failed: r.failed ?? 0, skipped: r.skipped ?? 0 };
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok: true,
    date,
    devotion: devotion.id
      ? { id: devotion.id, created: devotion.created, source, title: input.title }
      : { error: devotion.error, source },
    push,
  });
}
