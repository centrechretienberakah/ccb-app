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
}

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/groups");

  let groups: GroupLite[] = [];
  try {
    const { data: gd } = await supabase
      .from("groups")
      .select("id, name, description, cover_url, type, category, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (gd ?? []) as Omit<GroupLite, "member_count" | "is_member" | "my_role">[];

    // Members count + my membership
    const ids = rows.map((r) => r.id);
    const counts: Record<string, number> = {};
    const myMembership: Record<string, "owner" | "admin" | "member"> = {};
    if (ids.length > 0) {
      const { data: gm } = await supabase
        .from("group_members")
        .select("group_id, user_id, role")
        .in("group_id", ids);
      for (const m of (gm ?? []) as Array<{ group_id: string; user_id: string; role: "owner" | "admin" | "member" }>) {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
        if (m.user_id === user.id) myMembership[m.group_id] = m.role;
      }
    }

    groups = rows.map((r) => ({
      ...r,
      member_count: counts[r.id] ?? 0,
      is_member: !!myMembership[r.id],
      my_role: myMembership[r.id] ?? null,
    }));
  } catch (e) {
    console.error("Groups fetch error:", e);
  }

  return <GroupsListClient initialGroups={groups} currentUserId={user.id} />;
}
