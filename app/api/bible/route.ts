import { NextRequest, NextResponse } from "next/server";

async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const CACHE = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" };

async function fetchGitHubLSG(bookNumber: number, chapter: number) {
  const padded = String(bookNumber).padStart(2, "0");
  const url = `https://raw.githubusercontent.com/Mikenslywed/Bible-Francais-Louis-Segond/main/${padded}.json`;
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 7 },
  } as RequestInit, 10000);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = await res.json();
  const ch = (data.chapters as any[]).find((c) => c.chapter_number === chapter);
  if (!ch?.verses?.length) throw new Error("Chapter not found");
  return (ch.verses as any[])
    .map((v) => ({ verse: v.verse_number, text: String(v.text).replace(/^¶\s*/, "").trim() }))
    .filter((v) => v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);
}

async function fetchGetBible(abbrev: string, bookNumber: number, chapter: number) {
  const url = `https://api.getbible.net/v2/${abbrev}/${bookNumber}/${chapter}.json`;
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": "CCB-App/1.0", Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 7 },
  } as RequestInit, 10000);
  if (!res.ok) throw new Error(`getbible ${res.status}`);
  const data = await res.json();
  const raw = data.verses || {};
  const parsed = (Object.values(raw) as any[])
    .map((v) => ({
      verse: Number(v.verse_nr ?? v.verse ?? 0),
      text: String(v.verse || v.text || "").trim().replace(/\n/g, " "),
    }))
    .filter((v) => v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);
  if (!parsed.length) throw new Error("No verses");
  return parsed;
}

const GETBIBLE_MAP: Record<string, string> = {
  darby: "darby", neg: "neg", crampon: "crampon",
  ostervald: "ostervald", martin: "martin",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookNumber = parseInt(searchParams.get("bookNumber") ?? "0");
  const chapter    = parseInt(searchParams.get("chapter") ?? "0");
  const version    = searchParams.get("version") ?? "lsg";
  const bookEn     = searchParams.get("bookEn") ?? "";

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 });
  }

  // LSG: GitHub primary → getbible fallback → bible-api.com last resort
  if (version === "lsg") {
    try {
      const verses = await fetchGitHubLSG(bookNumber, chapter);
      return NextResponse.json({ verses, source: "github-lsg" }, { headers: CACHE });
    } catch { /* fallback */ }
    try {
      const verses = await fetchGetBible("lsg", bookNumber, chapter);
      return NextResponse.json({ verses, source: "getbible-lsg" }, { headers: CACHE });
    } catch { /* fallback */ }
    if (bookEn) {
      try {
        const url = `https://bible-api.com/${encodeURIComponent(bookEn)}+${chapter}?translation=lsg`;
        const res = await fetchWithTimeout(url, { headers: { "User-Agent": "CCB-App/1.0" } }, 8000);
        if (res.ok) {
          const data = await res.json();
          const verses = ((data.verses || []) as any[])
            .map((v) => ({ verse: v.verse, text: String(v.text).trim().replace(/\n/g, " ") }))
            .filter((v) => v.text.length > 0);
          if (verses.length) return NextResponse.json({ verses, source: "bibleapi" }, { headers: CACHE });
        }
      } catch { /* all sources failed */ }
    }
  }

  // getbible.net versions (Darby, NEG, Crampon, Ostervald, Martin)
  const abbrev = GETBIBLE_MAP[version];
  if (abbrev) {
    try {
      const verses = await fetchGetBible(abbrev, bookNumber, chapter);
      return NextResponse.json({ verses, source: `getbible-${version}` }, { headers: CACHE });
    } catch (e: any) {
      return NextResponse.json({ error: `Impossible de charger ${version}: ${e.message}` }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Version inconnue" }, { status: 400 });
}
