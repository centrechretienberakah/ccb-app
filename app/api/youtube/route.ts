// GET /api/youtube
// Renvoie les 10 dernières vidéos de la chaîne CCB ENRICHIES avec :
//   - durée (contentDetails.duration → secondes)
//   - vues (statistics.viewCount)
//   - état live (snippet.liveBroadcastContent : "live" | "upcoming" | "none")
//
// 2 appels combinés à la YouTube Data API v3 :
//   1) search.list (100 unités) → récupère les videoIds
//   2) videos.list (1 unité) batch → enrichit avec durée/vues
//
// Cache : 1h (24 appels/jour max → bien sous la quota 10000)
export const revalidate = 3600;

interface YouTubeThumb { url: string; width?: number; height?: number }
interface RawSearchItem {
  id: { kind: string; videoId?: string };
  snippet: {
    publishedAt: string;
    title: string;
    description: string;
    thumbnails?: Record<string, YouTubeThumb>;
    channelTitle?: string;
    liveBroadcastContent?: "live" | "upcoming" | "none";
  };
}
interface RawVideoItem {
  id: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string };
  snippet?: { liveBroadcastContent?: "live" | "upcoming" | "none" };
}

/** Parse ISO 8601 PT15M33S → secondes (3600+15*60+33 = …). */
function parseDurationToSecs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] || "0", 10);
  const mi = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + mi * 60 + s;
}

export async function GET() {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = "UCFwp158Jrg_AKlYm6Wdg4kw";

  if (!API_KEY) {
    return Response.json(
      { error: "YOUTUBE_API_KEY non configurée" },
      { status: 503 },
    );
  }

  // ─── 1) search.list ────────────────────────────────────────────────
  const searchUrl =
    "https://www.googleapis.com/youtube/v3/search" +
    "?key=" + API_KEY +
    "&channelId=" + CHANNEL_ID +
    "&part=snippet,id" +
    "&order=date" +
    "&maxResults=10";

  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
  if (!searchRes.ok) {
    const text = await searchRes.text();
    return Response.json(
      { error: `YouTube search HTTP ${searchRes.status}`, details: text.slice(0, 500) },
      { status: searchRes.status },
    );
  }
  const searchData = await searchRes.json() as { items?: RawSearchItem[] };
  const items = (searchData.items ?? []).filter((it) => it.id?.videoId);

  // ─── 2) videos.list (batch) pour enrichir avec duration + stats ────
  const videoIds = items.map((it) => it.id.videoId!).filter(Boolean);
  const detailsById = new Map<string, { durationSecs: number | null; viewCount: number | null; liveStatus: "live" | "upcoming" | "none" }>();

  if (videoIds.length > 0) {
    const videosUrl =
      "https://www.googleapis.com/youtube/v3/videos" +
      "?key=" + API_KEY +
      "&id=" + videoIds.join(",") +
      "&part=contentDetails,statistics,snippet";
    const videosRes = await fetch(videosUrl, { next: { revalidate: 3600 } });
    if (videosRes.ok) {
      const videosData = await videosRes.json() as { items?: RawVideoItem[] };
      for (const v of (videosData.items ?? [])) {
        detailsById.set(v.id, {
          durationSecs: parseDurationToSecs(v.contentDetails?.duration),
          viewCount: v.statistics?.viewCount ? parseInt(v.statistics.viewCount, 10) : null,
          liveStatus: v.snippet?.liveBroadcastContent ?? "none",
        });
      }
    }
  }

  // ─── 3) Réponse enrichie ───────────────────────────────────────────
  const enriched = items.map((it) => {
    const det = detailsById.get(it.id.videoId!);
    return {
      ...it,
      durationSecs: det?.durationSecs ?? null,
      viewCount: det?.viewCount ?? null,
      liveStatus: det?.liveStatus ?? (it.snippet.liveBroadcastContent ?? "none"),
    };
  });

  return Response.json(
    { items: enriched, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } },
  );
}
