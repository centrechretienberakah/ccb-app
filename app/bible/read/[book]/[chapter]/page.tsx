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

  const bookIndex = ALL_BOOKS.findIndex((b) => b.fr === bookName);
  if (bookIndex === -1) return notFound();

  const bookInfo = ALL_BOOKS[bookIndex];
  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > bookInfo.chapters) {
    return notFound();
  }

  // Pass book number (1-66) to client for getbible.net API
  const bookNumber = bookIndex + 1;

  return (
    <ReaderClient
      bookFr={bookName}
      bookEn={bookInfo.en}
      bookNumber={bookNumber}
      chapter={chapterNum}
      totalChapters={bookInfo.chapters}
    />
  );
}
