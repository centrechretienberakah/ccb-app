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

interface ApiVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export default async function BibleReaderPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const bookName = decodeURIComponent(book);
  const chapterNum = parseInt(chapter);

  // Find book info
  const bookInfo = ALL_BOOKS.find((b) => b.fr === bookName);
  if (!bookInfo || isNaN(chapterNum) || chapterNum < 1 || chapterNum > bookInfo.chapters) {
    return notFound();
  }

  // Fetch text from bible-api.com (Louis Segond = lsg)
  let verses: { verse: number; text: string }[] = [];
  let fetchError = false;

  try {
    const url = `https://bible-api.com/${encodeURIComponent(bookInfo.en)}+${chapterNum}?translation=lsg`;
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache 24h
    });

    if (res.ok) {
      const data = await res.json();
      verses = (data.verses || []).map((v: ApiVerse) => ({
        verse: v.verse,
        text: v.text.trim().replace(/\n/g, " "),
      }));
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
