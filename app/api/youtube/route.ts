// GET /api/youtube — 10 dernières vidéos de la chaîne CCB
// Cache : revalidation toutes les 1h (24 appels/jour max → bien sous la quota 10000)
export const revalidate = 3600;

export async function GET() {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = "UCFwp158Jrg_AKlYm6Wdg4kw";

  if (!API_KEY) {
    return Response.json(
      { error: "YOUTUBE_API_KEY non configurée" },
      { status: 503 },
    );
  }

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    "?key=" + API_KEY +
    "&channelId=" + CHANNEL_ID +
    "&part=snippet,id" +
    "&order=date" +
    "&maxResults=10";

  // next: { revalidate } met en cache la réponse côté Next.js Data Cache.
  // Tous les appels suivants dans l'heure servent le cache sans burner la quota.
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `YouTube API HTTP ${res.status}`, details: text.slice(0, 500) },
      { status: res.status },
    );
  }

  const data = await res.json();

  // CDN cache (Vercel Edge / browser) : 1h cache + 5min stale-while-revalidate
  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
