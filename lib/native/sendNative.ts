import type { SupabaseClient } from "@supabase/supabase-js";
import { sendFcm, isFcmConfigured } from "./fcm";
import { channelForType } from "./channels";

/**
 * Envoie une notification NATIVE (FCM) aux appareils des `userIds` ciblés,
 * EN PLUS du web-push existant. Best-effort : ne jette jamais.
 *
 * `userIds === null` → tous les appareils enregistrés (audience « all »).
 * Réutilise le même payload que le web-push (titre/corps/url/type/tag).
 * Les tokens invalides sont supprimés automatiquement.
 *
 * Requiert FIREBASE_SERVICE_ACCOUNT (sinon no-op) + la table native_push_tokens (v87).
 */
export interface NativePayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
  tag?: string;
}

export async function sendNativePush(
  admin: SupabaseClient,
  userIds: string[] | null,
  payload: NativePayload,
): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured()) return { sent: 0, failed: 0 };
  if (userIds && userIds.length === 0) return { sent: 0, failed: 0 };

  try {
    let q = admin.from("native_push_tokens").select("token");
    if (userIds && userIds.length > 0) q = q.in("user_id", userIds);
    const { data } = await q;
    const tokens = [...new Set(((data ?? []) as Array<{ token: string }>).map((r) => r.token))];
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const data2: Record<string, string> = { url: payload.url || "/dashboard" };
    if (payload.type) data2.type = payload.type;
    if (payload.tag) data2.tag = payload.tag;

    const res = await sendFcm(tokens, {
      title: payload.title,
      body: payload.body,
      data: data2,
      channelId: channelForType(payload.type),
      priority: "high",
    });

    if (res.invalidTokens.length > 0) {
      try { await admin.from("native_push_tokens").delete().in("token", res.invalidTokens); } catch { /* noop */ }
    }
    return { sent: res.sent, failed: res.failed };
  } catch {
    return { sent: 0, failed: 0 };
  }
}
