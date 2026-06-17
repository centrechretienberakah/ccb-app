import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MessagesListClient from "./MessagesListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discussions — CCB" };

/** Entrée unifiée de la liste « Discussions » (privés + groupes fusionnés). */
export interface Discussion {
  key: string;                       // clé React unique : "conv-<id>" | "group-<id>"
  source: "conversation" | "group";  // d'où vient l'élément (routing + suppression)
  kind: "private" | "group";         // pour le filtre Privés / Groupes
  id: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
  unreadCount: number;
}

export interface CallLogItem {
  id: string;
  otherName: string;
  otherAvatar: string | null;
  isGroup: boolean;
  outgoing: boolean;
  type: "audio" | "video";
  status: string;
  createdAt: string;
  targetHref: string;
}

const tsOf = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export default async function DiscussionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/messages");

  // Rôle global (pour autoriser la création de groupe + l'accès admin)
  let userRole: string | null = null;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    userRole = (roleRow as { role: string } | null)?.role ?? null;
  } catch { /* noop */ }

  const discussions: Discussion[] = [];

  // ─── 1. Conversations privées / mini-groupes (système DM) ───────────
  try {
    const { data: myMems } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    const rows = (myMems ?? []) as Array<{ conversation_id: string; last_read_at: string }>;
    const myConvIds = rows.map((m) => m.conversation_id);
    const myLastRead: Record<string, string> = {};
    rows.forEach((m) => { myLastRead[m.conversation_id] = m.last_read_at; });

    if (myConvIds.length > 0) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, type, title, last_message_at")
        .in("id", myConvIds);

      const { data: allMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", myConvIds);
      const othersByConv: Record<string, string[]> = {};
      for (const mm of (allMembers ?? []) as Array<{ conversation_id: string; user_id: string }>) {
        if (mm.user_id !== user.id) (othersByConv[mm.conversation_id] ||= []).push(mm.user_id);
      }
      const otherIds = [...new Set(Object.values(othersByConv).flat())];
      const profMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (otherIds.length > 0) {
        const { data: profs } = await supabase
          .from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", otherIds);
        for (const p of (profs ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
          profMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        }
      }

      const { data: lastMsgs } = await supabase
        .from("dm_messages")
        .select("conversation_id, content, created_at, attachment_type, is_deleted")
        .in("conversation_id", myConvIds)
        .order("created_at", { ascending: false });
      const lastByConv: Record<string, { content: string | null; created_at: string; attachment_type: string | null; is_deleted: boolean }> = {};
      for (const msg of (lastMsgs ?? []) as Array<{ conversation_id: string; content: string | null; created_at: string; attachment_type: string | null; is_deleted: boolean }>) {
        if (!lastByConv[msg.conversation_id]) lastByConv[msg.conversation_id] = msg;
      }

      for (const c of (convs ?? []) as Array<{ id: string; type: "dm" | "group"; title: string | null; last_message_at: string | null }>) {
        const others = othersByConv[c.id] || [];
        const otherId = others[0] ?? null;
        const prof = otherId ? profMap[otherId] : null;
        const last = lastByConv[c.id];
        const lastReadAt = myLastRead[c.id];
        const unread = !!(last && lastReadAt && new Date(last.created_at) > new Date(lastReadAt));
        const isMini = c.type === "group";
        discussions.push({
          key: `conv-${c.id}`,
          source: "conversation",
          kind: isMini ? "group" : "private",
          id: c.id,
          name: isMini ? (c.title || "Groupe privé") : (prof?.display_name || "Membre"),
          avatarUrl: isMini ? null : (prof?.avatar_url ?? null),
          lastMessage: last ? (last.is_deleted ? "Message supprimé" : (last.content || (last.attachment_type ? "📎 Pièce jointe" : ""))) : null,
          lastMessageAt: last?.created_at ?? c.last_message_at,
          unread,
          unreadCount: 0,
        });
      }
    }
  } catch { /* tables v52 non migrées → pas de DM */ }

  // ─── 2. Groupes dont l'utilisateur est membre ───────────────────────
  try {
    const { data: gm } = await supabase
      .from("group_members").select("group_id").eq("user_id", user.id);
    const gids = [...new Set(((gm ?? []) as Array<{ group_id: string }>).map((r) => r.group_id))];
    if (gids.length > 0) {
      type GRow = { id: string; name: string; cover_url: string | null; last_message_content: string | null; last_message_attachment_type: string | null; last_message_at: string | null };
      let grows: GRow[] = [];
      try {
        const { data, error } = await supabase
          .from("group_summary")
          .select("id, name, cover_url, last_message_content, last_message_attachment_type, last_message_at")
          .in("id", gids);
        if (error) throw error;
        grows = (data ?? []) as GRow[];
      } catch {
        const { data } = await supabase.from("groups").select("id, name, cover_url").in("id", gids);
        grows = ((data ?? []) as Array<{ id: string; name: string; cover_url: string | null }>)
          .map((g) => ({ ...g, last_message_content: null, last_message_attachment_type: null, last_message_at: null }));
      }
      const unread: Record<string, number> = {};
      try {
        const { data: uc } = await supabase.rpc("groups_my_unread_counts");
        for (const row of (uc ?? []) as Array<{ group_id: string; unread_count: number }>) unread[row.group_id] = row.unread_count;
      } catch { /* RPC absente → 0 */ }

      for (const g of grows) {
        discussions.push({
          key: `group-${g.id}`,
          source: "group",
          kind: "group",
          id: g.id,
          name: g.name,
          avatarUrl: g.cover_url,
          lastMessage: g.last_message_content || (g.last_message_attachment_type ? "📎 Pièce jointe" : null),
          lastMessageAt: g.last_message_at,
          unread: (unread[g.id] ?? 0) > 0,
          unreadCount: unread[g.id] ?? 0,
        });
      }
    }
  } catch { /* tables groupes non migrées → pas de groupes */ }

  // ─── 3. Fusion + tri par dernier message (récent → ancien) ──────────
  discussions.sort((a, b) => tsOf(b.lastMessageAt) - tsOf(a.lastMessageAt));

  // ─── Journal des appels (table calls v57) — best-effort ─────────────
  let callLog: CallLogItem[] = [];
  try {
    const { data: callRows } = await supabase
      .from("calls")
      .select("id, caller_id, receiver_id, conversation_id, group_id, call_type, status, caller_name, caller_avatar, group_name, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    type CallRow = {
      id: string; caller_id: string; receiver_id: string | null;
      conversation_id: string | null; group_id: string | null;
      call_type: "audio" | "video"; status: string;
      caller_name: string | null; caller_avatar: string | null; group_name: string | null; created_at: string;
    };
    const rows = (callRows ?? []) as CallRow[];
    const needIds = new Set<string>();
    for (const r of rows) {
      if (!r.group_id) {
        const otherId = r.caller_id === user.id ? r.receiver_id : r.caller_id;
        if (otherId && otherId !== user.id) needIds.add(otherId);
      }
    }
    const pMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (needIds.size > 0) {
      const { data: profs } = await supabase
        .from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", [...needIds]);
      for (const p of (profs ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
        pMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
    }
    callLog = rows.map((r) => {
      const outgoing = r.caller_id === user.id;
      let otherName = "Membre";
      let otherAvatar: string | null = null;
      let targetHref = "/community/messages";
      if (r.group_id) {
        otherName = r.group_name || "Groupe";
        targetHref = `/community/groups/${r.group_id}`;
      } else {
        const otherId = outgoing ? r.receiver_id : r.caller_id;
        if (outgoing) {
          const p = otherId ? pMap[otherId] : null;
          otherName = p?.display_name ?? "Membre";
          otherAvatar = p?.avatar_url ?? null;
        } else {
          otherName = r.caller_name ?? "Membre";
          otherAvatar = r.caller_avatar ?? null;
        }
        if (r.conversation_id) targetHref = `/community/messages/${r.conversation_id}`;
      }
      return {
        id: r.id, otherName, otherAvatar, isGroup: !!r.group_id, outgoing,
        type: r.call_type, status: r.status, createdAt: r.created_at, targetHref,
      };
    });
  } catch { /* table calls absente → journal vide */ }

  return <MessagesListClient discussions={discussions} currentUserId={user.id} callLog={callLog} userRole={userRole} />;
}
