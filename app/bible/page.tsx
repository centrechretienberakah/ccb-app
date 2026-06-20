import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleHomeClient from "./BibleHomeClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma Bible — CCB" };

export default async function BiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible");

  // Compteurs légers pour les badges des cartes (best-effort).
  let chaptersRead = 0;
  let notesCount = 0;
  let versesCount = 0;
  try {
    const [{ count: chap }, { count: notes }, { count: verses }] = await Promise.all([
      supabase.from("bible_chapter_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_bible_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_saved_verses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    chaptersRead = chap ?? 0;
    notesCount = notes ?? 0;
    versesCount = verses ?? 0;
  } catch { /* tables absentes → 0 */ }

  return (
    <BibleHomeClient
      chaptersRead={chaptersRead}
      notesCount={notesCount}
      versesCount={versesCount}
    />
  );
}
