import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DmChatClient from "./DmChatClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation — CCB" };

export interface DmMessageRow {
  id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  reply_to_id: string | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface DmOther {
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/messages/${id}`);

  // RLS : conversation visible uniquement si l'utilisateur est membre
  const { data: conv } = await supabase
    .from("conversations").select("id, type, title").eq("id", id).maybeSingle();
  if (!conv) return notFound();
  const c = conv as { id: string; type: "dm" | "group"; title: string | null };

  // Membres + profils
  const { data: members } = await supabase
    .from("conversation_members").select("user_id").eq("conversation_id", id);
  const memberIds = ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
  const profMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (memberIds.length > 0) {
    const { data: profs } = await supabase
      .from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", memberIds);
    for (const p of (profs ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
      profMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }
  const otherId = memberIds.find((uid) => uid !== user.id) ?? null;
  const other: DmOther = {
    user_id: otherId,
    display_name: otherId ? profMap[otherId]?.display_name ?? null : (c.title ?? null),
    avatar_url: otherId ? profMap[otherId]?.avatar_url ?? null : null,
  };
  const myDisplayName = profMap[user.id]?.display_name ?? "Un membre";

  // Messages initiaux
  const { data: msgs } = await supabase
    .from("dm_messages")
    .select("id, sender_id, content, attachment_url, attachment_type, attachment_name, reply_to_id, is_pinned, is_edited, is_deleted, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(300);

  // Marque comme lu
  try {
    await supabase.from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id).eq("user_id", user.id);
  } catch { /* noop */ }

  return (
    <DmChatClient
      conversationId={id}
      currentUserId={user.id}
      other={other}
      myDisplayName={myDisplayName}
      initialMessages={(msgs ?? []) as DmMessageRow[]}
    />
  );
}
