import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleHubClient from "./BibleHubClient";
import { getDailyVerse } from "@/lib/bible/verse-of-day";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma Bible — CCB" };

interface RawSavedVerse {
  id: string;
  reference: string;
  verse_text: string;
  saved_at: string;
}

interface RawCollection {
  id: string;
  name: string;
  emoji: string | null;
}

interface RawChapterRead {
  book_name: string;
  chapter: number;
  read_at: string;
}

export default async function BiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible");

  const today = new Date().toISOString().split("T")[0];
  const verseOfDay = getDailyVerse(today);

  // En parallèle : versets sauvegardés, collections, dernier chapitre lu, total chapitres lus
  const [
    { data: savedRows },
    { data: collRows },
    { data: lastRead },
    { count: chaptersReadCount },
  ] = await Promise.all([
    supabase
      .from("user_saved_verses")
      .select("id, reference, verse_text, saved_at")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .limit(3),
    supabase
      .from("bible_verse_collections")
      .select("id, name, emoji")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("bible_chapter_progress")
      .select("book_name, chapter, read_at")
      .eq("user_id", user.id)
      .order("read_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bible_chapter_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const savedVerses = (savedRows ?? []) as RawSavedVerse[];
  const collections = (collRows ?? []) as RawCollection[];
  const lastReadRow = (lastRead ?? null) as RawChapterRead | null;

  return (
    <BibleHubClient
      verseOfDay={verseOfDay}
      lastRead={lastReadRow}
      chaptersRead={chaptersReadCount ?? 0}
      savedVerses={savedVerses}
      collections={collections}
      userId={user.id}
    />
  );
}
