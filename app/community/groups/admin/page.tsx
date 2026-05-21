import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminGroupsClient, {
  type GroupStat, type ProfileLite, type ActivityDay, type GlobalKpis,
} from "./AdminGroupsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Groupes — Communauté CCB" };

const EMPTY_KPIS: GlobalKpis = {
  total_groups: 0,
  archived_groups: 0,
  total_members: 0,
  messages_7d: 0,
  messages_30d: 0,
  active_categories: 0,
};

export default async function GroupsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/groups/admin");

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect("/community/groups");
  }

  // Stats par groupe via la vue (avec graceful fallback)
  let groups: GroupStat[] = [];
  let sqlReady = true;
  try {
    const { data, error } = await supabase
      .from("groups_admin_stats")
      .select("id, name, description, cover_url, type, category, created_by, created_at, is_archived, archived_at, member_count, total_messages, messages_7d, messages_30d, last_activity_at")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    groups = (data ?? []) as GroupStat[];
  } catch {
    sqlReady = false;
    // Fallback : pas de stats agrégées
    try {
      const { data: gd } = await supabase
        .from("groups")
        .select("id, name, description, cover_url, type, category, created_by, created_at")
        .order("created_at", { ascending: false });
      const memberCounts: Record<string, number> = {};
      const ids = ((gd ?? []) as Array<{ id: string }>).map((g) => g.id);
      if (ids.length > 0) {
        const { data: gm } = await supabase
          .from("group_members").select("group_id").in("group_id", ids);
        for (const m of (gm ?? []) as Array<{ group_id: string }>) {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        }
      }
      groups = ((gd ?? []) as Array<{ id: string; name: string; description: string | null; cover_url: string | null; type: "public" | "private"; category: string | null; created_by: string; created_at: string }>).map((g) => ({
        ...g,
        is_archived: false,
        archived_at: null,
        member_count: memberCounts[g.id] ?? 0,
        total_messages: 0,
        messages_7d: 0,
        messages_30d: 0,
        last_activity_at: null,
      }));
    } catch { /* table groups manquante ? */ }
  }

  // Activité 30j (vue optionnelle)
  let activity: ActivityDay[] = [];
  try {
    const { data } = await supabase
      .from("groups_admin_activity_30d")
      .select("day, new_groups, messages, new_members");
    activity = (data ?? []) as ActivityDay[];
  } catch { /* noop */ }

  // KPIs calculés depuis la liste
  const kpis: GlobalKpis = {
    total_groups: groups.filter((g) => !g.is_archived).length,
    archived_groups: groups.filter((g) => g.is_archived).length,
    total_members: groups.reduce((acc, g) => acc + g.member_count, 0),
    messages_7d: groups.reduce((acc, g) => acc + g.messages_7d, 0),
    messages_30d: groups.reduce((acc, g) => acc + g.messages_30d, 0),
    active_categories: new Set(groups.filter((g) => g.category && !g.is_archived).map((g) => g.category)).size,
  };

  // Profils créateurs
  const creatorIds = Array.from(new Set(groups.map((g) => g.created_by)));
  let profiles: ProfileLite[] = [];
  if (creatorIds.length > 0) {
    const { data: pf } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", creatorIds);
    profiles = ((pf ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>);
  }

  return (
    <AdminGroupsClient
      kpis={sqlReady ? kpis : EMPTY_KPIS}
      groups={groups}
      activity={activity}
      profiles={profiles}
      sqlReady={sqlReady}
      currentUserId={user.id}
    />
  );
}
