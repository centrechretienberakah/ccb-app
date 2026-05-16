import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProgressionClient from "./ProgressionClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma progression — CCB" };

interface ChapterRow {
  book_name: string;
  chapter: number;
  read_at: string;
}

export default async function BibleProgressionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/progression");

  const [
    { data: chapterRows },
    { count: versesSaved },
    { count: highlightsCount },
  ] = await Promise.all([
    supabase.from("bible_chapter_progress")
      .select("book_name, chapter, read_at")
      .eq("user_id", user.id)
      .order("read_at", { ascending: false })
      .limit(500),
    supabase.from("user_saved_verses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase.from("bible_highlights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return (
    <ProgressionClient
      chapters={(chapterRows ?? []) as ChapterRow[]}
      versesSaved={versesSaved ?? 0}
      highlightsCount={highlightsCount ?? 0}
    />
  );
}
