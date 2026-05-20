import { createClient } from "@/lib/supabase/server";
import SearchClient from "./SearchClient";
import type { JdtvCategory, JdtvVideo, JdtvWatchProgress } from "@/lib/jdtv/theme";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recherche — Jesus Daily TV",
  description: "Recherche par titre, intervenant, catégorie, verset…",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; type?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").toString().trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: catData } = await supabase
    .from("jdtv_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("is_published", true)
    .order("order_index", { ascending: true });
  const categories = (catData ?? []) as JdtvCategory[];

  // Fetch all videos published (limit raisonnable). Filtrage côté client.
  const { data: vidData } = await supabase
    .from("jdtv_videos")
    .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(500);
  const videos = (vidData ?? []) as JdtvVideo[];

  let watchlistIds: string[] = [];
  let progressMap: Record<string, JdtvWatchProgress> = {};
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
    <SearchClient
      initialQuery={q}
      initialCategorySlug={params?.cat ?? ""}
      categories={categories}
      videos={videos}
      watchlistIds={watchlistIds}
      progressMap={progressMap}
      isAuth={Boolean(user)}
    />
  );
}
