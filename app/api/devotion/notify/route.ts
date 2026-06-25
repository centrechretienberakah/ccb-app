import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";
import { resolveDailyDevotionInput } from "@/lib/devotion/resolveDaily";
import { ensureDevotionInDb, findDevotionId } from "@/lib/devotion/ensure";
import { configureWebPush, sendPushToUserIds } from "@/lib/push/sendToUsers";

export const runtime = "nodejs";

/**
 * GET /api/devotion/notify
 *
 * Envoie la notif push « Méditons ensemble » à chaque membre À SON MINUIT
 * LOCAL. À déclencher CHAQUE HEURE (Vercel Pro `0 * * * *`, ou un pinger
 * externe gratuit type cron-job.org) — protégé par CRON_SECRET si défini.
 *
 * À chaque exécution :
 *   1) repère les membres (avec push activé + fuseau connu) dont l'heure
 *      locale vaut actuellement 00 (minuit) ;
 *   2) ignore ceux déjà notifiés pour leur date locale (journal v79) ;
 *   3) s'assure que la méditation de cette date est publiée (calendrier+IA,
 *      sinon rotation statique) ;
 *   4) leur envoie la notif et journalise (anti-doublon).
 *
 * Idempotent : peut être rappelé sans double-envoi.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Heure (0-23) et date locale (YYYY-MM-DD) d'un fuseau à l'instant `now`. */
function localParts(now: Date, tz: string): { hour: number; date: string } | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
    });
    const map: Record<string, string> = {};
    for (const p of dtf.formatToParts(now)) map[p.type] = p.value;
    const hour = Number(map.hour) % 24; // "24" possible à minuit selon l'impl
    if (Number.isNaN(hour)) return null;
    return { hour, date: `${map.year}-${map.month}-${map.day}` };
  } catch {
    return null;
  }
}

/** Index jour de semaine (0=dimanche..6=samedi) d'une date — pour le repli statique. */
function weekdayIndex(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

function frenchDate(date: string): string {
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return date; }
}

interface DevotionTitleRow {
  title?: string | null;
  verse_reference?: string | null;
  verse_ref?: string | null;
}

async function fetchTitleVerse(
  admin: SupabaseClient,
  date: string,
): Promise<{ title: string; verseRef: string }> {
  for (const col of ["devotion_date", "date"]) {
    try {
      const { data } = await admin
        .from("devotions").select("title, verse_reference, verse_ref").eq(col, date).maybeSingle();
      const r = data as DevotionTitleRow | null;
      if (r) return { title: (r.title || "").trim(), verseRef: (r.verse_reference || r.verse_ref || "").trim() };
    } catch { /* colonne suivante */ }
  }
  return { title: "", verseRef: "" };
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
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 503 });
  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID keys non configurées (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)" }, { status: 503 });
  }

  const now = new Date();

  // 1) Membres avec push activé
  const { data: subRows } = await admin
    .from("push_subscriptions").select("user_id").eq("enabled", true);
  const userIds = [...new Set(((subRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))];
  if (userIds.length === 0) return NextResponse.json({ ok: true, checked: 0, midnight: 0, notified: 0 });

  // 2) Leur fuseau
  const { data: profRows } = await admin
    .from("user_profiles").select("user_id, timezone").in("user_id", userIds);
  const profiles = ((profRows ?? []) as Array<{ user_id: string; timezone: string | null }>);

  // 3) Ceux dont il est actuellement ~minuit local
  const atMidnight: Array<{ userId: string; date: string }> = [];
  for (const p of profiles) {
    if (!p.timezone) continue;
    const lp = localParts(now, p.timezone);
    if (lp && lp.hour === 0) atMidnight.push({ userId: p.user_id, date: lp.date });
  }
  if (atMidnight.length === 0) {
    return NextResponse.json({ ok: true, checked: userIds.length, midnight: 0, notified: 0 });
  }

  // 4) Dédoublonnage via le journal v79
  const dates = [...new Set(atMidnight.map((a) => a.date))];
  const { data: logRows } = await admin
    .from("devotion_push_log").select("user_id, local_date")
    .in("user_id", atMidnight.map((a) => a.userId))
    .in("local_date", dates);
  const alreadySent = new Set(((logRows ?? []) as Array<{ user_id: string; local_date: string }>).map((r) => `${r.user_id}|${r.local_date}`));
  const pending = atMidnight.filter((a) => !alreadySent.has(`${a.userId}|${a.date}`));
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, checked: userIds.length, midnight: atMidnight.length, notified: 0, reason: "déjà notifiés" });
  }

  // 5) Par date locale : garantir la méditation publiée + envoyer + journaliser
  const byDate = new Map<string, string[]>();
  for (const a of pending) {
    const arr = byDate.get(a.date) ?? [];
    arr.push(a.userId);
    byDate.set(a.date, arr);
  }

  let totalSent = 0, totalFailed = 0;
  const perDate: Array<{ date: string; targets: number; sent: number; failed: number }> = [];

  for (const [date, ids] of byDate) {
    // S'assure que la méditation de cette date existe (génère si besoin).
    try {
      const existing = await findDevotionId(admin, date);
      if (!existing) {
        const { input } = await resolveDailyDevotionInput(admin, date, weekdayIndex(date));
        await ensureDevotionInDb(admin, input);
      }
    } catch { /* on notifie quand même avec ce qu'on peut */ }

    const tv = await fetchTitleVerse(admin, date);
    const body = tv.title
      ? `${tv.title}${tv.verseRef ? ` · ${tv.verseRef}` : ""}`
      : "Ta méditation du jour est disponible 🙏";

    const res = await sendPushToUserIds(admin, ids, {
      title: `☀️ Méditons ensemble — ${frenchDate(date)}`,
      body,
      url: "/dashboard",
      type: "devotion",
      tag: "devotion-daily",
    });
    totalSent += res.sent;
    totalFailed += res.failed;
    perDate.push({ date, targets: ids.length, sent: res.sent, failed: res.failed });

    // Journalise (anti-doublon) — même si certains envois ont échoué, on évite
    // le matraquage à chaque heure ; un échec transitoire reste rare.
    const logInsert = ids.map((uid) => ({ user_id: uid, local_date: date }));
    await admin.from("devotion_push_log").upsert(logInsert, { onConflict: "user_id,local_date", ignoreDuplicates: true });
  }

  return NextResponse.json({
    ok: true,
    checked: userIds.length,
    midnight: atMidnight.length,
    notified: pending.length,
    sent: totalSent,
    failed: totalFailed,
    dates: perDate,
  });
}
