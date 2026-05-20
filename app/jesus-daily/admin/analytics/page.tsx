import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient, {
  type VideoStat, type SpeakerStat, type CategoryEngagement, type ActivityDay, type GlobalKpis,
} from "./AnalyticsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Jesus Daily TV" };

const EMPTY_KPIS: GlobalKpis = {
  published_videos: 0, live_now: 0, premium_videos: 0,
  total_views: 0, total_comments: 0, total_reactions: 0,
  unique_viewers_rows: 0, watchlist_total: 0, unique_viewers: 0,
  published_categories: 0,
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/jesus-daily/admin/analytics");

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect("/jesus-daily/admin");
  }

  // Best-effort fetch — if SQL v31 pas encore exécuté, on renvoie données vides
  let kpis: GlobalKpis = EMPTY_KPIS;
  let topVideos: VideoStat[] = [];
  let topCompletion: VideoStat[] = [];
  let speakers: SpeakerStat[] = [];
  let activity: ActivityDay[] = [];
  let catEngagement: CategoryEngagement[] = [];
  let sqlReady = true;

  try {
    const { data, error } = await supabase.from("jdtv_global_kpis").select("*").maybeSingle();
    if (error) sqlReady = false;
    else if (data) kpis = data as GlobalKpis;
  } catch { sqlReady = false; }

  if (sqlReady) {
    try {
      const { data: tv } = await supabase
        .from("jdtv_video_stats")
        .select("video_id, slug, title, speaker, view_count, viewers, completed_viewers, completion_pct, comment_count, reaction_count, is_live, is_premium")
        .order("view_count", { ascending: false })
        .limit(10);
      topVideos = (tv ?? []) as VideoStat[];
    } catch { /* noop */ }

    try {
      const { data: tc } = await supabase
        .from("jdtv_video_stats")
        .select("video_id, slug, title, speaker, view_count, viewers, completed_viewers, completion_pct, comment_count, reaction_count, is_live, is_premium")
        .gt("viewers", 0)
        .order("completion_pct", { ascending: false })
        .limit(10);
      topCompletion = (tc ?? []) as VideoStat[];
    } catch { /* noop */ }

    try {
      const { data: sp } = await supabase
        .from("jdtv_top_speakers").select("*").limit(10);
      speakers = (sp ?? []) as SpeakerStat[];
    } catch { /* noop */ }

    try {
      const { data: act } = await supabase
        .from("jdtv_activity_30d").select("*");
      activity = (act ?? []) as ActivityDay[];
    } catch { /* noop */ }

    try {
      const { data: ce } = await supabase
        .from("jdtv_category_engagement").select("*");
      catEngagement = (ce ?? []) as CategoryEngagement[];
    } catch { /* noop */ }
  }

  return (
    <AnalyticsClient
      kpis={kpis}
      topVideos={topVideos}
      topCompletion={topCompletion}
      speakers={speakers}
      activity={activity}
      catEngagement={catEngagement}
      sqlReady={sqlReady}
    />
  );
}
