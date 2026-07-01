import type { SupabaseClient } from "@supabase/supabase-js";
import { sendFcm, isFcmConfigured } from "./fcm";

/**
 * Envoie une INVITATION D'APPEL native (message FCM data-only, haute priorité)
 * aux appareils des destinataires. Le service natif Android (Phase 2 étape 2)
 * affiche alors l'écran d'appel plein format (sonnerie, Accepter/Refuser).
 *
 * Data-only (pas de title/body) → c'est le natif qui gère l'affichage.
 * Best-effort ; no-op si FCM non configuré ou aucun token.
 */
export interface CallInvite {
  callId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string | null;
  roomUrl: string;      // ex. /community/messages/<id>/call?mode=video&join=1
  groupName?: string | null;
}

/**
 * Annule l'appel entrant natif chez les destinataires (l'appelant a raccroché /
 * personne n'a répondu). Message data-only type=call-cancel.
 */
export async function sendCallCancel(
  admin: SupabaseClient,
  calleeUserIds: string[],
): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured() || calleeUserIds.length === 0) return { sent: 0, failed: 0 };
  try {
    const { data } = await admin.from("native_push_tokens").select("token").in("user_id", calleeUserIds);
    const tokens = [...new Set(((data ?? []) as Array<{ token: string }>).map((r) => r.token))];
    if (tokens.length === 0) return { sent: 0, failed: 0 };
    const res = await sendFcm(tokens, {
      data: { type: "call-cancel" },
      channelId: "calls",
      priority: "high",
      ttlSeconds: 45,
    });
    if (res.invalidTokens.length > 0) {
      try { await admin.from("native_push_tokens").delete().in("token", res.invalidTokens); } catch { /* noop */ }
    }
    return { sent: res.sent, failed: res.failed };
  } catch {
    return { sent: 0, failed: 0 };
  }
}

export async function sendCallInvite(
  admin: SupabaseClient,
  calleeUserIds: string[],
  invite: CallInvite,
): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured() || calleeUserIds.length === 0) return { sent: 0, failed: 0 };
  try {
    const { data } = await admin
      .from("native_push_tokens").select("token").in("user_id", calleeUserIds);
    const tokens = [...new Set(((data ?? []) as Array<{ token: string }>).map((r) => r.token))];
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const res = await sendFcm(tokens, {
      data: {
        type: "call",
        callId: invite.callId,
        callType: invite.callType,
        callerName: invite.callerName,
        callerAvatar: invite.callerAvatar || "",
        roomUrl: invite.roomUrl,
        groupName: invite.groupName || "",
      },
      channelId: "calls",
      priority: "high",
      ttlSeconds: 45,
    });
    if (res.invalidTokens.length > 0) {
      try { await admin.from("native_push_tokens").delete().in("token", res.invalidTokens); } catch { /* noop */ }
    }
    return { sent: res.sent, failed: res.failed };
  } catch {
    return { sent: 0, failed: 0 };
  }
}
