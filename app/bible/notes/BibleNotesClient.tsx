"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export interface NoteRow {
  id: string;
  book_name: string;
  chapter: number;
  note_text: string;
  updated_at: string;
}

/** Mes notes — création, édition, suppression (comportement identique à l'existant). */
export default function BibleNotesClient({ userId, initialNotes }: { userId: string; initialNotes: NoteRow[] }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [text, setText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  async function save() {
    if (!text.trim() || !book.trim()) return;
    const chap = parseInt(chapter) || 1;
    try {
      if (editNote) {
        const { data } = await supabase.from("user_bible_notes")
          .update({ note_text: text.trim(), book_name: book.trim(), chapter: chap, updated_at: new Date().toISOString() })
          .eq("id", editNote.id).select("id, book_name, chapter, note_text, updated_at").single();
        if (data) setNotes((prev) => prev.map((n) => (n.id === editNote.id ? (data as NoteRow) : n)));
      } else {
        const { data } = await supabase.from("user_bible_notes")
          .insert({ user_id: userId, book_name: book.trim(), chapter: chap, note_text: text.trim() })
          .select("id, book_name, chapter, note_text, updated_at").single();
        if (data) setNotes((prev) => [data as NoteRow, ...prev]);
      }
      flash("Note sauvegardée !");
    } catch (e) { flash("Erreur : " + (e as Error).message); }
    setShowForm(false); setEditNote(null); setBook(""); setChapter(""); setText("");
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    await supabase.from("user_bible_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    flash("Note supprimée.");
  }

  function startEdit(n: NoteRow) {
    setEditNote(n); setBook(n.book_name); setChapter(String(n.chapter)); setText(n.note_text); setShowForm(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input-bg, var(--page-bg))", border: "1px solid var(--input-border, var(--border))",
    borderRadius: "var(--radius-md, 10px)", padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "var(--font-body)",
  };

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--gold)", color: "#000", padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{toast}</div>
      )}

      <Header title="📝 Mes notes" subtitle={`${notes.length} note${notes.length > 1 ? "s" : ""}`} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 0" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={() => { setShowForm(true); setEditNote(null); setBook(""); setChapter(""); setText(""); }} style={{
            background: "var(--gold)", color: "#000", border: "none", borderRadius: "var(--radius-md, 10px)",
            padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
          }}>+ Nouvelle note</button>
        </div>

        {showForm && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg, 14px)", padding: 18, marginBottom: 18, boxShadow: "var(--shadow-md)" }}>
            <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 12, fontSize: 14 }}>
              {editNote ? "Modifier la note" : "Nouvelle note"}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input placeholder="Livre (ex : Jean)" value={book} onChange={(e) => setBook(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
              <input placeholder="Chap." type="number" value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <textarea placeholder="Votre réflexion, observation…" value={text} onChange={(e) => setText(e.target.value)} rows={4}
              style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={save} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: "var(--radius-md, 10px)", padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>Sauvegarder</button>
              <button onClick={() => { setShowForm(false); setEditNote(null); }} style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "none", borderRadius: "var(--radius-md, 10px)", padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)" }}>Annuler</button>
            </div>
          </div>
        )}

        {notes.length === 0 && !showForm ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15 }}>Aucune note pour l&apos;instant.</div>
            <p style={{ fontSize: 13, marginTop: 8 }}>Annote tes lectures depuis le lecteur ou crée une note ici.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg, 14px)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: 14 }}>{n.book_name} {n.chapter}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 10 }}>{new Date(n.updated_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(n)} style={{ background: "var(--surface-2)", border: "none", borderRadius: 8, padding: "5px 10px", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>✏️</button>
                    <button onClick={() => remove(n.id)} style={{ background: "rgba(220,38,38,0.08)", border: "none", borderRadius: 8, padding: "5px 10px", color: "var(--error, #DC2626)", fontSize: 12, cursor: "pointer" }}>🗑</button>
                  </div>
                </div>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.note_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--violet-dark, #4C1D95) 0%, var(--violet, #5B21B6) 100%)",
      color: "#fff",
      paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 12, paddingRight: 12,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <Link href="/bible" aria-label="Retour" style={{
        width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.22)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", textDecoration: "none", fontSize: 20, flexShrink: 0,
      }}>←</Link>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>{subtitle}</div>
      </div>
    </div>
  );
}
