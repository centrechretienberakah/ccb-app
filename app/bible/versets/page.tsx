import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleVersetsClient, { type VerseRow, type CollectionRow } from "./BibleVersetsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes versets — Ma Bible CCB" };

export default async function BibleVersetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/versets");

  let verses: VerseRow[] = [];
  let collections: CollectionRow[] = [];
  try {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from("user_saved_verses").select("id, reference, verse_text, saved_at").eq("user_id", user.id).order("saved_at", { ascending: false }),
      supabase.from("bible_verse_collections").select("id, name, emoji").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    verses = (v ?? []) as VerseRow[];
    collections = (c ?? []) as CollectionRow[];
  } catch { /* tables absentes */ }

  return <BibleVersetsClient verses={verses} collections={collections} />;
}
