/**
 * Outils externes de BERAKAH AI (réseaux sociaux & web).
 * Tout est best-effort + derrière des variables d'env : si une intégration n'est
 * pas configurée, la fonction renvoie null et l'IA continue sans (zéro erreur).
 *
 * Variables d'env (toutes optionnelles) :
 *   YOUTUBE_API_KEY (CHANNEL_ID par défaut = chaîne CCB)  → dernières vidéos JESUS DAILY TV
 *   BRAVE_API_KEY                               → recherche web (sinon repli DuckDuckGo)
 *   FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN → dernières publications Facebook
 *   INSTAGRAM_ACCESS_TOKEN / TIKTOK_ACCESS_TOKEN → réservés (à venir)
 */

// Chaîne YouTube officielle du CCB (JESUS DAILY TV) — déjà utilisée par /api/youtube.
const CCB_YOUTUBE_CHANNEL_ID = "UCFwp158Jrg_AKlYm6Wdg4kw";

const deburr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ── YouTube (JESUS DAILY TV) ──────────────────────────────────────────────────
export interface YtVideo { title: string; url: string; publishedAt: string; description: string }
let ytCache: { at: number; items: YtVideo[] } | null = null;

export async function fetchLatestYouTube(max = 5): Promise<YtVideo[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  const channel = process.env.YOUTUBE_CHANNEL_ID || CCB_YOUTUBE_CHANNEL_ID;
  if (!key) return null;
  if (ytCache && Date.now() - ytCache.at < 30 * 60 * 1000) return ytCache.items.slice(0, max);
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${key}&channelId=${channel}&part=snippet&order=date&type=video&maxResults=8`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }> };
    const items: YtVideo[] = (data.items ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({
        title: it.snippet?.title ?? "Vidéo",
        url: `https://youtu.be/${it.id!.videoId}`,
        publishedAt: it.snippet?.publishedAt ?? "",
        description: (it.snippet?.description ?? "").slice(0, 200),
      }));
    if (items.length) ytCache = { at: Date.now(), items };
    return items.slice(0, max);
  } catch { return null; }
}

// ── Recherche web (Brave, repli DuckDuckGo) ───────────────────────────────────
export interface WebResult { title: string; url: string; snippet: string }

export async function webSearch(query: string, max = 5): Promise<WebResult[] | null> {
  const q = query.slice(0, 200).trim();
  if (!q) return null;

  const brave = process.env.BRAVE_API_KEY;
  if (brave) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${max}`, {
        headers: { Accept: "application/json", "X-Subscription-Token": brave },
      });
      if (res.ok) {
        const data = await res.json() as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } };
        const items = (data.web?.results ?? []).slice(0, max).map((r) => ({
          title: r.title ?? "", url: r.url ?? "",
          snippet: (r.description ?? "").replace(/<[^>]+>/g, "").slice(0, 220),
        }));
        if (items.length) return items;
      }
    } catch { /* repli ci-dessous */ }
  }

  // Repli DuckDuckGo Instant Answer (sans clé, limité aux réponses instantanées).
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1`);
    if (res.ok) {
      const data = await res.json() as { AbstractText?: string; AbstractURL?: string; Heading?: string; RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> };
      const out: WebResult[] = [];
      if (data.AbstractText) out.push({ title: data.Heading || q, url: data.AbstractURL || "", snippet: data.AbstractText.slice(0, 220) });
      for (const t of data.RelatedTopics ?? []) {
        if (out.length >= max) break;
        if (t.Text && t.FirstURL) out.push({ title: t.Text.slice(0, 80), url: t.FirstURL, snippet: t.Text.slice(0, 220) });
      }
      return out.length ? out : null;
    }
  } catch { /* noop */ }
  return null;
}

// ── Facebook (page CCB) — best-effort si token présent ────────────────────────
export interface FbPost { message: string; url: string; createdAt: string }
export async function fetchLatestFacebook(max = 3): Promise<FbPost[] | null> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return null;
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=message,permalink_url,created_time&limit=${max}&access_token=${token}`);
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ message?: string; permalink_url?: string; created_time?: string }> };
    return (data.data ?? [])
      .filter((p) => p.message)
      .map((p) => ({ message: (p.message ?? "").slice(0, 240), url: p.permalink_url ?? "", createdAt: p.created_time ?? "" }));
  } catch { return null; }
}

// ── État des connexions (pour l'admin) ────────────────────────────────────────
export function aiConnections() {
  return {
    youtube: !!process.env.YOUTUBE_API_KEY, // CHANNEL_ID a une valeur par défaut (chaîne CCB)
    web: !!process.env.BRAVE_API_KEY, // DuckDuckGo reste dispo en repli (limité)
    facebook: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    tiktok: !!process.env.TIKTOK_ACCESS_TOKEN,
  };
}

// ── Détection d'intention (déclenche les outils, sans appel LLM supplémentaire) ─
export function detectIntents(text: string) {
  const t = deburr(text);
  return {
    youtube: /\b(youtube|you tube|derniere video|dernier direct|derniere emission|derniere predication|chaine|en direct|video recente|replay|live)\b/.test(t),
    facebook: /\b(facebook|page facebook|derniere publication|dernier post|sur facebook)\b/.test(t),
    web: /\b(cherche sur internet|recherche sur le web|sur le web|sur internet|actualite|actualites|google|recherche web|info recente|derniere actualite|que se passe)\b/.test(t),
  };
}

// ── Construit le bloc de contexte externe à injecter dans le prompt ────────────
export async function buildExternalContext(query: string): Promise<string> {
  const intents = detectIntents(query);
  if (!intents.youtube && !intents.facebook && !intents.web) return "";
  const blocks: string[] = [];

  if (intents.youtube) {
    const vids = await fetchLatestYouTube(5);
    if (vids?.length) {
      blocks.push("DERNIÈRES VIDÉOS — JESUS DAILY TV (YouTube) :\n" +
        vids.map((v, i) => `[${i + 1}] ${v.title}${v.publishedAt ? ` (${v.publishedAt.slice(0, 10)})` : ""} — ${v.url}`).join("\n"));
    }
  }
  if (intents.facebook) {
    const posts = await fetchLatestFacebook(3);
    if (posts?.length) {
      blocks.push("DERNIÈRES PUBLICATIONS — Facebook CCB :\n" +
        posts.map((p, i) => `[${i + 1}] ${p.message} — ${p.url}`).join("\n"));
    }
  }
  if (intents.web) {
    const results = await webSearch(query, 5);
    if (results?.length) {
      blocks.push("RÉSULTATS WEB (à utiliser avec DISCERNEMENT et esprit critique, APRÈS les Écritures et les contenus CCB ; cite la source) :\n" +
        results.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`).join("\n"));
    }
  }

  if (!blocks.length) return "";
  return "\n\nSOURCES EXTERNES (ordre de priorité : contenus CCB > Bible > web) :\n" + blocks.join("\n\n");
}
