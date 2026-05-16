import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CollectionDetailClient from "./CollectionDetailClient";

export const dynamic = "force-dynamic";

interface CollectionRow {
  id: string;
  name: string;
  emoji: string | null;
  user_id: string;
}

interface VerseInColl {
  id: string;
  reference: string;
  verse_text: string;
  book_name: string;
  chapter: number;
  verse_number: number | null;
  saved_at: string;
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/bible/collection/${id}`);

  const { data: coll } = await supabase
    .from("bible_verse_collections")
    .select("id, name, emoji, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!coll) return notFound();

  const { data: rows } = await supabase
    .from("user_saved_verses")
    .select("id, reference, verse_text, book_name, chapter, verse_number, saved_at")
    .eq("user_id", user.id)
    .eq("collection_id", id)
    .order("saved_at", { ascending: false });

  return (
    <CollectionDetailClient
      collection={coll as CollectionRow}
      verses={(rows ?? []) as VerseInColl[]}
      userId={user.id}
    />
  );
}
