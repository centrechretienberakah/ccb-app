import { createClient } from "@/lib/supabase/server";
import JdtvHomeClient from "./JdtvHomeClient";
import type { JdtvCategory, JdtvVideo, JdtvWatchProgress } from "@/lib/jdtv/theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jesus Daily TV — Centre Chrétien Berakah",
  description: "Prédications, podcasts, worship, témoignages et live — la TV chrétienne premium CCB.",
};

interface ContinueWatchRow {
  video_id: string;
  watched_secs: number;
  is_completed: boolean;
  last_seen_at: string;
  completed_at: string | null;
}

export default async function JesusDailyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Catégories publiées
  const { data: catData } = await supabase
    .from("jdtv_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("is_published", true)
    .order("order_index", { ascending: true });
  const categories = (catData ?? []) as JdtvCategory[];

  // Toutes les vidéos publiées
  const { data: vidData } = await supabase
    .from("jdtv_videos")
    .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(200);
  const videos = (vidData ?? []) as JdtvVideo[];

  // Hero featured (live > featured > most recent)
  const liveNow = videos.find((v) => v.is_live) ?? null;
  const featured = liveNow ?? videos.find((v) => v.is_featured) ?? videos[0] ?? null;

  // Watchlist + progress
  let watchlistIds: string[] = [];
  let progress: JdtvWatchProgress[] = [];
  let continueVideos: JdtvVideo[] = [];
  if (user) {
    try {
      const { data: wlData } = await supabase
        .from("jdtv_user_watchlist")
        .select("video_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      watchlistIds = (wlData ?? []).map((r) => (r as { video_id: string }).video_id);
    } catch { /* table peut-être pas encore migrée */ }

    try {
      const { data: prData } = await supabase
        .from("jdtv_user_watch_progress")
        .select("video_id, watched_secs, is_completed, last_seen_at, completed_at")
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false })
        .limit(20);
      progress = ((prData ?? []) as ContinueWatchRow[]).map((r) => ({
        video_id: r.video_id,
        watched_secs: r.watched_secs,
        is_completed: r.is_completed,
        last_seen_at: r.last_seen_at,
        completed_at: r.completed_at,
      }));
      const continueIds = progress.filter((p) => !p.is_completed && p.watched_secs > 5).map((p) => p.video_id);
      continueVideos = continueIds
        .map((id) => videos.find((v) => v.id === id))
        .filter((v): v is JdtvVideo => Boolean(v))
        .slice(0, 10);
    } catch { /* noop */ }
  }

  // Mes favoris (watchlist) → vidéos
  const watchlistVideos = watchlistIds
    .map((id) => videos.find((v) => v.id === id))
    .filter((v): v is JdtvVideo => Boolean(v));

  // Detect admin
  let isAdmin = false;
  if (user) {
    try {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) isAdmin = true;
    } catch { /* noop */ }
  }

  return (
    <JdtvHomeClient
      featured={featured}
      categories={categories}
      videos={videos}
      watchlistIds={watchlistIds}
      watchlistVideos={watchlistVideos}
      continueVideos={continueVideos}
      progress={progress}
      isAdmin={isAdmin}
      isAuth={Boolean(user)}
    />
  );
}
