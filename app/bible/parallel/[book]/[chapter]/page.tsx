import { notFound } from "next/navigation";
import { ALL_BOOKS } from "@/lib/bible/books";
import ParallelClient from "./ParallelClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const bookName = decodeURIComponent(book);
  return { title: `${bookName} ${chapter} — Comparer · CCB` };
}

export default async function ParallelPage({
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

  return (
    <ParallelClient
      bookFr={bookName}
      bookEn={bookInfo.en}
      bookNumber={bookIndex + 1}
      chapter={chapterNum}
      totalChapters={bookInfo.chapters}
    />
  );
}
