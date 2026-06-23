"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";
import { shareBibleVerse } from "@/lib/bible/share";
import { createClient } from "@/lib/supabase/client";

interface Collection {
  id: string;
  name: string;
  emoji: string | null;
}

interface Verse {
  id: string;
  reference: string;
  verse_text: string;
  book_name: string;
  chapter: number;
  verse_number: number | null;
  saved_at: string;
}

interface Props {
  collection: Collection;
  verses: Verse[];
  userId: string;
}

export default function CollectionDetailClient({ collection, verses: initialVerses }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [verses, setVerses] = useState<Verse[]>(initialVerses);
  const [toast, setToast] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(collection.name);
  const [draftEmoji, setDraftEmoji] = useState(collection.emoji || "📖");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function removeFromCollection(verseId: string) {
    const prev = verses;
    setVerses((p) => p.filter((v) => v.id !== verseId));
    const { error } = await supabase
      .from("user_saved_verses")
      .update({ collection_id: null })
      .eq("id", verseId);
    if (error) { setVerses(prev); flash("Erreur."); return; }
    flash("Verset retiré de la collection.");
  }

  async function deleteVerse(verseId: string) {
    if (!confirm("Supprimer définitivement ce verset de tes favoris ?")) return;
    const prev = verses;
    setVerses((p) => p.filter((v) => v.id !== verseId));
    const { error } = await supabase.from("user_saved_verses").delete().eq("id", verseId);
    if (error) { setVerses(prev); flash("Erreur."); return; }
    flash("Verset supprimé.");
  }

  async function shareVerse(v: Verse) {
    const status = await shareBibleVerse({ reference: v.reference, text: v.verse_text });
    if (status === "shared") flash("Partagé !");
    else if (status === "copied") flash("Copié !");
  }

  async function saveCollectionEdit() {
    const name = draftName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("bible_verse_collections")
      .update({ name, emoji: draftEmoji || "📖" })
      .eq("id", collection.id);
    if (error) { flash("Erreur."); return; }
    setEditingName(false);
    flash("Collection mise à jour.");
    router.refresh();
  }

  async function deleteCollection() {
    if (!confirm(`Supprimer la collection « ${collection.name} » ? Les versets restent dans tes favoris.`)) return;
    const { error } = await supabase.from("bible_verse_collections").delete().eq("id", collection.id);
    if (error) { flash("Erreur."); return; }
    router.push("/bible");
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 100,
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 30px rgba(91, 33, 182,0.35)",
          fontFamily: F.body,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 18px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/bible" style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Bible</Link>
        </div>

        {/* Collection title */}
        {editingName ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 16, marginBottom: 20,
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={draftEmoji} onChange={(e) => setDraftEmoji(e.target.value)} maxLength={2}
                style={{
                  width: 50, padding: 10, textAlign: "center", fontSize: 18,
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)}
                style={{
                  flex: 1, padding: "10px 12px", fontSize: 15,
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 8, color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingName(false)} style={btnGhost}>Annuler</button>
              <button onClick={saveCollectionEdit} style={btnViolet}>Sauvegarder</button>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginBottom: 18,
          }}>
            <div style={{ fontSize: 44 }}>{collection.emoji || "📖"}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: F.title, fontSize: "clamp(1.4rem, 4.5vw, 1.9rem)",
                fontWeight: 700, color: T.text, margin: 0,
              }}>
                {collection.name}
              </h1>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
                {verses.length} verset{verses.length > 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={() => setEditingName(true)} title="Modifier" style={iconBtn}>✏️</button>
            <button onClick={deleteCollection} title="Supprimer" style={{ ...iconBtn, color: "#C24B7A" }}>🗑</button>
          </div>
        )}

        {/* Verses */}
        {verses.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16,
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📖</div>
            <div style={{ fontFamily: F.title, fontSize: 15, color: T.text, marginBottom: 6 }}>
              Aucun verset ici
            </div>
            <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 18px" }}>
              Sauvegarde des versets dans cette collection depuis le lecteur.
            </p>
            <Link href="/bible/lire" style={{
              ...btnViolet, textDecoration: "none", display: "inline-block",
            } as React.CSSProperties}>
              📖 Lire la Bible
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {verses.map((v) => (
              <div key={v.id} style={{
                background: T.card, borderLeft: `3px solid ${T.gold}`,
                borderRadius: "0 14px 14px 0",
                border: `1px solid ${T.borderSoft}`, borderLeftWidth: 3,
                padding: "14px 16px",
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 8,
                }}>
                  <Link
                    href={`/bible/read/${encodeURIComponent(v.book_name)}/${v.chapter}`}
                    style={{
                      fontSize: 13, fontWeight: 700, color: T.gold,
                      textDecoration: "none", fontFamily: F.body,
                    }}
                  >
                    {v.reference}
                  </Link>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => shareVerse(v)} title="Partager" style={iconBtn}>📤</button>
                    <button onClick={() => removeFromCollection(v.id)} title="Retirer de la collection" style={iconBtn}>📤📚</button>
                    <button onClick={() => deleteVerse(v.id)} title="Supprimer" style={{ ...iconBtn, color: "#C24B7A" }}>🗑</button>
                  </div>
                </div>
                <p style={{
                  margin: 0, fontSize: 14, color: T.textSoft,
                  lineHeight: 1.7, fontStyle: "italic", fontFamily: F.body,
                }}>
                  « {v.verse_text} »
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const btnViolet: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", border: "none",
  borderRadius: 10, padding: "10px 16px",
  fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F.body,
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: T.textMuted, border: "none",
  borderRadius: 10, padding: "10px 14px",
  fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F.body,
};
const iconBtn: React.CSSProperties = {
  background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "5px 9px",
  color: T.textSoft, fontSize: 13, cursor: "pointer",
  fontFamily: F.body,
};
