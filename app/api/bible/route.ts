import { NextRequest, NextResponse } from "next/server";

// ─── Helper: fetch with timeout ───────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ─── Proxy server-side — pas de CORS, pas de blocage navigateur ───────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookNumber = searchParams.get("bookNumber");
  const bookEn = searchParams.get("bookEn");
  const chapter = searchParams.get("chapter");

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const bookNum = parseInt(bookNumber);
  const chapterNum = parseInt(chapter);
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
  };

  // ── Source 1 : jsDelivr CDN (scrollmapper/bible_databases — LSG) ─────────────
  // jsDelivr is a global CDN backed by Fastly/Cloudflare — always reachable from Vercel.
  // Format: { resultset: { row: [ { field: [book, chapter, verse, text] } ] } }
  // ~3 MB for full Bible; Next.js Data Cache reuses the response across requests.
  try {
    const url =
      "https://cdn.jsdelivr.net/gh/scrollmapper/bible_databases@master/json/t_lsg.json";
    const res = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        // Cache the full Bible JSON for 30 days in Next.js Data Cache
        next: { revalidate: 60 * 60 * 24 * 30 },
      } as RequestInit,
      25000
    );
    if (res.ok) {
      const data = await res.json();
      const rows: { field: [string, string, string, string] }[] =
        data?.resultset?.row ?? [];
      if (rows.length > 0) {
        const parsed = rows
          .filter(
            (r) =>
              parseInt(r.field[0]) === bookNum &&
              parseInt(r.field[1]) === chapterNum
          )
          .map((r) => ({
            verse: parseInt(r.field[2]),
            text: String(r.field[3]).trim().replace(/\n/g, " "),
          }))
          .filter((v) => v.text.length > 0)
          .sort((a, b) => a.verse - b.verse);
        if (parsed.length > 0) {
          return NextResponse.json(
            { verses: parsed, source: "jsdelivr" },
            { headers: cacheHeaders }
          );
        }
      }
    }
  } catch {
    // Continue to next source
  }

  // ── Source 2 : getbible.net v2 (Louis Segond natif) ──────────────────────────
  try {
    const url = `https://getbible.net/v2/lsg/${bookNumber}/${chapter}.json`;
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": "CCB-App/1.0", Accept: "application/json" } },
      8000
    );
    if (res.ok) {
      const data = await res.json();
      const raw = data.verses || {};
      const parsed = (Object.values(raw) as any[])
        .map((v) => ({
          verse: parseInt(v.verse_nr),
          text: (v.verse || "").trim().replace(/\n/g, " "),
        }))
        .filter((v) => v.text.length > 0)
        .sort((a, b) => a.verse - b.verse);
      if (parsed.length > 0) {
        return NextResponse.json(
          { verses: parsed, source: "getbible" },
          { headers: cacheHeaders }
        );
      }
    }
  } catch {
    // Continue to next source
  }

  // ── Source 3 : bible-api.com (fallback) ──────────────────────────────────────
  if (bookEn) {
    try {
      const url = `https://bible-api.com/${encodeURIComponent(bookEn)}+${chapter}?translation=lsg`;
      const res = await fetchWithTimeout(
        url,
        { headers: { "User-Agent": "CCB-App/1.0" } },
        8000
      );
      if (res.ok) {
        const data = await res.json();
        const parsed = ((data.verses || []) as any[])
          .map((v) => ({
            verse: v.verse,
            text: (v.text || "").trim().replace(/\n/g, " "),
          }))
          .filter((v) => v.text.length > 0);
        if (parsed.length > 0) {
          return NextResponse.json(
            { verses: parsed, source: "bibleapi" },
            { headers: cacheHeaders }
          );
        }
      }
    } catch {
      // All sources failed
    }
  }

  return NextResponse.json(
    { error: "Impossible de charger le chapitre depuis toutes les sources." },
    { status: 503 }
  );
}
