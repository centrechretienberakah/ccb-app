import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import GroupDetailClient from "./GroupDetailClient";

export const dynamic = "force-dynamic";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
  created_at: string;
}

export interface MemberRow {
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MessageRow {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  user_profiles: { user_id: string; display_name: string | null; avatar_url: string | null } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `${(data as { name: string }).name} — Groupe CCB` : "Groupe" };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}`);

  const { data: groupData, error } = await supabase
    .from("groups")
    .select("id, name, description, cover_url, type, category, created_by, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !groupData) return notFound();
  const group = groupData as GroupRow;

  // Members
  const { data: gm } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });
  const memberRows = (gm ?? []) as Array<{ user_id: string; role: "owner" | "admin" | "member"; joined_at: string }>;
  const memberIds = memberRows.map((m) => m.user_id);

  // Profils membres
  let profilesMap: Record<string, { user_id: string; display_name: string | null; avatar_url: string | null }> = {};
  if (memberIds.length > 0) {
    const { data: pf } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", memberIds);
    profilesMap = Object.fromEntries(((pf ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>).map((p) => [p.user_id, p]));
  }

  const members: MemberRow[] = memberRows.map((m) => ({
    ...m,
    display_name: profilesMap[m.user_id]?.display_name ?? null,
    avatar_url: profilesMap[m.user_id]?.avatar_url ?? null,
  }));

  const isMember = members.some((m) => m.user_id === user.id);
  const myRole = members.find((m) => m.user_id === user.id)?.role ?? null;

  // Messages (seulement si membre OU groupe public)
  let messages: MessageRow[] = [];
  if (isMember || group.type === "public") {
    const { data: msg } = await supabase
      .from("group_messages")
      .select("id, group_id, user_id, content, reply_to_id, created_at, edited_at")
      .eq("group_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    const msgRows = (msg ?? []) as Omit<MessageRow, "user_profiles">[];

    // Profils manquants pour les messages (auteurs non-membres? rare mais possible)
    const msgUserIds = [...new Set(msgRows.map((m) => m.user_id))];
    const missingIds = msgUserIds.filter((uid) => !profilesMap[uid]);
    if (missingIds.length > 0) {
      const { data: missing } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", missingIds);
      for (const p of (missing ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
        profilesMap[p.user_id] = p;
      }
    }

    messages = msgRows.map((m) => ({
      ...m,
      user_profiles: profilesMap[m.user_id] ?? null,
    }));
  }

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentUserProfile = (myProfile as { user_id: string; display_name: string | null; avatar_url: string | null } | null) ?? null;

  return (
    <GroupDetailClient
      group={group}
      members={members}
      initialMessages={messages}
      currentUserId={user.id}
      currentUserProfile={currentUserProfile}
      isMember={isMember}
      myRole={myRole}
    />
  );
}
