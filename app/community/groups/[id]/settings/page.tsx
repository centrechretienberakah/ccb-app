import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import GroupSettingsClient from "./GroupSettingsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `Paramètres : ${(data as { name: string }).name} — CCB` : "Paramètres" };
}

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
}

export interface MemberRow {
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}/settings`);

  const { data: groupData } = await supabase
    .from("groups")
    .select("id, name, description, cover_url, type, category, created_by")
    .eq("id", id).maybeSingle();
  if (!groupData) return notFound();
  const group = groupData as GroupRow;

  // Vérifie que l'utilisateur est owner/admin du groupe
  const { data: myMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id).eq("user_id", user.id).maybeSingle();
  const myRole = (myMembership as { role: "owner" | "admin" | "member" } | null)?.role ?? null;

  if (!myRole || (myRole !== "owner" && myRole !== "admin")) {
    // Pas autorisé → retour à la page du groupe
    redirect(`/community/groups/${id}`);
  }

  // Tous les membres avec profils
  const { data: gm } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });
  const memberRows = (gm ?? []) as Array<{ user_id: string; role: "owner" | "admin" | "member"; joined_at: string }>;

  let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (memberRows.length > 0) {
    const { data: pf } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", memberRows.map((m) => m.user_id));
    for (const p of (pf ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
      profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
  }

  const members: MemberRow[] = memberRows.map((m) => ({
    ...m,
    display_name: profilesMap[m.user_id]?.display_name ?? null,
    avatar_url: profilesMap[m.user_id]?.avatar_url ?? null,
  }));

  return <GroupSettingsClient group={group} members={members} myRole={myRole} currentUserId={user.id} />;
}
