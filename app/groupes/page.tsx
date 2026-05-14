import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GroupesClient from "./GroupesClient";
import type { GroupRow } from "@/lib/database.types";

export const metadata: Metadata = { title: "Groupes — CCB" };

export default async function GroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Tente avec member_count (si colonne dénormalisée existe), sinon fallback
  let groups: GroupRow[] = [];
  {
    const full = await supabase
      .from("groups")
      .select("id, name, description, type, member_count, is_private, cover_url, created_at, max_members")
      .order("created_at", { ascending: false });
    if (!full.error && full.data) {
      groups = full.data as unknown as GroupRow[];
    } else {
      const basic = await supabase
        .from("groups")
        .select("id, name, description, type, is_private, cover_url, created_at, max_members")
        .order("created_at", { ascending: false });
      groups = (basic.data as unknown as GroupRow[] | null) ?? [];
    }
  }

  // Compte les membres par groupe (si on n'a pas la colonne dénormalisée)
  if (groups.length > 0 && groups[0].member_count === undefined) {
    const groupIds = groups.map((g) => g.id);
    const { data: members } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);
    const counts: Record<string, number> = {};
    for (const m of members ?? []) counts[m.group_id] = (counts[m.group_id] || 0) + 1;
    groups = groups.map((g) => ({ ...g, member_count: counts[g.id] || 0 }));
  }

  // Tri par nombre de membres décroissant
  groups.sort((a, b) => (b.member_count || 0) - (a.member_count || 0));

  let myGroupIds: string[] = [];
  if (user) {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    myGroupIds = (memberships ?? []).map(m => m.group_id);
  }

  return <GroupesClient groups={groups ?? []} myGroupIds={myGroupIds} userId={user?.id ?? null} />;
}
