import type { SupabaseClient } from "@supabase/supabase-js";
import { getParisDateString, getParisDayIndex } from "@/app/devotion/devotions-data";
import { resolveDailyDevotionInput } from "./resolveDaily";
import { ensureDevotionInDb, findDevotionId } from "./ensure";
import { configureWebPush, sendPushToUserIds } from "@/lib/push/sendToUsers";
import { sendNativePush } from "@/lib/native/sendNative";

/**
 * Notif push « Méditons ensemble » envoyée à TOUS les membres (push activé)
 * à l'HEURE DE PARIS, au moment où la méditation du jour est publiée.
 *
 * Idempotent : journalise dans devotion_push_log (1 envoi / membre / date
 * Paris). Appelée par le cron quotidien (et par /api/devotion/notify pour un
 * déclenchement manuel/externe). Aucun déclencheur horaire requis.
 */

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

async function fetchTitleVerse(admin: SupabaseClient, date: string): Promise<{ title: string; verseRef: string }> {
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

export interface NotifyResult {
  ok: boolean;
  date: string;
  targets?: number;   // membres avec push activé
  sent?: number;
  failed?: number;
  skipped?: number;   // déjà notifiés (doublon évité)
  reason?: string;
}

export async function notifyDevotionForParisDate(admin: SupabaseClient): Promise<NotifyResult> {
  const date = getParisDateString();

  // 1) Garantit que la méditation du jour est publiée (normalement déjà fait).
  try {
    const existing = await findDevotionId(admin, date);
    if (!existing) {
      const { input } = await resolveDailyDevotionInput(admin, date, getParisDayIndex());
      await ensureDevotionInDb(admin, input);
    }
  } catch { /* on notifie quand même */ }

  // 2) AUDIENCE = UNION des abonnés web-push ET des appareils NATIFS (app
  //    Android, table native_push_tokens). Sans ça, les membres qui n'utilisent
  //    QUE l'app ne recevaient jamais la notif (cause du « 10/19 reçue »).
  const webConfigured = configureWebPush();
  const { data: subRows } = await admin
    .from("push_subscriptions").select("user_id").eq("enabled", true);
  const webIds = [...new Set(((subRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))];

  let nativeIds: string[] = [];
  try {
    const { data: natRows } = await admin.from("native_push_tokens").select("user_id");
    nativeIds = [...new Set(((natRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))];
  } catch { /* table absente (v87 non migrée) */ }
  const nativeSet = new Set(nativeIds);

  const userIds = [...new Set([...webIds, ...nativeIds])];
  if (userIds.length === 0) return { ok: true, date, targets: 0, sent: 0, failed: 0, skipped: 0 };

  // 3) Anti-doublon : déjà notifiés pour cette date (Paris) ?
  const { data: logRows } = await admin
    .from("devotion_push_log").select("user_id").eq("local_date", date).in("user_id", userIds);
  const already = new Set(((logRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
  const pending = userIds.filter((id) => !already.has(id));
  if (pending.length === 0) {
    return { ok: true, date, targets: userIds.length, sent: 0, failed: 0, skipped: userIds.length };
  }

  // 4) Contenu de la notif (titre + verset réels de la méditation publiée)
  const tv = await fetchTitleVerse(admin, date);
  const body = tv.title
    ? `${tv.title}${tv.verseRef ? ` · ${tv.verseRef}` : ""}`
    : "Ta méditation du jour est disponible 🙏";
  const payload = {
    title: `☀️ Méditons ensemble — ${frenchDate(date)}`,
    body,
    url: "/dashboard",
    type: "devotion",
    tag: "devotion-daily",
  };

  // 5) Envoi — UN SEUL canal par membre (évite les doublons) : natif (FCM) si
  //    l'appareil est enregistré, sinon web-push.
  const pendingNative = pending.filter((id) => nativeSet.has(id));
  const pendingWebOnly = pending.filter((id) => !nativeSet.has(id));

  let sent = 0, failed = 0;
  try {
    const rn = await sendNativePush(admin, pendingNative, payload);
    sent += rn.sent; failed += rn.failed;
  } catch { /* best-effort */ }
  if (webConfigured && pendingWebOnly.length > 0) {
    try {
      const rw = await sendPushToUserIds(admin, pendingWebOnly, payload);
      sent += rw.sent; failed += rw.failed;
    } catch { /* best-effort */ }
  }

  // 6) Journalisation (anti-doublon pour les prochains appels du jour)
  await admin.from("devotion_push_log").upsert(
    pending.map((uid) => ({ user_id: uid, local_date: date })),
    { onConflict: "user_id,local_date", ignoreDuplicates: true },
  );

  return { ok: true, date, targets: userIds.length, sent, failed, skipped: userIds.length - pending.length };
}
