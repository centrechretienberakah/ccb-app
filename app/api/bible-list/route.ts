import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.BIBLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "BIBLE_API_KEY non configuree" }, { status: 500 });
  }
  const res = await fetch("https://api.scripture.api.bible/v1/bibles?language=fra", {
    headers: { "api-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: `api.bible ${res.status}`, body: await res.text() }, { status: 502 });
  }
  const data = await res.json();
  const list = (data.data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    abbrev: b.abbreviation,
  }));
  return NextResponse.json({ count: list.length, bibles: list });
}
