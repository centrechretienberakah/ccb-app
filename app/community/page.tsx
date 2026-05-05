import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Communauté — CCB" };

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community");

  let members: any[] = [];
  let memberMilestones: Record<string, string[]> = {};
  let isAdmin = false;
  let posts: any[] = [];
  let categories: any[] = [];
  let userLikedPostIds: string[] = [];
  let userVotes: Record<string, number> = {};
  let currentUserProfile: any = null;

  try {
    // Profil courant (pour l'avatar dans PostCreator)
    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();
    currentUserProfile = myProfile;

    // Membres publics
    const { data: membersData } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, testimony")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    members = membersData || [];

    // Jalons spirituels
    const { data: milestonesData } = await supabase
      .from("spiritual_milestones")
      .select("user_id, milestone");
    for (const m of milestonesData || []) {
      if (!memberMilestones[m.user_id]) memberMilestones[m.user_id] = [];
      memberMilestones[m.user_id].push(m.milestone);
    }

    // Rôle admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    isAdmin = roleData?.role === "admin";

    // Catégories
    const { data: catData } = await supabase
      .from("post_categories")
      .select("*")
      .order("sort_order");
    categories = catData || [];

    // Posts avec profils auteurs, catégories
    const { data: postsData } = await supabase
      .from("posts")
      .select(`
        id, user_id, category_id, post_type, content,
        media_url, link_url, link_title, link_description,
        poll_options, is_pinned, created_at,
        user_profiles(display_name, avatar_url),
        post_categories(name, icon, color)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    posts = postsData || [];

    // Likes counts
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

    // Comments counts
    const { data: allComments } = await supabase
      .from("post_comments")
      .select("post_id, id, user_id, content, created_at, user_profiles(display_name, avatar_url)");
    const commentsMap: Record<string, any[]> = {};
    for (const c of allComments || []) {
      if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
      commentsMap[c.post_id].push(c);
    }

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

    // Enrichir les posts
    posts = posts.map((p) => ({
      ...p,
      likeCount: likesMap[p.id] || 0,
      comments: commentsMap[p.id] || [],
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
      userVotes={userVotes}
    />
  );
}
