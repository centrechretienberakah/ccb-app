import { NextRequest, NextResponse } from "next/server";

// Proxy server-side — pas de CORS, pas de blocage navigateur
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookNumber = searchParams.get("bookNumber");
  const bookEn = searchParams.get("bookEn");
  const chapter = searchParams.get("chapter");

  if (!bookNumber || !chapter) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const verses: { verse: number; text: string }[] = [];

  // ── Source 1 : getbible.net (Louis Segond natif) ─────────────────────────
  try {
    const url = `https://getbible.net/v2/lsg/${bookNumber}/${chapter}.json`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "CCB-App/1.0", Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const raw = data.verses || {};
      const parsed = Object.values(raw)
        .map((v: any) => ({
          verse: parseInt(v.verse_nr),
          text: (v.verse || "").trim().replace(/\n/g, " "),
        }))
        .filter((v) => v.text.length > 0)
        .sort((a, b) => a.verse - b.verse);
      if (parsed.length > 0) {
        return NextResponse.json(
          { verses: parsed, source: "getbible" },
          { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
        );
      }
    }
  } catch {
    // continue to next source
  }

  // ── Source 2 : bible-api.com (fallback) ──────────────────────────────────
  if (bookEn) {
    try {
      const url = `https://bible-api.com/${encodeURIComponent(bookEn)}+${chapter}?translation=lsg`;
      const res = await fetch(url, {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "CCB-App/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = (data.verses || [])
          .map((v: any) => ({
            verse: v.verse,
            text: (v.text || "").trim().replace(/\n/g, " "),
          }))
          .filter((v: { verse: number; text: string }) => v.text.length > 0);
        if (parsed.length > 0) {
          return NextResponse.json(
            { verses: parsed, source: "bibleapi" },
            { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
          );
        }
      }
    } catch {
      // continue
    }
  }

  // ── Source 3 : getbible.net format alternatif ─────────────────────────────
  try {
    const url = `https://getbible.net/json?p=${encodeURIComponent(`${bookEn || ""}${chapter}`)}&version=lsg`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "CCB-App/1.0" },
    });
    if (res.ok) {
      let text = await res.text();
      // getbible wraps response in callback()
      if (text.startsWith("(")) text = text.slice(1, -2);
      const data = JSON.parse(text);
      const book = Object.values(data)[0] as any;
      if (book?.chapter) {
        const parsed = Object.values(book.chapter)
          .map((v: any) => ({
            verse: parseInt(v.verse_nr),
            text: (v.verse || "").trim(),
          }))
          .filter((v) => v.text.length > 0)
          .sort((a, b) => a.verse - b.verse);
        if (parsed.length > 0) {
          return NextResponse.json({ verses: parsed, source: "getbible-json" });
        }
      }
    }
  } catch {
    // all failed
  }

  return NextResponse.json(
    { error: "Impossible de charger le chapitre depuis toutes les sources." },
    { status: 503 }
  );
}
