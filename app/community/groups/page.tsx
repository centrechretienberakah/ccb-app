import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GroupsListClient from "./GroupsListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Groupes — Communauté CCB" };

export interface GroupLite {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  my_role: "owner" | "admin" | "member" | null;
  last_message_content: string | null;
  last_message_attachment_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  muted_until: string | null;
}

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/groups");

  // Rôle global (pour autoriser la création)
  let userRole: string | null = null;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    userRole = (roleRow as { role: string } | null)?.role ?? null;
  } catch { /* noop */ }

  let groups: GroupLite[] = [];
  try {
    // Tentative via la vue group_summary (créée par v39).
    // Si la vue n'existe pas encore (migration non exécutée), on retombe
    // sur la table groups simple → graceful degradation.
    let rows: Array<Omit<GroupLite, "is_member" | "my_role" | "unread_count" | "muted_until">> = [];
    try {
      const { data, error } = await supabase
        .from("group_summary")
        .select("id, name, description, cover_url, type, category, created_by, created_at, member_count, last_message_content, last_message_attachment_type, last_message_at")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      rows = (data ?? []) as typeof rows;
    } catch {
      // Fallback : table groups + comptage local
      const { data: gd } = await supabase
        .from("groups")
        .select("id, name, description, cover_url, type, category, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      const ids = ((gd ?? []) as Array<{ id: string }>).map((r) => r.id);
      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: gm } = await supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", ids);
        for (const m of (gm ?? []) as Array<{ group_id: string }>) {
          counts[m.group_id] = (counts[m.group_id] || 0) + 1;
        }
      }
      rows = ((gd ?? []) as Array<{ id: string; name: string; description: string | null; cover_url: string | null; type: "public" | "private"; category: string | null; created_by: string; created_at: string }>).map((g) => ({
        ...g,
        member_count: counts[g.id] ?? 0,
        last_message_content: null,
        last_message_attachment_type: null,
        last_message_at: null,
      }));
    }

    // Membership + role pour le user
    const ids = rows.map((r) => r.id);
    const myMembership: Record<string, "owner" | "admin" | "member"> = {};
    if (ids.length > 0) {
      const { data: gm } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", user.id)
        .in("group_id", ids);
      for (const m of (gm ?? []) as Array<{ group_id: string; role: "owner" | "admin" | "member" }>) {
        myMembership[m.group_id] = m.role;
      }
    }

    // Unread counts via RPC (fallback silencieux si la fonction n'existe pas)
    const unread: Record<string, number> = {};
    try {
      const { data: uc } = await supabase.rpc("groups_my_unread_counts");
      for (const row of (uc ?? []) as Array<{ group_id: string; unread_count: number }>) {
        unread[row.group_id] = row.unread_count;
      }
    } catch { /* RPC pas dispo → 0 partout */ }

    // Mute state
    const muted: Record<string, string> = {};
    if (ids.length > 0) {
      try {
        const { data: ms } = await supabase
          .from("group_user_state")
          .select("group_id, muted_until")
          .eq("user_id", user.id)
          .in("group_id", ids);
        for (const r of (ms ?? []) as Array<{ group_id: string; muted_until: string | null }>) {
          if (r.muted_until) muted[r.group_id] = r.muted_until;
        }
      } catch { /* noop */ }
    }

    groups = rows.map((r) => ({
      ...r,
      is_member: !!myMembership[r.id],
      my_role: myMembership[r.id] ?? null,
      unread_count: unread[r.id] ?? 0,
      muted_until: muted[r.id] ?? null,
    }));
  } catch (e) {
    console.error("Groups fetch error:", e);
  }

  return <GroupsListClient initialGroups={groups} currentUserId={user.id} userRole={userRole} />;
}
