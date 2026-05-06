import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata = { title: "Administration — CCB" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { count: totalMembers },
    { count: newMembersWeek },
    { count: totalPosts },
    { count: openPrayers },
    { count: totalEvents },
    { count: totalDevotions },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("prayer_requests").select("*", { count: "exact", head: true }).eq("is_answered", false),
    supabase.from("events").select("*", { count: "exact", head: true }).gte("event_date", monthStart),
    supabase.from("daily_devotions").select("*", { count: "exact", head: true }),
  ]);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, spiritual_level, created_at, country, city")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, user_id, is_pinned, post_type")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: recentPrayers } = await supabase
    .from("prayer_requests")
    .select("id, title, content, is_answered, created_at, user_id, is_anonymous, category")
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: devotions } = await supabase
    .from("daily_devotions")
    .select("id, devotion_date, title, verse_reference, verse_text, meditation_p1, meditation_p2, meditation_p3, reflection_question, prayer, declaration")
    .order("devotion_date", { ascending: false })
    .limit(30);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, event_type, is_published, status")
    .order("event_date", { ascending: false })
    .limit(20);

  const postUserIds = [...new Set((recentPosts ?? []).map(p => p.user_id))];
  const { data: postProfiles } = postUserIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", postUserIds)
    : { data: [] };

  const prayerUserIds = [...new Set((recentPrayers ?? []).map(p => p.user_id))];
  const { data: prayerProfiles } = prayerUserIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", prayerUserIds)
    : { data: [] };

  return (
    <AdminClient
      adminName={profile?.full_name ?? "Admin"}
      stats={{
        totalMembers: totalMembers ?? 0,
        newMembersWeek: newMembersWeek ?? 0,
        totalPosts: totalPosts ?? 0,
        openPrayers: openPrayers ?? 0,
        totalEvents: totalEvents ?? 0,
        totalDevotions: totalDevotions ?? 0,
      }}
      members={members ?? []}
      posts={recentPosts ?? []}
      postProfiles={postProfiles ?? []}
      prayers={recentPrayers ?? []}
      prayerProfiles={prayerProfiles ?? []}
      devotions={devotions ?? []}
      events={events ?? []}
    />
  );
}
