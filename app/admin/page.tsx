import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — CCB" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin");

  // Vérification rôle admin via user_roles (bonne table)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (roleRow?.role !== "admin" && roleRow?.role !== "leader") {
    redirect("/dashboard");
  }

  // Profil admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, full_name")
    .eq("user_id", user.id)
    .single();

  const adminName = profile?.display_name || profile?.full_name || "Admin";

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Stats
  const [
    { count: totalMembers },
    { count: newMembersWeek },
    { count: totalPosts },
    { count: openPrayers },
    { count: totalEvents },
    { count: totalDevotions },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("prayer_request").select("*", { count: "exact", head: true }).eq("is_answered", false),
    supabase.from("events").select("*", { count: "exact", head: true }).gte("event_date", monthStart),
    supabase.from("devotions").select("*", { count: "exact", head: true }),
  ]);

  // Membres récents
  const { data: members } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, full_name, spiritual_level, created_at, country, city, is_premium")
    .order("created_at", { ascending: false })
    .limit(100);

  // Rôles des membres
  const { data: allRoles } = await supabase
    .from("user_roles")
    .select("user_id, role");
  const rolesMap: Record<string, string> = {};
  for (const r of allRoles || []) rolesMap[r.user_id] = r.role;

  const membersWithRole = (members || []).map((m: any) => ({
    ...m,
    id: m.user_id,
    full_name: m.display_name || m.full_name || "—",
    role: rolesMap[m.user_id] || "member",
  }));

  // Posts récents
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, is_pinned, post_type")
    .order("created_at", { ascending: false })
    .limit(30);

  // Prières récentes
  const { data: recentPrayers } = await supabase
    .from("prayer_request")
    .select("id, title, content, is_answered, created_at, user_id, is_anonymous, category")
    .order("created_at", { ascending: false })
    .limit(30);

  // Dévotions
  const { data: devotions } = await supabase
    .from("devotions")
    .select("id, date, title, verse_reference, verse_text, content")
    .order("date", { ascending: false })
    .limit(30);

  // Événements
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, event_type, is_published, status")
    .order("event_date", { ascending: false })
    .limit(20);

  // Profils des auteurs de posts
  const postUserIds = [...new Set((recentPosts ?? []).map((p: any) => p.user_id))];
  const { data: postProfiles } = postUserIds.length > 0
    ? await supabase.from("user_profiles").select("user_id, display_name, full_name").in("user_id", postUserIds)
    : { data: [] };

  // Profils des auteurs de prières
  const prayerUserIds = [...new Set((recentPrayers ?? []).map((p: any) => p.user_id))];
  const { data: prayerProfiles } = prayerUserIds.length > 0
    ? await supabase.from("user_profiles").select("user_id, display_name, full_name").in("user_id", prayerUserIds)
    : { data: [] };

  const normalizeProfiles = (profiles: any[]) =>
    (profiles || []).map((p) => ({
      id: p.user_id,
      full_name: p.display_name || p.full_name || "Membre",
    }));

  return (
    <AdminClient
      adminName={adminName}
      stats={{
        totalMembers:  totalMembers  ?? 0,
        newMembersWeek: newMembersWeek ?? 0,
        totalPosts:    totalPosts    ?? 0,
        openPrayers:   openPrayers   ?? 0,
        totalEvents:   totalEvents   ?? 0,
        totalDevotions: totalDevotions ?? 0,
      }}
      members={membersWithRole}
      posts={recentPosts ?? []}
      postProfiles={normalizeProfiles(postProfiles ?? [])}
      prayers={recentPrayers ?? []}
      prayerProfiles={normalizeProfiles(prayerProfiles ?? [])}
      devotions={(devotions ?? []).map((d: any) => ({ ...d, devotion_date: d.date }))}
      events={events ?? []}
    />
  );
}
