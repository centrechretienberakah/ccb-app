"use client";

import { createClient } from "@/lib/supabase/client";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "ended";

export interface CallRow {
  id: string;
  caller_id: string;
  receiver_id: string | null;
  conversation_id: string | null;
  group_id: string | null;
  room_id: string;
  call_type: CallType;
  status: CallStatus;
  caller_name: string | null;
  caller_avatar: string | null;
  group_name: string | null;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

/**
 * Crée un appel "ringing" (signalisation Realtime). Le destinataire reçoit
 * l'INSERT via son abonnement Realtime sur `calls` (RLS l'y autorise).
 * Retourne la ligne créée (avec id) ou null si la table v57 n'est pas migrée.
 */
export async function ringCall(opts: {
  conversationId?: string | null;
  groupId?: string | null;
  type: CallType;
}): Promise<CallRow | null> {
  try {
    const sb = createClient();
    const { data, error } = await sb.rpc("call_ring", {
      p_conversation_id: opts.conversationId ?? null,
      p_group_id: opts.groupId ?? null,
      p_type: opts.type,
    });
    if (error || !data) {
      if (typeof window !== "undefined") {
        console.warn(
          "[CCB call] call_ring a échoué — la sonnerie temps réel ne partira pas. " +
          "Vérifie que la migration calls (v57/v70) est exécutée et que la table est dans " +
          "la publication supabase_realtime. Détail :", error?.message ?? "aucune donnée renvoyée",
        );
      }
      return null;
    }
    return data as CallRow;
  } catch (e) {
    if (typeof window !== "undefined") console.warn("[CCB call] ringCall exception :", e);
    return null;
  }
}

/** Met à jour le statut d'un appel (accepté / refusé / manqué / terminé). */
export async function setCallStatus(callId: string, status: CallStatus): Promise<void> {
  try {
    const sb = createClient();
    await sb.rpc("call_update_status", { p_call_id: callId, p_status: status });
  } catch {
    /* noop */
  }
}

/** Envoie une notification push d'appel (best-effort, pour membres hors-ligne). */
export async function pushCallNotification(opts: {
  type: CallType;
  callerName: string;
  conversationId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
}): Promise<void> {
  try {
    const isGroup = !!opts.groupId;
    const title = isGroup
      ? (opts.type === "audio" ? "📞 Appel de groupe" : "📹 Appel vidéo de groupe")
      : (opts.type === "audio" ? "📞 Appel entrant" : "📹 Appel vidéo entrant");
    const body = isGroup
      ? `${opts.callerName} démarre un appel dans ${opts.groupName || "le groupe"}`
      : `${opts.callerName} vous appelle`;
    const url = isGroup
      ? `/community/groups/${opts.groupId}/meeting${opts.type === "audio" ? "?mode=audio&join=1" : "?join=1"}`
      : `/community/messages/${opts.conversationId}/call?mode=${opts.type}&join=1`;
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, body, url,
        audience: isGroup ? "group_members" : "conversation_members",
        groupId: opts.groupId ?? undefined,
        conversationId: opts.conversationId ?? undefined,
        // Push « appel » : prioritaire → vibration, reste affiché, sonne même
        // hors application.
        type: "call",
        tag: "ccb-call",
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500, 250, 800],
      }),
    });
    // Diagnostic : si sent=0, c'est que les destinataires n'ont pas activé les
    // notifications (aucun abonnement push) — pas un bug applicatif.
    try {
      const data = await res.json();
      if (typeof window !== "undefined") console.log("[CCB call] push appel →", res.status, data);
    } catch { /* noop */ }
  } catch (e) {
    if (typeof window !== "undefined") console.warn("[CCB call] pushCallNotification erreur réseau :", e);
  }
}
