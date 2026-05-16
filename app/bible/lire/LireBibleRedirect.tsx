"use client";

import BibleClient from "../BibleClient";

interface Props {
  user: { id: string };
  notes: { id: string; book_name: string; chapter: number; note_text: string; updated_at: string }[];
  savedVerses: { id: string; book_name: string; chapter: number; verse_number: number | null; verse_text: string; reference: string; saved_at: string }[];
}

// Affiche directement le sélecteur testament + livre + chapitre.
// La reprise de lecture est gérée par la carte "Reprendre" du hub /bible.
export default function LireBibleRedirect({ user, notes, savedVerses }: Props) {
  return <BibleClient user={user} notes={notes} savedVerses={savedVerses} />;
}
