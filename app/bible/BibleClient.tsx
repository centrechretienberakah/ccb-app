"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OT_BOOKS, NT_BOOKS, BibleBook } from "@/lib/bible/books";

interface Note {
  id: string;
  book_name: string;
  chapter: number;
  note_text: string;
  updated_at: string;
}

interface SavedVerse {
  id: string;
  book_name: string;
  chapter: number;
  verse_number: number | null;
  verse_text: string;
  reference: string;
  saved_at: string;
}

interface Props {
  user: any;
  notes: Note[];
  savedVerses: SavedVerse[];
}

export default function BibleClient({ user, notes: initialNotes, savedVerses: initialSavedVerses }: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"read" | "notes" | "verses">("read");
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>(initialSavedVerses);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveNote(book: string, chapter: number, text: string, noteId?: string) {
    try {
      if (noteId) {
        const { data } = await supabase.from("user_bible_notes")
          .update({ note_text: text, updated_at: new Date().toISOString() })
          .eq("id", noteId).select().single();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data : n)));
      } else {
        const { data } = await supabase.from("user_bible_notes")
          .insert({ user_id: user.id, book_name: book, chapter, note_text: text })
          .select().single();
        setNotes((prev) => [data, ...prev]);
      }
      showToast("Note sauvegardée !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  async function deleteNote(id: string) {
    await supabase.from("user_bible_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast("Note supprimée.");
  }

  async function deleteVerse(id: string) {
    await supabase.from("user_saved_verses").delete().eq("id", id);
    setSavedVerses((prev) => prev.filter((v) => v.id !== id));
    showToast("Verset retiré.");
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "13px 16px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--gold)", color: "#000", padding: "10px 22px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: "var(--shadow-gold)",
        }}>
          {toast}
        </div>
      )}

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(tab === "read")} onClick={() => setTab("read")}>
            📖 Lire la Bible
          </button>
          <button style={tabStyle(tab === "notes")} onClick={() => setTab("notes")}>
            📝 Notes ({notes.length})
          </button>
          <button style={tabStyle(tab === "verses")} onClick={() => setTab("verses")}>
            ⭐ Versets ({savedVerses.length})
          </button>
        </div>
      </div>

      <div style={{ maxWidth: tab === "read" ? 960 : 720, margin: "0 auto", padding: "24px 16px 48px" }}>
        {tab === "read" && <BibleBrowserTab />}
        {tab === "notes" && (
          <NotesTab notes={notes} onSave={saveNote} onDelete={deleteNote} />
        )}
        {tab === "verses" && (
          <VersesTab verses={savedVerses} onDelete={deleteVerse} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Bible Browser
// ─────────────────────────────────────────────────────────────────────────────
function BibleBrowserTab() {
  const router = useRouter();
  const [testament, setTestament] = useState<"ot" | "nt">("nt");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const books = testament === "ot" ? OT_BOOKS : NT_BOOKS;

  function handleTestamentChange(t: "ot" | "nt") {
    setTestament(t);
    setSelectedBook(null);
  }

  function handleBookSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const book = books.find((b) => b.fr === e.target.value) ?? null;
    setSelectedBook(book);
  }

  function handleChapterClick(book: BibleBook, chapter: number) {
    const slug = encodeURIComponent(book.fr);
    router.push(`/bible/read/${slug}/${chapter}`);
  }

  const chapterBtn: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 4px",
    color: "var(--text-secondary)",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    textAlign: "center",
    transition: "all 0.15s",
    fontWeight: 600,
  };

  return (
    <div>
      {/* Testament toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {(["nt", "ot"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTestamentChange(t)}
            style={{
              padding: "10px 18px",
              background: testament === t ? "var(--gold)" : "var(--card-bg)",
              color: testament === t ? "#000" : "var(--text-primary)",
              fontWeight: testament === t ? 700 : 400,
              border: `1px solid ${testament === t ? "var(--gold)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "all 0.15s",
            }}
          >
            {t === "nt" ? "✝ Nouveau Testament" : "📜 Ancien Testament"}
          </button>
        ))}
      </div>

      {/* Book dropdown */}
      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Choisir un livre
        </label>
        <div style={{ position: "relative" }}>
          <select
            value={selectedBook?.fr ?? ""}
            onChange={handleBookSelect}
            style={{
              width: "100%",
              appearance: "none",
              background: "var(--card-bg)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "13px 44px 13px 16px",
              color: selectedBook ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 15,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              outline: "none",
              boxShadow: "var(--shadow-sm)",
              fontWeight: selectedBook ? 600 : 400,
            }}
          >
            <option value="">— Sélectionnez un livre —</option>
            {books.map((book) => (
              <option key={book.fr} value={book.fr}>
                {book.fr}  ({book.chapters} chapitres)
              </option>
            ))}
          </select>
          {/* Chevron icon */}
          <span style={{
            position: "absolute", right: 14, top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none", color: "var(--gold)", fontSize: 16,
          }}>▾</span>
        </div>
      </div>

      {/* Chapter grid */}
      {selectedBook && (
        <div style={{
          background: "var(--card-bg)",
          border: "1.5px solid var(--gold)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{
            fontFamily: "var(--font-title)",
            color: "var(--gold)",
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 16,
          }}>
            {selectedBook.fr} — {selectedBook.chapters} chapitres
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
            gap: 6,
          }}>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
              <button
                key={ch}
                onClick={() => handleChapterClick(selectedBook, ch)}
                style={chapterBtn}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "var(--gold)";
                  el.style.color = "#000";
                  el.style.borderColor = "var(--gold)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "var(--surface-2)";
                  el.style.color = "var(--text-secondary)";
                  el.style.borderColor = "var(--border)";
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedBook && (
        <div style={{
          textAlign: "center",
          padding: "32px 0",
          color: "var(--text-muted)",
          fontSize: 13,
          borderTop: "1px dashed var(--border)",
        }}>
          📖 Sélectionnez un livre dans la liste pour choisir un chapitre
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Notes
// ─────────────────────────────────────────────────────────────────────────────
function NotesTab({ notes, onSave, onDelete }: {
  notes: Note[];
  onSave: (book: string, chapter: number, text: string, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || !book.trim()) return;
    onSave(book, parseInt(chapter) || 1, text, editNote?.id);
    setShowForm(false); setEditNote(null);
    setBook(""); setChapter(""); setText("");
  }

  function startEdit(note: Note) {
    setEditNote(note); setBook(note.book_name);
    setChapter(String(note.chapter)); setText(note.note_text);
    setShowForm(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: "var(--radius-md)", padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
    outline: "none", fontFamily: "var(--font-body)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-title)", color: "var(--gold)" }}>
          Mes notes de lecture
        </h2>
        <button onClick={() => { setShowForm(true); setEditNote(null); setBook(""); setChapter(""); setText(""); }} style={{
          background: "var(--gold)", color: "#000", border: "none",
          borderRadius: "var(--radius-md)", padding: "9px 16px",
          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          + Nouvelle note
        </button>
      </div>

      {showForm && (
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20,
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 14, fontSize: 14 }}>
            {editNote ? "Modifier la note" : "Nouvelle note"}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input placeholder="Livre (ex: Jean)" value={book}
              onChange={(e) => setBook(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
            <input placeholder="Chap." type="number" value={chapter}
              onChange={(e) => setChapter(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <textarea placeholder="Votre réflexion, insight ou observation..." value={text}
            onChange={(e) => setText(e.target.value)} rows={4}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 12 } as React.CSSProperties} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{
              background: "var(--gold)", color: "#000", border: "none",
              borderRadius: "var(--radius-md)", padding: "10px 20px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
            }}>Sauvegarder</button>
            <button onClick={() => { setShowForm(false); setEditNote(null); }} style={{
              background: "var(--surface-2)", color: "var(--text-muted)", border: "none",
              borderRadius: "var(--radius-md)", padding: "10px 20px",
              fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
            }}>Annuler</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 15 }}>Aucune note pour l'instant.</div>
          <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
            Commencez à annoter vos lectures bibliques !
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note) => (
            <div key={note.id} style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: 14 }}>
                    {note.book_name} {note.chapter}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 10 }}>
                    {new Date(note.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(note)} style={{
                    background: "var(--surface-2)", border: "none", borderRadius: "var(--radius-sm)",
                    padding: "5px 10px", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                  }}>✏️</button>
                  <button onClick={() => onDelete(note.id)} style={{
                    background: "rgba(220,38,38,0.08)", border: "none", borderRadius: "var(--radius-sm)",
                    padding: "5px 10px", color: "var(--error)", fontSize: 12, cursor: "pointer",
                  }}>🗑</button>
                </div>
              </div>
              <p style={{
                margin: 0, color: "var(--text-secondary)", fontSize: 14,
                lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>{note.note_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Versets sauvegardés
// ─────────────────────────────────────────────────────────────────────────────
function VersesTab({ verses, onDelete }: {
  verses: SavedVerse[]; onDelete: (id: string) => void;
}) {
  if (verses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 15 }}>Aucun verset sauvegardé.</div>
        <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
          Lors de vos lectures, utilisez le bouton ★ pour sauvegarder vos versets préférés.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-title)", fontSize: 15, color: "var(--gold)", marginBottom: 16 }}>
        Mes versets sauvegardés
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {verses.map((verse) => (
          <div key={verse.id} style={{
            background: "var(--card-bg)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "0 var(--radius-lg) var(--radius-lg) 0",
            padding: 16, boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 13, marginBottom: 6 }}>
                  {verse.reference}
                </div>
                <p style={{
                  margin: 0, color: "var(--text-secondary)", fontSize: 14,
                  lineHeight: 1.7, fontStyle: "italic",
                }}>
                  « {verse.verse_text} »
                </p>
              </div>
              <button onClick={() => onDelete(verse.id)} style={{
                background: "rgba(220,38,38,0.08)", border: "none",
                borderRadius: "var(--radius-sm)", padding: "5px 10px",
                color: "var(--error)", fontSize: 12, cursor: "pointer", marginLeft: 12, flexShrink: 0,
              }}>🗑</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              Sauvegardé le {new Date(verse.saved_at).toLocaleDateString("fr-FR")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
