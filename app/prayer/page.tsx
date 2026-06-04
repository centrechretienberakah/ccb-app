import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrayerClient from "./PrayerClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prions ensemble — CCB" };

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface PrayerRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  category: string | null;
  visibility: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  answered_at: string | null;
  answered_with: string | null;
  created_at: string;
}

interface CommentRaw {
  id: string;
  prayer_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default async function PrayerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/prayer");

  let prayers: Array<PrayerRow & {
    intercessionsCount: number;
    user_profiles: ProfileLite | null;
    comments: Array<CommentRaw & { user_profiles: ProfileLite | null; likeCount: number; liked: boolean }>;
  }> = [];
  let currentUserProfile: ProfileLite | null = null;
  let myIntercessedIds: string[] = [];
  let isAdmin = false;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleRow?.role as string | undefined;
    isAdmin = !!role && ["owner", "admin", "leader", "moderator"].includes(role);
  } catch { /* noop */ }

  try {
    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    currentUserProfile = (myProfile as ProfileLite | null) ?? null;

    // Prayers — fallback cascade : full → ancien schéma
    let rawPrayers: PrayerRow[] = [];
    try {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select("id, user_id, title, content, category, visibility, is_anonymous, is_answered, answered_at, answered_with, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      rawPrayers = (data ?? []) as PrayerRow[];
    } catch {
      const { data } = await supabase
        .from("prayer_requests")
        .select("id, user_id, content, is_anonymous, is_answered, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      rawPrayers = ((data ?? []) as Array<Pick<PrayerRow, "id" | "user_id" | "content" | "is_anonymous" | "is_answered" | "created_at">>).map((p) => ({
        ...p, title: null, category: null, visibility: "members",
        answered_at: null, answered_with: null,
      }));
    }

    // Intercessions
    const { data: intercessions } = await supabase
      .from("prayer_intercessions")
      .select("prayer_id, user_id");
    const interMap: Record<string, number> = {};
    const myInterSet = new Set<string>();
    for (const i of (intercessions ?? []) as Array<{ prayer_id: string; user_id: string }>) {
      interMap[i.prayer_id] = (interMap[i.prayer_id] || 0) + 1;
      if (i.user_id === user.id) myInterSet.add(i.prayer_id);
    }
    myIntercessedIds = [...myInterSet];

    // Comments
    const { data: allComments } = await supabase
      .from("prayer_comments")
      .select("id, prayer_id, user_id, content, created_at")
      .order("created_at", { ascending: true });
    const typedComments = (allComments ?? []) as CommentRaw[];

    // Likes commentaires (v15) — try/catch si table inexistante
    const commentLikesMap: Record<string, number> = {};
    const myCommentLikes = new Set<string>();
    try {
      const { data: lk } = await supabase
        .from("prayer_comment_likes")
        .select("comment_id, user_id");
      for (const l of (lk ?? []) as Array<{ comment_id: string; user_id: string }>) {
        commentLikesMap[l.comment_id] = (commentLikesMap[l.comment_id] || 0) + 1;
        if (l.user_id === user.id) myCommentLikes.add(l.comment_id);
      }
    } catch { /* table v15 not deployed yet */ }

    const commentsMap: Record<string, typeof typedComments> = {};
    for (const c of typedComments) {
      if (!commentsMap[c.prayer_id]) commentsMap[c.prayer_id] = [];
      commentsMap[c.prayer_id].push(c);
    }

    // Profiles
    const authorIds = [...new Set(rawPrayers.filter((p) => !p.is_anonymous).map((p) => p.user_id))];
    const commentAuthorIds = [...new Set(typedComments.map((c) => c.user_id))];
    const allIds = [...new Set([...authorIds, ...commentAuthorIds])];
    let profilesMap: Record<string, ProfileLite> = {};
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", allIds);
      profilesMap = Object.fromEntries(
        ((profiles ?? []) as ProfileLite[]).map((p) => [p.user_id, p]),
      );
    }

    prayers = rawPrayers.map((p) => ({
      ...p,
      intercessionsCount: interMap[p.id] || 0,
      user_profiles: p.is_anonymous ? null : (profilesMap[p.user_id] || null),
      comments: (commentsMap[p.id] ?? []).map((c) => ({
        ...c,
        user_profiles: profilesMap[c.user_id] || null,
        likeCount: commentLikesMap[c.id] || 0,
        liked: myCommentLikes.has(c.id),
      })),
    }));
  } catch (e) {
    console.error("Prayer fetch error:", e);
  }

  return (
    <PrayerClient
      prayers={prayers}
      currentUserId={user.id}
      currentUserProfile={currentUserProfile}
      myIntercessedIds={myIntercessedIds}
      isAdmin={isAdmin}
    />
  );
}
