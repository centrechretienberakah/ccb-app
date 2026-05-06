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

// ── getbible.net v2 ─────────────────────────────────────────────────────────
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

// ── GitHub LSG (source principale LSG) ─────────────────────────────────────
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

// ── api.bible (versions modernes copyrightées — nécessite BIBLE_API_KEY) ───
// Book USFM IDs dans l'ordre canonique 1-66
const USFM_IDS = [
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
  "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
  "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
  "OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
  "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH",
  "PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS",
  "1PE","2PE","1JN","2JN","3JN","JUD","REV",
];

async function fetchApiBible(bibleId: string, bookNumber: number, chapter: number) {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) throw new Error("BIBLE_API_KEY non configurée");
  const usfm = USFM_IDS[bookNumber - 1];
  if (!usfm) throw new Error("Livre inconnu");
  const chapterId = `${usfm}.${chapter}`;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=json&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;
  const res = await fetchWithTimeout(url, {
    headers: { "api-key": apiKey },
    next: { revalidate: 60 * 60 * 24 },
  } as RequestInit, 12000);
  if (!res.ok) throw new Error(`api.bible ${res.status}`);
  const data = await res.json();
  // api.bible renvoie du contenu structuré — on extrait les versets
  const verses: { verse: number; text: string }[] = [];
  function extractVerses(items: any[]) {
    for (const item of items || []) {
      if (item.type === "verse" || item.attrs?.verseId) {
        const verseNum = parseInt(item.attrs?.number ?? item.number ?? "0");
        const parts: string[] = [];
        function extractText(nodes: any[]) {
          for (const n of nodes || []) {
            if (typeof n === "string") parts.push(n);
            else if (n.text) parts.push(n.text);
            else if (n.items) extractText(n.items);
          }
        }
        extractText(item.items || []);
        if (verseNum && parts.length) {
          verses.push({ verse: verseNum, text: parts.join("").trim() });
        }
      } else if (item.items) {
        extractVerses(item.items);
      }
    }
  }
  extractVerses(data.data?.content || []);
  if (!verses.length) throw new Error("No verses from api.bible");
  return verses.sort((a, b) => a.verse - b.verse);
}

// ── GETBIBLE abbreviation mapping ───────────────────────────────────────────
const GETBIBLE_ABBREVS: Record<string, string> = {
  darby: "darby",
  neg: "neg",
  crampon: "crampon",
  ostervald: "ostervald",
  martin: "martin",
  lsg: "lsg",
};

// ── api.bible ID mapping ─────────────────────────────────────────────────────
const APIBIBLE_IDS: Record<string, string> = {
  s21: "7142879509583bbb-01",
  bds: "3607DA17EA2BE966-01",
  pdv: "a556c5305b9b8534-01",
  fc: "0585e9ddabb41d4b-01",
};

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookNumber = parseInt(searchParams.get("bookNumber") ?? "0");
  const chapter = parseInt(searchParams.get("chapter") ?? "0");
  const version = searchParams.get("version") ?? "lsg";
  const bookEn = searchParams.get("bookEn") ?? "";

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // ── LSG: GitHub primary, getbible fallback
  if (version === "lsg") {
    try {
      const verses = await fetchGitHubLSG(bookNumber, chapter);
      return NextResponse.json({ verses, source: "github-lsg" }, { headers: CACHE });
    } catch { /* fallback */ }
    try {
      const verses = await fetchGetBible("lsg", bookNumber, chapter);
      return NextResponse.json({ verses, source: "getbible-lsg" }, { headers: CACHE });
    } catch { /* fallback */ }
    // Last resort: bible-api.com
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

  // ── getbible.net versions (Darby, NEG, Crampon, Ostervald, Martin)
  const gbAbbrev = GETBIBLE_ABBREVS[version];
  if (gbAbbrev) {
    try {
      const verses = await fetchGetBible(gbAbbrev, bookNumber, chapter);
      return NextResponse.json({ verses, source: `getbible-${version}` }, { headers: CACHE });
    } catch (e: any) {
      return NextResponse.json({ error: `Impossible de charger ${version}: ${e.message}` }, { status: 503 });
    }
  }

  // ── api.bible versions (S21, BDS, PDV, FC)
  const apiBibleId = APIBIBLE_IDS[version];
  if (apiBibleId) {
    if (!process.env.BIBLE_API_KEY) {
      return NextResponse.json(
        { error: "BIBLE_API_KEY_REQUIRED", message: "Cette version nécessite une clé API gratuite. Ajoutez BIBLE_API_KEY dans vos variables d'environnement Vercel." },
        { status: 402 }
      );
    }
    try {
      const verses = await fetchApiBible(apiBibleId, bookNumber, chapter);
      return NextResponse.json({ verses, source: `apibible-${version}` }, { headers: CACHE });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Version inconnue" }, { status: 400 });
}
