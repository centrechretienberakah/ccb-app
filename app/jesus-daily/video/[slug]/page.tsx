import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoPlayerClient from "./VideoPlayerClient";
import type { JdtvVideo, JdtvCategory } from "@/lib/jdtv/theme";
import type { CommentItem } from "./CommentsSection";
import type { LiveMessage } from "./LiveChat";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Reaction = "clap" | "love" | "pray" | "fire" | "sparkle";
const REACTIONS: Reaction[] = ["clap", "love", "pray", "fire", "sparkle"];
function emptyCounts(): Record<Reaction, number> {
  return { clap: 0, love: 0, pray: 0, fire: 0, sparkle: 0 };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jdtv_videos").select("title, subtitle, thumbnail_url").eq("slug", slug).maybeSingle();
  const row = data as { title: string; subtitle: string | null; thumbnail_url: string | null } | null;
  return {
    title: row ? `${row.title} — Jesus Daily TV` : "Jesus Daily TV",
    description: row?.subtitle ?? undefined,
    openGraph: row?.thumbnail_url ? { images: [{ url: row.thumbnail_url }] } : undefined,
  };
}

export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: vidData } = await supabase
    .from("jdtv_videos")
    .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id, chapters, transcript_md")
    .eq("slug", slug).maybeSingle();
  if (!vidData) return notFound();
  const video = vidData as JdtvVideo;

  // Catégorie
  let category: JdtvCategory | null = null;
  if (video.category_id) {
    const { data: catData } = await supabase
      .from("jdtv_categories")
      .select("id, slug, name, description, icon, cover_url, order_index, is_published")
      .eq("id", video.category_id).maybeSingle();
    category = (catData ?? null) as JdtvCategory | null;
  }

  // Recommendations
  let recommendations: JdtvVideo[] = [];
  if (video.category_id) {
    const { data: recData } = await supabase
      .from("jdtv_videos")
      .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id, chapters, transcript_md")
      .eq("category_id", video.category_id)
      .eq("is_published", true)
      .neq("id", video.id)
      .order("published_at", { ascending: false })
      .limit(12);
    recommendations = (recData ?? []) as JdtvVideo[];
  }
  if (recommendations.length < 6) {
    const { data: extra } = await supabase
      .from("jdtv_videos")
      .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id, chapters, transcript_md")
      .eq("is_published", true)
      .neq("id", video.id)
      .order("published_at", { ascending: false })
      .limit(12);
    const existing = new Set(recommendations.map((r) => r.id));
    ((extra ?? []) as JdtvVideo[]).forEach((v) => {
      if (!existing.has(v.id)) recommendations.push(v);
    });
    recommendations = recommendations.slice(0, 12);
  }

  // Watchlist + progress
  let isInWatchlist = false;
  let watchedSecs = 0;
  let isStaff = false;
  if (user) {
    try {
      const { data: wlRow } = await supabase
        .from("jdtv_user_watchlist").select("id").eq("user_id", user.id).eq("video_id", video.id).maybeSingle();
      isInWatchlist = Boolean(wlRow);
    } catch { /* noop */ }
    try {
      const { data: progRow } = await supabase
        .from("jdtv_user_watch_progress")
        .select("watched_secs, is_completed")
        .eq("user_id", user.id).eq("video_id", video.id).maybeSingle();
      const p = progRow as { watched_secs: number; is_completed: boolean } | null;
      if (p && !p.is_completed) watchedSecs = p.watched_secs;
    } catch { /* noop */ }
    try {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) isStaff = true;
    } catch { /* noop */ }
  }

  // Premium gate
  const isPremium = !!video.is_premium;
  let canAccessPremium = !isPremium;
  if (isPremium && user) {
    if (isStaff) canAccessPremium = true;
    else {
      try {
        const { data: profRow } = await supabase
          .from("user_profiles").select("is_premium").eq("user_id", user.id).maybeSingle();
        if ((profRow as { is_premium: boolean } | null)?.is_premium) canAccessPremium = true;
      } catch { /* noop */ }
    }
  }

  // ─── Phase 3 : commentaires, réactions, live messages ────────────
  // Commentaires (tous)
  let initialComments: CommentItem[] = [];
  let initialLikedIds: string[] = [];
  try {
    const { data: cData } = await supabase
      .from("jdtv_comments")
      .select("id, user_id, parent_id, body, like_count, is_pinned, created_at")
      .eq("video_id", video.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (cData ?? []) as Array<Omit<CommentItem, "user_display_name" | "user_avatar_url">>;
    // Fetch profiles in bulk
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let profMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      ((profs ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>).forEach((p) => {
        profMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
      });
    }
    initialComments = rows.map((r) => ({
      id: r.id, user_id: r.user_id, parent_id: r.parent_id,
      body: r.body, like_count: r.like_count, is_pinned: r.is_pinned, created_at: r.created_at,
      user_display_name: profMap.get(r.user_id)?.display_name ?? null,
      user_avatar_url: profMap.get(r.user_id)?.avatar_url ?? null,
    }));
    // Likes utilisateur
    if (user && rows.length > 0) {
      const { data: likes } = await supabase
        .from("jdtv_comment_likes").select("comment_id").eq("user_id", user.id)
        .in("comment_id", rows.map((r) => r.id));
      initialLikedIds = ((likes ?? []) as Array<{ comment_id: string }>).map((l) => l.comment_id);
    }
  } catch { /* tables Phase 3 pas encore migrées */ }

  // Reactions counts + user choice
  const reactionCounts = emptyCounts();
  let userReaction: Reaction | null = null;
  try {
    const { data: rc } = await supabase
      .from("jdtv_video_reaction_counts").select("reaction, count").eq("video_id", video.id);
    ((rc ?? []) as Array<{ reaction: Reaction; count: number }>).forEach((row) => {
      if (REACTIONS.includes(row.reaction)) reactionCounts[row.reaction] = row.count;
    });
    if (user) {
      const { data: myReact } = await supabase
        .from("jdtv_video_reactions").select("reaction")
        .eq("user_id", user.id).eq("video_id", video.id).maybeSingle();
      userReaction = ((myReact as { reaction: Reaction } | null)?.reaction) ?? null;
    }
  } catch { /* noop */ }

  // Live messages (uniquement si is_live)
  let initialLiveMessages: LiveMessage[] = [];
  if (video.is_live) {
    try {
      const { data: lm } = await supabase
        .from("jdtv_live_messages")
        .select("id, user_id, body, created_at")
        .eq("video_id", video.id)
        .order("created_at", { ascending: true })
        .limit(100);
      const rows = (lm ?? []) as Array<{ id: string; user_id: string; body: string; created_at: string }>;
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      let profMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        ((profs ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>).forEach((p) => {
          profMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url });
        });
      }
      initialLiveMessages = rows.map((r) => ({
        id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at,
        user_display_name: profMap.get(r.user_id)?.display_name ?? null,
        user_avatar_url: profMap.get(r.user_id)?.avatar_url ?? null,
      }));
    } catch { /* noop */ }
  }

  return (
    <VideoPlayerClient
      video={video}
      category={category}
      recommendations={recommendations}
      isInWatchlist={isInWatchlist}
      watchedSecs={watchedSecs}
      canAccessPremium={canAccessPremium}
      isAuth={Boolean(user)}
      currentUserId={user?.id ?? null}
      isStaff={isStaff}
      initialComments={initialComments}
      initialLikedIds={initialLikedIds}
      reactionCounts={reactionCounts}
      userReaction={userReaction}
      initialLiveMessages={initialLiveMessages}
    />
  );
}
