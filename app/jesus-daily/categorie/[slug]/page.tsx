import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";
import type { JdtvCategory, JdtvVideo, JdtvWatchProgress } from "@/lib/jdtv/theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jdtv_categories").select("name, description").eq("slug", slug).maybeSingle();
  const row = data as { name: string; description: string | null } | null;
  return {
    title: row ? `${row.name} — Jesus Daily TV` : "Jesus Daily TV",
    description: row?.description ?? undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: catRow } = await supabase
    .from("jdtv_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("slug", slug).maybeSingle();
  if (!catRow) return notFound();
  const category = catRow as JdtvCategory;

  const { data: vidData } = await supabase
    .from("jdtv_videos")
    .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id")
    .eq("category_id", category.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  const videos = (vidData ?? []) as JdtvVideo[];

  let watchlistIds: string[] = [];
  const progressMap: Record<string, JdtvWatchProgress> = {};
  if (user) {
    try {
      const { data: wl } = await supabase
        .from("jdtv_user_watchlist").select("video_id").eq("user_id", user.id);
      watchlistIds = ((wl ?? []) as Array<{ video_id: string }>).map((r) => r.video_id);
    } catch { /* noop */ }
    try {
      const ids = videos.map((v) => v.id);
      if (ids.length > 0) {
        const { data: pr } = await supabase
          .from("jdtv_user_watch_progress")
          .select("video_id, watched_secs, is_completed, last_seen_at, completed_at")
          .eq("user_id", user.id).in("video_id", ids);
        ((pr ?? []) as JdtvWatchProgress[]).forEach((p) => { progressMap[p.video_id] = p; });
      }
    } catch { /* noop */ }
  }

  return (
    <CategoryClient
      category={category}
      videos={videos}
      watchlistIds={watchlistIds}
      progressMap={progressMap}
      isAuth={Boolean(user)}
    />
  );
}
