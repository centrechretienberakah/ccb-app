import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoPlayerClient from "./VideoPlayerClient";
import type { JdtvVideo, JdtvCategory } from "@/lib/jdtv/theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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
    .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags")
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

  // Recommendations (même catégorie, autres)
  let recommendations: JdtvVideo[] = [];
  if (video.category_id) {
    const { data: recData } = await supabase
      .from("jdtv_videos")
      .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags")
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
      .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags")
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
  }

  // Premium gate
  const isPremium = !!video.is_premium;
  let canAccessPremium = !isPremium;
  if (isPremium && user) {
    try {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) {
        canAccessPremium = true;
      } else {
        try {
          const { data: profRow } = await supabase
            .from("user_profiles").select("is_premium").eq("user_id", user.id).maybeSingle();
          if ((profRow as { is_premium: boolean } | null)?.is_premium) canAccessPremium = true;
        } catch { /* noop */ }
      }
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
    />
  );
}
