import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LireBibleRedirect from "./LireBibleRedirect";

export const metadata = {
  title: "Lire la Bible — CCB",
};

export default async function LireBiblePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/lire");

  let notes: any[] = [];
  let savedVerses: any[] = [];

  try {
    const { data: notesData } = await supabase
      .from("user_bible_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    notes = notesData || [];

    const { data: versesData } = await supabase
      .from("user_saved_verses")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });
    savedVerses = versesData || [];
  } catch {
    // Tables may not exist yet
  }

  return (
    <LireBibleRedirect
      user={user}
      notes={notes}
      savedVerses={savedVerses}
    />
  );
}
