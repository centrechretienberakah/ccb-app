import { NextRequest, NextResponse } from "next/server";
import { ALL_BOOKS } from "@/lib/bible/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache en mémoire (process Vercel warm) — LSG entière une seule fois
interface IndexedVerse {
  book: string;       // nom français
  bookIdx: number;    // 1..66
  chapter: number;
  verse: number;
  text: string;
  normText: string;   // pour recherche
}

let CACHE: IndexedVerse[] | null = null;
let CACHE_BUILDING: Promise<IndexedVerse[]> | null = null;

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[«»"',.;:!?()¶]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBookLSG(bookNumber: number): Promise<IndexedVerse[]> {
  const padded = String(bookNumber).padStart(2, "0");
  const url = `https://raw.githubusercontent.com/Mikenslywed/Bible-Francais-Louis-Segond/main/${padded}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const bookName = ALL_BOOKS[bookNumber - 1]?.fr ?? `Livre ${bookNumber}`;
  const out: IndexedVerse[] = [];
  for (const ch of (data.chapters ?? []) as Array<{ chapter_number: number; verses?: Array<{ verse_number: number; text: string }> }>) {
    for (const v of ch.verses ?? []) {
      const text = String(v.text).replace(/^¶\s*/, "").trim();
      if (!text) continue;
      out.push({
        book: bookName,
        bookIdx: bookNumber,
        chapter: ch.chapter_number,
        verse: v.verse_number,
        text,
        normText: normalize(text),
      });
    }
  }
  return out;
}

async function buildIndex(): Promise<IndexedVerse[]> {
  if (CACHE) return CACHE;
  if (CACHE_BUILDING) return CACHE_BUILDING;
  CACHE_BUILDING = (async () => {
    // Parallélise par lots de 10 pour ne pas saturer GitHub
    const all: IndexedVerse[] = [];
    const batchSize = 10;
    for (let i = 0; i < 66; i += batchSize) {
      const slice = Array.from({ length: Math.min(batchSize, 66 - i) }, (_, k) => i + k + 1);
      const results = await Promise.all(slice.map((n) => fetchBookLSG(n)));
      for (const r of results) all.push(...r);
    }
    CACHE = all;
    CACHE_BUILDING = null;
    return all;
  })();
  return CACHE_BUILDING;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  if (q.trim().length < 2) {
    return NextResponse.json({ error: "Requête trop courte (min 2 caractères)" }, { status: 400 });
  }

  const normQ = normalize(q);
  if (!normQ) return NextResponse.json({ results: [], total: 0 });

  let index: IndexedVerse[];
  try {
    index = await buildIndex();
  } catch (e) {
    return NextResponse.json({ error: "Impossible de charger l'index biblique" }, { status: 500 });
  }

  if (index.length === 0) {
    return NextResponse.json({ error: "Index vide" }, { status: 503 });
  }

  // Recherche : doit contenir tous les mots de la requête
  const terms = normQ.split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return NextResponse.json({ results: [], total: 0 });

  const matches: Array<{
    book: string; chapter: number; verse: number; text: string; score: number;
  }> = [];

  for (const v of index) {
    let ok = true;
    let score = 0;
    for (const t of terms) {
      const idx = v.normText.indexOf(t);
      if (idx < 0) { ok = false; break; }
      // Score : bonus si terme entier (entouré d'espaces)
      const wordBoundary = (idx === 0 || v.normText[idx - 1] === " ")
        && (idx + t.length === v.normText.length || v.normText[idx + t.length] === " ");
      score += wordBoundary ? 2 : 1;
    }
    if (ok) {
      matches.push({
        book: v.book, chapter: v.chapter, verse: v.verse,
        text: v.text, score,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const total = matches.length;
  const results = matches.slice(0, limit);

  return NextResponse.json(
    { results, total, query: q, indexSize: index.length },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
