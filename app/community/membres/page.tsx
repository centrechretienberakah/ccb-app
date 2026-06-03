import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MembersClient from "./MembersClient";
import CommunityTabs from "../CommunityTabs";
import { computeXp, type MemberStats } from "@/lib/community/gamification";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membres — Communauté CCB" };

export interface MemberLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  milestones: string[];
  stats: MemberStats;
  xp: number;
  role: string | null;        // owner/admin/leader/moderator/premium_member/member
  followers: number;
  following: number;
  isFollowing: boolean;       // l'utilisateur courant suit-il ce membre
}

export default async function MembresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/membres");

  // Vérifie le rôle (admin OK pour mode édition)
  let isAdmin = false;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleRow?.role as string | undefined;
    isAdmin = !!role && ["owner", "admin", "leader", "moderator"].includes(role);
  } catch { /* noop */ }

  // Tous les profils publics (cascade : city/country/last_seen peuvent ne pas
  // exister dans certains schémas — on tente plein puis on retombe sur minimal)
  let profileRows: Array<{
    user_id: string; display_name: string | null; avatar_url: string | null;
    bio: string | null; cell_group: string | null;
    city: string | null; country: string | null;
    created_at: string | null; last_seen_at: string | null;
  }> = [];
  try {
    const { data: full, error } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, city, country, created_at, last_seen_at, is_public")
      .eq("is_public", true);
    if (error) throw error;
    profileRows = (full ?? []) as typeof profileRows;
  } catch {
    const { data: minimal } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, is_public")
      .eq("is_public", true);
    profileRows = (minimal ?? []).map((p) => ({
      user_id: (p as { user_id: string }).user_id,
      display_name: (p as { display_name: string | null }).display_name,
      avatar_url: (p as { avatar_url: string | null }).avatar_url,
      bio: (p as { bio: string | null }).bio,
      cell_group: (p as { cell_group: string | null }).cell_group,
      city: null, country: null, created_at: null, last_seen_at: null,
    }));
  }

  const userIds = profileRows.map((p) => p.user_id);
  if (userIds.length === 0) {
    return (
      <>
        <CommunityTabs />
        <MembersClient members={[]} currentUserId={user.id} isAdmin={isAdmin} />
      </>
    );
  }

  // ── Rôles par membre (admin/leader/premium…) ──
  const roleMap: Record<string, string> = {};
  try {
    const { data: roles } = await supabase
      .from("user_roles").select("user_id, role").in("user_id", userIds);
    for (const r of (roles ?? []) as Array<{ user_id: string; role: string }>) {
      roleMap[r.user_id] = r.role;
    }
  } catch { /* noop */ }

  // ── Abonnements : compteurs par membre + qui je suis ──
  const followersCount: Record<string, number> = {};
  const followingCount: Record<string, number> = {};
  const myFollowing = new Set<string>();
  try {
    const { data: follows } = await supabase
      .from("follows").select("follower_id, following_id").limit(20000);
    for (const f of (follows ?? []) as Array<{ follower_id: string; following_id: string }>) {
      followersCount[f.following_id] = (followersCount[f.following_id] || 0) + 1;
      followingCount[f.follower_id] = (followingCount[f.follower_id] || 0) + 1;
      if (f.follower_id === user.id) myFollowing.add(f.following_id);
    }
  } catch { /* table v52 pas migrée → 0 partout */ }

  // Jalons spirituels
  const { data: milestonesData } = await supabase
    .from("spiritual_milestones")
    .select("user_id, milestone")
    .in("user_id", userIds);
  const milestonesByUser: Record<string, string[]> = {};
  for (const m of (milestonesData ?? []) as Array<{ user_id: string; milestone: string }>) {
    (milestonesByUser[m.user_id] = milestonesByUser[m.user_id] || []).push(m.milestone);
  }

  // Stats : posts, comments, likes reçus, témoignages, prières
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

  const postCount: Record<string, number> = {};
  const testimonyCount: Record<string, number> = {};
  const prayerCount: Record<string, number> = {};
  const postsByUser: Record<string, string[]> = {};
  for (const p of (postsAll ?? []) as Array<{ user_id: string; post_kind: string | null }>) {
    postCount[p.user_id] = (postCount[p.user_id] || 0) + 1;
    if (p.post_kind === "testimony") testimonyCount[p.user_id] = (testimonyCount[p.user_id] || 0) + 1;
    if (p.post_kind === "prayer") prayerCount[p.user_id] = (prayerCount[p.user_id] || 0) + 1;
  }
  const { data: postIdMap } = await supabase
    .from("posts")
    .select("id, user_id")
    .in("user_id", userIds);
  for (const p of (postIdMap ?? []) as Array<{ id: string; user_id: string }>) {
    (postsByUser[p.user_id] = postsByUser[p.user_id] || []).push(p.id);
  }
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
      city: p.city,
      country: p.country,
      created_at: p.created_at,
      last_seen_at: p.last_seen_at,
      milestones: milestonesByUser[p.user_id] || [],
      stats,
      xp: computeXp(stats),
      role: roleMap[p.user_id] ?? null,
      followers: followersCount[p.user_id] ?? 0,
      following: followingCount[p.user_id] ?? 0,
      isFollowing: myFollowing.has(p.user_id),
    };
  });

  members.sort((a, b) => b.xp - a.xp);

  return (
    <>
      <CommunityTabs />
      <MembersClient members={members} currentUserId={user.id} isAdmin={isAdmin} />
    </>
  );
}
