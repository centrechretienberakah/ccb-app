import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { computeXp, type MemberStats } from "@/lib/community/gamification";

export const dynamic = "force-dynamic";

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
  is_public: boolean;
}

interface RecentPost {
  id: string;
  content: string;
  post_kind: string | null;
  created_at: string;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("user_profiles").select("display_name").eq("user_id", id).maybeSingle();
  const name = (p?.display_name as string | undefined) || "Profil";
  return { title: `${name} — Communauté CCB` };
}

export default async function ProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/profil/${id}`);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, bio, cell_group, testimony, is_public")
    .eq("user_id", id)
    .maybeSingle();
  if (!profile) return notFound();
  const p = profile as ProfileRow;

  // Stats
  const [
    { count: postCount },
    { count: commentCount },
    { count: testimonyCount },
    { count: prayerCount },
    { data: myPosts },
  ] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id).eq("post_kind", "testimony"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id).eq("post_kind", "prayer"),
    supabase.from("posts").select("id, content, post_kind, created_at").eq("user_id", id)
      .order("created_at", { ascending: false }).limit(5),
  ]);

  // Likes reçus (somme des likes sur ses posts)
  let likesReceived = 0;
  if (postCount && postCount > 0) {
    const { data: ids } = await supabase.from("posts").select("id").eq("user_id", id);
    const postIds = (ids ?? []).map((x: { id: string }) => x.id);
    if (postIds.length > 0) {
      const { count } = await supabase.from("post_likes")
        .select("id", { count: "exact", head: true })
        .in("post_id", postIds);
      likesReceived = count ?? 0;
    }
  }

  // Jalons spirituels
  const { data: milestones } = await supabase
    .from("spiritual_milestones")
    .select("milestone")
    .eq("user_id", id);
  const milestoneList = (milestones ?? []).map((m: { milestone: string }) => m.milestone);

  const stats: MemberStats = {
    posts: postCount ?? 0,
    comments: commentCount ?? 0,
    likesReceived,
    testimonies: testimonyCount ?? 0,
    prayersPosted: prayerCount ?? 0,
    daysActive: 0,
  };
  const xp = computeXp(stats);

  return (
    <ProfileClient
      profile={p}
      stats={stats}
      xp={xp}
      milestones={milestoneList}
      recentPosts={(myPosts ?? []) as RecentPost[]}
      isMe={p.user_id === user.id}
    />
  );
}
