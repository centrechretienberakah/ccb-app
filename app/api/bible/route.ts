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

const CACHE      = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" };
const CACHE_LONG = { "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400" };

// ─── OSIS book abbreviations (index = bookNumber 1–66) ───────────────────────
const OSIS_BOOKS = [
  "",
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
  "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
  "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
  "OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
  "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH",
  "PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS",
  "1PE","2PE","1JN","2JN","3JN","JUD","REV",
];

// ─── API.Bible version IDs ────────────────────────────────────────────────────
const APIBIBLE_IDS: Record<string, string> = {
  s21:  "3a2a80c1be6bee61-01",   // Segond 21
  nbs:  "d5754d2b6e5f7bf3-01",   // Nouvelle Bible Segond
  bds:  "db00bc83c3b0f552-01",   // Bible du Semeur
  nfc:  "1e5d8f0fb7ceae62-01",   // Français Courant
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

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

async function fetchApiBible(
  bibleId: string,
  bookNumber: number,
  chapter: number,
  apiKey: string
): Promise<{ verse: number; text: string }[]> {
  const bookAbbrev = OSIS_BOOKS[bookNumber];
  if (!bookAbbrev) throw new Error("Livre introuvable");

  const chapterId = `${bookAbbrev}.${chapter}`;
  const params = new URLSearchParams({
    "content-type": "text",
    "include-notes": "false",
    "include-titles": "false",
    "include-chapter-numbers": "false",
    "include-verse-numbers": "true",
    "include-verse-spans": "false",
  });
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?${params}`;

  const res = await fetchWithTimeout(url, {
    headers: { "api-key": apiKey, Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  } as RequestInit, 12000);

  if (res.status === 401 || res.status === 403) throw new Error("BIBLE_API_KEY_INVALID");
  if (res.status === 404) throw new Error(`Chapitre introuvable (${chapterId})`);
  if (!res.ok) throw new Error(`API.Bible ${res.status}`);

  const data = await res.json();
  const content: string = data?.data?.content ?? "";
  if (!content.trim()) throw new Error("Contenu vide reçu de API.Bible");

  // Parsing du format "[1]texte [2]texte..."
  const matches = [...content.matchAll(/\[(\d+)\]([\s\S]*?)(?=\s*\[\d+\]|$)/g)];
  const verses = matches
    .map((m) => ({
      verse: parseInt(m[1], 10),
      text: m[2].replace(/\s+/g, " ").trim(),
    }))
    .filter((v) => v.verse > 0 && v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);

  if (!verses.length) throw new Error("Impossible de parser les versets API.Bible");
  return verses;
}

// ─── getbible.net version map ─────────────────────────────────────────────────
const GETBIBLE_MAP: Record<string, string> = {
  darby: "darby", neg: "neg", crampon: "crampon",
  ostervald: "ostervald", martin: "martin",
  kjv: "kjv", asv: "asv", web: "web",
};

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookNumber = parseInt(searchParams.get("bookNumber") ?? "0");
  const chapter    = parseInt(searchParams.get("chapter") ?? "0");
  const version    = searchParams.get("version") ?? "lsg";
  const bookEn     = searchParams.get("bookEn") ?? "";

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 });
  }

  // ── LSG: GitHub → getbible → bible-api.com ──────────────────────────────────
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
    return NextResponse.json({ error: "Impossible de charger ce chapitre LSG" }, { status: 503 });
  }

  // ── getbible.net versions (Darby, NEG, Crampon, Ostervald, Martin) ──────────
  const gbAbbrev = GETBIBLE_MAP[version];
  if (gbAbbrev) {
    try {
      const verses = await fetchGetBible(gbAbbrev, bookNumber, chapter);
      return NextResponse.json({ verses, source: `getbible-${version}` }, { headers: CACHE });
    } catch (e: any) {
      return NextResponse.json({ error: `Impossible de charger ${version}: ${e.message}` }, { status: 503 });
    }
  }

  // ── API.Bible versions modernes (S21, NBS, BDS, NFC) ──────────────────────
  const apiBibleId = APIBIBLE_IDS[version];
  if (apiBibleId) {
    const apiKey = process.env.BIBLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "BIBLE_API_KEY_REQUIRED" }, { status: 402 });
    }
    try {
      const verses = await fetchApiBible(apiBibleId, bookNumber, chapter, apiKey);
      return NextResponse.json({ verses, source: `apibible-${version}` }, { headers: CACHE_LONG });
    } catch (e: any) {
      if (e.message === "BIBLE_API_KEY_INVALID") {
        return NextResponse.json({ error: "BIBLE_API_KEY_REQUIRED" }, { status: 401 });
      }
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Version inconnue" }, { status: 400 });
}
