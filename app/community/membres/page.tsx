import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MembersClient from "./MembersClient";
import { computeXp, type MemberStats } from "@/lib/community/gamification";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membres — Communauté CCB" };

export interface MemberLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  stats: MemberStats;
  xp: number;
}

export default async function MembresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/membres");

  // Tous les profils publics
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, bio, cell_group, is_public")
    .eq("is_public", true);
  const profileRows = (profiles ?? []) as Array<{
    user_id: string; display_name: string | null; avatar_url: string | null;
    bio: string | null; cell_group: string | null;
  }>;

  // Stats par membre (posts, comments, likes reçus, testimonies, prayers)
  const userIds = profileRows.map((p) => p.user_id);
  if (userIds.length === 0) {
    return <MembersClient members={[]} currentUserId={user.id} />;
  }

  const [{ data: postsAll }, { data: commentsAll }, { data: likesAll }] = await Promise.all([
    supabase.from("posts")
      .select("user_id, post_kind")
      .in("user_id", userIds),
    supabase.from("post_comments")
      .select("user_id")
      .in("user_id", userIds),
    supabase.from("post_likes")
      .select("post_id"),
  ]);

  // Compteurs par user_id
  const postCount: Record<string, number> = {};
  const testimonyCount: Record<string, number> = {};
  const prayerCount: Record<string, number> = {};
  const postsByUser: Record<string, string[]> = {}; // user_id → post_ids
  for (const p of (postsAll ?? []) as Array<{ user_id: string; post_kind: string | null }>) {
    postCount[p.user_id] = (postCount[p.user_id] || 0) + 1;
    if (p.post_kind === "testimony") testimonyCount[p.user_id] = (testimonyCount[p.user_id] || 0) + 1;
    if (p.post_kind === "prayer") prayerCount[p.user_id] = (prayerCount[p.user_id] || 0) + 1;
  }
  // Posts par user pour map likes
  const { data: postIdMap } = await supabase
    .from("posts")
    .select("id, user_id")
    .in("user_id", userIds);
  for (const p of (postIdMap ?? []) as Array<{ id: string; user_id: string }>) {
    (postsByUser[p.user_id] = postsByUser[p.user_id] || []).push(p.id);
  }

  // Likes reçus par user (somme des likes sur ses posts)
  const likesByPostId: Record<string, number> = {};
  for (const l of (likesAll ?? []) as Array<{ post_id: string }>) {
    likesByPostId[l.post_id] = (likesByPostId[l.post_id] || 0) + 1;
  }
  const likesReceived: Record<string, number> = {};
  for (const uid of userIds) {
    let total = 0;
    for (const pid of (postsByUser[uid] || [])) total += likesByPostId[pid] || 0;
    likesReceived[uid] = total;
  }

  const commentCount: Record<string, number> = {};
  for (const c of (commentsAll ?? []) as Array<{ user_id: string }>) {
    commentCount[c.user_id] = (commentCount[c.user_id] || 0) + 1;
  }

  const members: MemberLite[] = profileRows.map((p) => {
    const stats: MemberStats = {
      posts: postCount[p.user_id] || 0,
      comments: commentCount[p.user_id] || 0,
      likesReceived: likesReceived[p.user_id] || 0,
      testimonies: testimonyCount[p.user_id] || 0,
      prayersPosted: prayerCount[p.user_id] || 0,
      daysActive: 0,
    };
    return {
      user_id: p.user_id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      bio: p.bio,
      cell_group: p.cell_group,
      stats,
      xp: computeXp(stats),
    };
  });

  // Tri par XP descendant
  members.sort((a, b) => b.xp - a.xp);

  return <MembersClient members={members} currentUserId={user.id} />;
}
