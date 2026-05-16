import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityClient from "./CommunityClient";
import type { Post, Category, CurrentUserProfile } from "./FeedClient";
import { computeXp, type MemberStats } from "@/lib/community/gamification";

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
}

interface RawComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  likeCount?: number;
  liked?: boolean;
  user_profiles?: { display_name?: string | null; avatar_url?: string | null } | null;
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Communauté — CCB" };

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community");

  let members: Member[] = [];
  const memberMilestones: Record<string, string[]> = {};
  let isAdmin = false;
  let posts: Post[] = [];
  let categories: Category[] = [];
  let userLikedPostIds: string[] = [];
  let userBookmarkedPostIds: string[] = [];
  const userVotes: Record<string, number> = {};
  let topContributors: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; xp: number }> = [];
  let pinnedSidebar: Array<{ id: string; content: string; user_id: string; display_name: string | null }> = [];
  let unreadNotifCount = 0;
  try {
    const { count } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unreadNotifCount = count ?? 0;
  } catch { /* table v13 not deployed yet */ }
  let currentUserProfile: CurrentUserProfile | null = null;

  try {
    // Profil courant (pour l'avatar dans PostCreator)
    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();
    currentUserProfile = (myProfile as CurrentUserProfile | null) ?? null;

    // Membres publics
    const { data: membersData } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, testimony")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    members = (membersData as Member[] | null) || [];

    // Jalons spirituels
    const { data: milestonesData } = await supabase
      .from("spiritual_milestones")
      .select("user_id, milestone");
    for (const m of milestonesData || []) {
      if (!memberMilestones[m.user_id]) memberMilestones[m.user_id] = [];
      memberMilestones[m.user_id].push(m.milestone);
    }

    // Role admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    isAdmin = roleData?.role === "admin" || roleData?.role === "owner";

    // Categories
    const { data: catData } = await supabase
      .from("post_categories")
      .select("*")
      .order("sort_order");
    categories = (catData as Category[] | null) || [];

    // Posts avec categories — SANS join user_profiles (pas de FK directe,
    // PostgREST retourne 400). Profils fetchés séparément ci-dessous.
    const { data: postsData } = await supabase
      .from("posts")
      .select(
        "id, user_id, category_id, post_type, post_kind, title, content, media_url, audio_url, pdf_url, link_url, link_title, link_description, poll_options, is_pinned, created_at, post_categories(name, icon, color)"
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    posts = (postsData as unknown as Post[] | null) || [];

    // Likes
    const { data: allLikes } = await supabase
      .from("post_likes")
      .select("post_id, user_id");
    const likesMap: Record<string, number> = {};
    const userLiked = new Set<string>();
    for (const l of allLikes || []) {
      likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;
      if (l.user_id === user.id) userLiked.add(l.post_id);
    }
    userLikedPostIds = [...userLiked];

    // Commentaires — SANS join user_profiles (meme raison)
    const { data: allComments } = await supabase
      .from("post_comments")
      .select("post_id, id, user_id, content, created_at, parent_comment_id");
    const typedComments = (allComments as RawComment[] | null) || [];

    // Likes commentaires
    const { data: allCommentLikes } = await supabase
      .from("post_comment_likes")
      .select("comment_id, user_id");
    const commentLikeCount: Record<string, number> = {};
    const userCommentLikes = new Set<string>();
    for (const cl of allCommentLikes || []) {
      commentLikeCount[cl.comment_id] = (commentLikeCount[cl.comment_id] || 0) + 1;
      if (cl.user_id === user.id) userCommentLikes.add(cl.comment_id);
    }

    // Enrichir les commentaires avec like count + liked
    for (const c of typedComments) {
      c.likeCount = commentLikeCount[c.id] || 0;
      c.liked = userCommentLikes.has(c.id);
    }

    const commentsMap: Record<string, RawComment[]> = {};
    for (const c of typedComments) {
      if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
      commentsMap[c.post_id].push(c);
    }

    // Bookmarks de l'utilisateur courant
    const { data: bookmarks } = await supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("user_id", user.id);
    userBookmarkedPostIds = (bookmarks ?? []).map((b: { post_id: string }) => b.post_id);

    // Poll votes
    const { data: allVotes } = await supabase
      .from("poll_votes")
      .select("post_id, user_id, option_index");
    const votesMap: Record<string, number[]> = {};
    for (const v of allVotes || []) {
      if (!votesMap[v.post_id]) votesMap[v.post_id] = [];
      votesMap[v.post_id].push(v.option_index);
      if (v.user_id === user.id) userVotes[v.post_id] = v.option_index;
    }

    // Fetch profils en batch (posts + commentaires)
    type ProfileMin = { user_id: string; display_name: string; avatar_url?: string | null };
    type Profile = { display_name: string; avatar_url?: string };
    const postUserIds = [...new Set(posts.map((p) => p.user_id))];
    const commentUserIds = [...new Set(typedComments.map((c) => c.user_id))];
    const allUserIds = [...new Set([...postUserIds, ...commentUserIds])];
    let profilesData: ProfileMin[] = [];
    if (allUserIds.length > 0) {
      const { data: pd } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", allUserIds);
      profilesData = (pd as ProfileMin[] | null) || [];
    }
    const profilesMap: Record<string, Profile> = Object.fromEntries(
      profilesData.map((p) => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url ?? undefined }])
    );

    // Enrichir commentaires avec profils
    for (const pid of Object.keys(commentsMap)) {
      commentsMap[pid] = commentsMap[pid].map((c) => ({
        ...c,
        user_profiles: profilesMap[c.user_id] ?? null,
      }));
    }

    // ── Top contributeurs (calcul XP basé sur les posts/comments/likes globaux) ──
    const allPostUserIds = posts.map((p) => p.user_id);
    const postCountByUser: Record<string, number> = {};
    const testimonyCountByUser: Record<string, number> = {};
    const prayerCountByUser: Record<string, number> = {};
    for (const p of posts) {
      postCountByUser[p.user_id] = (postCountByUser[p.user_id] || 0) + 1;
      const kind = (p as Post & { post_kind?: string | null }).post_kind;
      if (kind === "testimony") testimonyCountByUser[p.user_id] = (testimonyCountByUser[p.user_id] || 0) + 1;
      if (kind === "prayer") prayerCountByUser[p.user_id] = (prayerCountByUser[p.user_id] || 0) + 1;
    }
    const commentCountByUser: Record<string, number> = {};
    for (const c of typedComments) {
      commentCountByUser[c.user_id] = (commentCountByUser[c.user_id] || 0) + 1;
    }
    const likesReceivedByUser: Record<string, number> = {};
    for (const p of posts) {
      likesReceivedByUser[p.user_id] = (likesReceivedByUser[p.user_id] || 0) + (likesMap[p.id] || 0);
    }
    const xpByUser: Record<string, number> = {};
    const candidateUserIds = [...new Set([...allPostUserIds, ...typedComments.map((c) => c.user_id)])];
    for (const uid of candidateUserIds) {
      const stats: MemberStats = {
        posts: postCountByUser[uid] || 0,
        comments: commentCountByUser[uid] || 0,
        likesReceived: likesReceivedByUser[uid] || 0,
        testimonies: testimonyCountByUser[uid] || 0,
        prayersPosted: prayerCountByUser[uid] || 0,
        daysActive: 0,
      };
      xpByUser[uid] = computeXp(stats);
    }
    topContributors = Object.entries(xpByUser)
      .map(([uid, xp]) => ({
        user_id: uid,
        display_name: profilesMap[uid]?.display_name ?? null,
        avatar_url: profilesMap[uid]?.avatar_url ?? null,
        xp,
      }))
      .filter((c) => c.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);

    // ── Posts épinglés pour la sidebar ──
    pinnedSidebar = posts
      .filter((p) => p.is_pinned)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        content: p.content,
        user_id: p.user_id,
        display_name: profilesMap[p.user_id]?.display_name ?? null,
      }));

    const bookmarkedSet = new Set(userBookmarkedPostIds);

    // Enrichir posts avec profils + likes + comments + votes + bookmark
    posts = posts.map((p) => ({
      ...p,
      user_profiles: profilesMap[p.user_id] || undefined,
      likeCount: likesMap[p.id] || 0,
      bookmarked: bookmarkedSet.has(p.id),
      comments: (commentsMap[p.id] || []).map((c) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        parent_comment_id: c.parent_comment_id ?? null,
        likeCount: c.likeCount ?? 0,
        liked: c.liked ?? false,
        user_profiles: c.user_profiles ?? undefined,
      })),
      voteResults: votesMap[p.id] || [],
    }));
  } catch (e) {
    console.error("Community fetch error:", e);
  }

  return (
    <CommunityClient
      members={members}
      currentUserId={user.id}
      currentUserProfile={currentUserProfile}
      isAdmin={isAdmin}
      memberMilestones={memberMilestones}
      posts={posts}
      categories={categories}
      userLikedPostIds={userLikedPostIds}
      userBookmarkedPostIds={userBookmarkedPostIds}
      userVotes={userVotes}
      topContributors={topContributors}
      pinnedPosts={pinnedSidebar}
      unreadNotifCount={unreadNotifCount}
    />
  );
}
