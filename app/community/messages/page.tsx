import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MessagesListClient from "./MessagesListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — CCB" };

export interface ConversationLite {
  id: string;
  type: "dm" | "group";
  title: string | null;
  otherName: string | null;
  otherAvatar: string | null;
  otherUserId: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/messages");

  let conversations: ConversationLite[] = [];
  try {
    const { data: myMems } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    const rows = (myMems ?? []) as Array<{ conversation_id: string; last_read_at: string }>;
    const myConvIds = rows.map((m) => m.conversation_id);
    const myLastRead: Record<string, string> = {};
    rows.forEach((m) => { myLastRead[m.conversation_id] = m.last_read_at; });

    // Discussions masquées par l'utilisateur (« supprimer pour moi », v59).
    // Best-effort : si la colonne deleted_at n'existe pas encore (v59 non migrée),
    // delRows est null → aucun filtrage → la liste fonctionne comme avant.
    const myDeleted: Record<string, string> = {};
    try {
      const { data: delRows } = await supabase
        .from("conversation_members")
        .select("conversation_id, deleted_at")
        .eq("user_id", user.id);
      for (const r of (delRows ?? []) as Array<{ conversation_id: string; deleted_at: string | null }>) {
        if (r.deleted_at) myDeleted[r.conversation_id] = r.deleted_at;
      }
    } catch { /* colonne deleted_at absente → pas de filtrage */ }

    if (myConvIds.length > 0) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, type, title, last_message_at")
        .in("id", myConvIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });

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

      conversations = ((convs ?? []) as Array<{ id: string; type: "dm" | "group"; title: string | null; last_message_at: string | null }>).map((c) => {
        const others = othersByConv[c.id] || [];
        const otherId = others[0] ?? null;
        const prof = otherId ? profMap[otherId] : null;
        const last = lastByConv[c.id];
        const lastReadAt = myLastRead[c.id];
        const unread = !!(last && lastReadAt && new Date(last.created_at) > new Date(lastReadAt));
        return {
          id: c.id,
          type: c.type,
          title: c.title,
          otherName: prof?.display_name ?? null,
          otherAvatar: prof?.avatar_url ?? null,
          otherUserId: otherId,
          lastMessage: last ? (last.is_deleted ? "Message supprimé" : (last.content || (last.attachment_type ? "📎 Pièce jointe" : ""))) : null,
          lastMessageAt: last?.created_at ?? c.last_message_at,
          unread,
        };
      })
      // Masque les discussions supprimées « pour moi », sauf si un nouveau
      // message est arrivé depuis (la discussion réapparaît alors).
      .filter((c) => {
        const del = myDeleted[c.id];
        if (!del) return true;
        return !!c.lastMessageAt && new Date(c.lastMessageAt) > new Date(del);
      });
    }
  } catch { /* tables v52 pas migrées → liste vide */ }

  return <MessagesListClient conversations={conversations} currentUserId={user.id} />;
}
