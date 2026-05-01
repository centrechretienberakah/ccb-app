import { notFound } from "next/navigation";
import { ALL_BOOKS } from "@/lib/bible/books";
import ReaderClient from "./ReaderClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const bookName = decodeURIComponent(book);
  return {
    title: `${bookName} ${chapter} — Bible LSG · CCB`,
  };
}

export default async function BibleReaderPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const bookName = decodeURIComponent(book);
  const chapterNum = parseInt(chapter);

  // Find book info + sequential number (1-66)
  const bookIndex = ALL_BOOKS.findIndex((b) => b.fr === bookName);
  if (bookIndex === -1) return notFound();

  const bookInfo = ALL_BOOKS[bookIndex];
  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > bookInfo.chapters) {
    return notFound();
  }

  const bookNumber = bookIndex + 1; // 1 = Genèse ... 66 = Apocalypse

  // Fetch from getbible.net v2 — Louis Segond (lsg), very reliable
  let verses: { verse: number; text: string }[] = [];
  let fetchError = false;

  try {
    const url = `https://getbible.net/v2/lsg/${bookNumber}/${chapterNum}.json`;
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache 24h
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      // getbible.net format: data.verses = { "1": { verse_nr, verse }, "2": {...}, ... }
      const raw = data.verses || {};
      verses = Object.values(raw)
        .map((v: any) => ({
          verse: parseInt(v.verse_nr),
          text: (v.verse || "").trim().replace(/\n/g, " "),
        }))
        .filter((v) => v.text.length > 0)
        .sort((a, b) => a.verse - b.verse);
    } else {
      fetchError = true;
    }
  } catch {
    fetchError = true;
  }

  return (
    <ReaderClient
      bookFr={bookName}
      bookEn={bookInfo.en}
      chapter={chapterNum}
      totalChapters={bookInfo.chapters}
      verses={verses}
      fetchError={fetchError}
    />
  );
}
