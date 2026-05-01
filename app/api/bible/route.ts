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
  const chapter = searchParams.get("chapter");

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const bookNum = parseInt(bookNumber);
  const chapterNum = parseInt(chapter);
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
  };

  // ── Source principale : GitHub LSG (Mikenslywed/Bible-Francais-Louis-Segond) ─
  // raw.githubusercontent.com est accessible depuis Vercel sans restriction.
  // 66 fichiers JSON par livre, format {book_name, chapters: [{chapter_number, verses:[{verse_number,text}]}]}
  try {
    const bookPadded = String(bookNum).padStart(2, "0");
    const url = `https://raw.githubusercontent.com/Mikenslywed/Bible-Francais-Louis-Segond/main/${bookPadded}.json`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        // Cache le livre entier 7 jours dans le Data Cache Next.js
        next: { revalidate: 60 * 60 * 24 * 7 },
      } as RequestInit,
      10000
    );
    if (res.ok) {
      const data = await res.json();
      const chapters: any[] = data.chapters || [];
      const chapterData = chapters.find(
        (c: any) => c.chapter_number === chapterNum
      );
      if (chapterData?.verses?.length > 0) {
        const parsed = (chapterData.verses as any[])
          .map((v) => ({
            verse: v.verse_number,
            // Enlève les marques de paragraphe ¶ en début de verset
            text: String(v.text).replace(/^¶\s*/, "").trim(),
          }))
          .filter((v) => v.text.length > 0)
          .sort((a, b) => a.verse - b.verse);
        if (parsed.length > 0) {
          return NextResponse.json(
            { verses: parsed, source: "github-lsg" },
            { headers: cacheHeaders }
          );
        }
      }
    }
  } catch {
    // Continue vers les sources de secours
  }

  // ── Secours 1 : getbible.net v2 ───────────────────────────────────────────────
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
    // Continue
  }

  // ── Secours 2 : bible-api.com ─────────────────────────────────────────────────
  const bookEn = searchParams.get("bookEn");
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
      // Toutes les sources ont échoué
    }
  }

  return NextResponse.json(
    { error: "Impossible de charger le chapitre depuis toutes les sources." },
    { status: 503 }
  );
}
