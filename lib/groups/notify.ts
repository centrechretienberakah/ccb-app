// Helpers d'envoi de notifications push pour le module Groupes.
// Utilisent l'endpoint existant /api/notifications/send.

import { createClient } from "@/lib/supabase/client";

interface SendOpts {
  title: string;
  body: string;
  url?: string;
  audience?: "all" | "admins" | "user_ids" | "group_members";
  userIds?: string[];
  groupId?: string;
  excludeMuted?: boolean;
}

async function sendPush(opts: SendOpts): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    // Log diagnostic dans la console pour debug rapide
    try {
      const data = await res.json();
      if (typeof window !== "undefined") {
        console.log("[CCB push] /api/notifications/send →", res.status, data);
      }
    } catch { /* noop */ }
    return res.ok;
  } catch (e) {
    if (typeof window !== "undefined") {
      console.error("[CCB push] erreur réseau", e);
    }
    return false;
  }
}

/**
 * Renvoie les user_ids des membres d'un groupe qui ne sont pas en mute actif
 * (et différents du user appelant si excludeUserId fourni).
 *
 * Si la table group_user_state n'existe pas, retombe sur tous les membres.
 */
export async function fetchUnmutedMembers(
  groupId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const supabase = createClient();
  // Tous les membres du groupe
  const { data: gm } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  const allIds = ((gm ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
  if (allIds.length === 0) return [];

  // Mutes actifs (best-effort)
  const mutedIds = new Set<string>();
  try {
    const { data: ms } = await supabase
      .from("group_user_state")
      .select("user_id, muted_until")
      .eq("group_id", groupId)
      .in("user_id", allIds);
    const nowMs = Date.now();
    for (const row of (ms ?? []) as Array<{ user_id: string; muted_until: string | null }>) {
      if (row.muted_until && new Date(row.muted_until).getTime() > nowMs) {
        mutedIds.add(row.user_id);
      }
    }
  } catch { /* table v39 pas migrée → personne n'est mute */ }

  return allIds.filter((id) => !mutedIds.has(id) && id !== excludeUserId);
}

/**
 * Notif nouveau message dans un groupe. Envoyée à tous les membres
 * non mutés sauf l'auteur. Côté serveur (audience: group_members).
 */
export async function notifyGroupMessage(opts: {
  groupId: string;
  groupName: string;
  authorName: string;
  snippet: string;
  excludeUserId: string;
}): Promise<boolean> {
  void opts.excludeUserId; // l'API serveur exclut l'appelant automatiquement
  return sendPush({
    title: `💬 ${opts.authorName} · ${opts.groupName}`,
    body: opts.snippet.slice(0, 140) || "📎 Pièce jointe",
    url: `/community/groups/${opts.groupId}`,
    audience: "group_members",
    groupId: opts.groupId,
    excludeMuted: true,
  });
}

/**
 * Notif mention @user (ignore le mute volontairement : une mention reste forte).
 */
export async function notifyGroupMention(opts: {
  groupId: string;
  groupName: string;
  authorName: string;
  snippet: string;
  mentionedUserIds: string[];
}): Promise<boolean> {
  if (opts.mentionedUserIds.length === 0) return false;
  return sendPush({
    title: `🔔 ${opts.authorName} t'a mentionné dans ${opts.groupName}`,
    body: opts.snippet.slice(0, 140),
    url: `/community/groups/${opts.groupId}`,
    audience: "user_ids",
    userIds: opts.mentionedUserIds,
  });
}

/**
 * Notif "réunion démarrée". Envoyée aux membres non mutés sauf l'organisateur.
 * Côté serveur (audience: group_members).
 */
export async function notifyGroupMeeting(opts: {
  groupId: string;
  groupName: string;
  authorName: string;
  excludeUserId: string;
  mode?: "audio" | "video";
}): Promise<boolean> {
  void opts.excludeUserId; // exclu côté serveur
  const isAudio = opts.mode === "audio";
  return sendPush({
    title: `${isAudio ? "📞" : "🎥"} ${opts.authorName} ${isAudio ? "lance un appel" : "démarre une réunion"}`,
    body: `Rejoins « ${opts.groupName} » maintenant`,
    url: `/community/groups/${opts.groupId}/meeting${isAudio ? "?mode=audio" : ""}`,
    audience: "group_members",
    groupId: opts.groupId,
    excludeMuted: true,
  });
}

/**
 * Notif "nouveau membre" envoyée aux admins du groupe.
 */
export async function notifyNewMember(opts: {
  groupId: string;
  groupName: string;
  newMemberName: string;
}): Promise<boolean> {
  // Récupère les owner/admin du groupe (lecture publique des group_members)
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", opts.groupId)
      .in("role", ["owner", "admin"]);
    const adminIds = ((data ?? []) as Array<{ user_id: string; role: string }>).map((m) => m.user_id);
    if (adminIds.length === 0) return false;
    return sendPush({
      title: `🧑‍🤝‍🧑 Nouveau membre dans ${opts.groupName}`,
      body: `${opts.newMemberName} vient de rejoindre le groupe`,
      url: `/community/groups/${opts.groupId}/settings`,
      audience: "user_ids",
      userIds: adminIds,
    });
  } catch {
    return false;
  }
}

/**
 * Notif "demande d'accès" envoyée aux admins du groupe.
 */
export async function notifyJoinRequest(opts: {
  groupId: string;
  groupName: string;
  applicantName: string;
}): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", opts.groupId)
      .in("role", ["owner", "admin"]);
    const adminIds = ((data ?? []) as Array<{ user_id: string; role: string }>).map((m) => m.user_id);
    if (adminIds.length === 0) return false;
    return sendPush({
      title: `📨 ${opts.applicantName} demande à rejoindre ${opts.groupName}`,
      body: "Approuve ou refuse la demande depuis les paramètres du groupe.",
      url: `/community/groups/${opts.groupId}/settings`,
      audience: "user_ids",
      userIds: adminIds,
    });
  } catch {
    return false;
  }
}

/**
 * Notif au demandeur quand sa demande est approuvée.
 */
export async function notifyRequestApproved(opts: {
  groupId: string;
  groupName: string;
  userId: string;
}): Promise<boolean> {
  return sendPush({
    title: `🎉 Bienvenue dans ${opts.groupName}`,
    body: "Ta demande d'accès a été approuvée — viens dire bonjour !",
    url: `/community/groups/${opts.groupId}`,
    audience: "user_ids",
    userIds: [opts.userId],
  });
}
