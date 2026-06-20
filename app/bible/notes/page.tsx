import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleNotesClient, { type NoteRow } from "./BibleNotesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes notes — Ma Bible CCB" };

export default async function BibleNotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/notes");

  let notes: NoteRow[] = [];
  try {
    const { data } = await supabase
      .from("user_bible_notes")
      .select("id, book_name, chapter, note_text, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    notes = (data ?? []) as NoteRow[];
  } catch { /* table absente */ }

  return <BibleNotesClient userId={user.id} initialNotes={notes} />;
}
