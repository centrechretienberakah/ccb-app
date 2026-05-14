import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "BIBLE_API_KEY manquante dans les variables Vercel" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.scripture.api.bible/v1/bibles?language=fra", {
      headers: { "api-key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `API.Bible erreur ${res.status}`, hint: "Clé API invalide ou expirée" }, { status: res.status });
    }

    const data = await res.json();
    const bibles = (data.data ?? []).map((b: any) => ({
      id:           b.id,
      name:         b.name,
      abbreviation: b.abbreviation,
      language:     b.language?.name,
      copyright:    b.copyright,
    }));

    return NextResponse.json({ count: bibles.length, bibles }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
