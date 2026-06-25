import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Envoi push côté SERVEUR (sans session), réutilisable par les crons.
 * Même mécanique que /api/notifications/send mais ciblé par user_ids et
 * appelable avec un client service_role.
 */

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:centrechretienberakah@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

interface SubRow { endpoint: string; p256dh: string; auth: string; user_id: string }

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Envoie `payload` à toutes les subscriptions ENABLED des `userIds`.
 * Désactive automatiquement les endpoints expirés (404/410).
 * Suppose que configureWebPush() a déjà été appelé avec succès.
 */
export async function sendPushToUserIds(
  admin: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; invalidated: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0, invalidated: 0 };

  const { data } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .eq("enabled", true)
    .in("user_id", userIds);
  const subs = (data as SubRow[]) || [];
  if (subs.length === 0) return { sent: 0, failed: 0, invalidated: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
    ...(payload.type ? { type: payload.type } : {}),
    ...(payload.tag ? { tag: payload.tag } : {}),
    ...(typeof payload.requireInteraction === "boolean" ? { requireInteraction: payload.requireInteraction } : {}),
  });

  let sent = 0;
  let failed = 0;
  const invalid: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        { TTL: 6 * 60 * 60 }, // 6 h : la notif reste valable si l'appareil est hors-ligne à minuit
      );
      sent++;
    } catch (e) {
      failed++;
      const sc = (e as { statusCode?: number })?.statusCode;
      if (sc === 404 || sc === 410) invalid.push(s.endpoint);
    }
  }));

  if (invalid.length > 0) {
    await admin.from("push_subscriptions").update({ enabled: false }).in("endpoint", invalid);
  }
  return { sent, failed, invalidated: invalid.length };
}
