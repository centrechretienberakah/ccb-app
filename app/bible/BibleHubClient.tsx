"use client";

import Link from "next/link";
import { useState } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";
import { createClient } from "@/lib/supabase/client";

interface SavedVerseLite {
  id: string;
  reference: string;
  verse_text: string;
  saved_at: string;
}

interface CollectionLite {
  id: string;
  name: string;
  emoji: string | null;
}

interface LastReadLite {
  book_name: string;
  chapter: number;
  read_at: string;
}

interface Props {
  lastRead: LastReadLite | null;
  chaptersRead: number;
  savedVerses: SavedVerseLite[];
  collections: CollectionLite[];
  userId: string;
}

export default function BibleHubClient({
  lastRead,
  chaptersRead,
  savedVerses,
  collections: initialCollections,
  userId,
}: Props) {
  const supabase = createClient();
  const [collections, setCollections] = useState<CollectionLite[]>(initialCollections);
  const [toast, setToast] = useState<string | null>(null);
  const [newCollName, setNewCollName] = useState("");
  const [newCollEmoji, setNewCollEmoji] = useState("📖");
  const [showNewColl, setShowNewColl] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function createCollection() {
    const name = newCollName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("bible_verse_collections")
      .insert({ user_id: userId, name, emoji: newCollEmoji || "📖" })
      .select()
      .single();
    if (error) { flash("Erreur création."); return; }
    setCollections((prev) => [data as CollectionLite, ...prev]);
    setNewCollName("");
    setNewCollEmoji("📖");
    setShowNewColl(false);
    flash(`Collection « ${name} » créée !`);
  }

  return (
    <div style={{
      background: T.bg,
      minHeight: "100vh",
      color: T.text,
      fontFamily: F.body,
      paddingBottom: 80,
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 30px rgba(90,44,160,0.35)",
          fontFamily: F.body,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 18px 20px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>📖</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Ma Bible
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            Lis, médite, sauvegarde, partage.
          </p>
        </div>

        {/* Stats banner */}
        <div style={{
          display: "flex", gap: 10, marginBottom: 20,
        }}>
          <StatChip label="Chapitres lus" value={chaptersRead} />
          <StatChip label="Versets favoris" value={savedVerses.length} />
          <StatChip label="Collections" value={collections.length} />
        </div>

        {/* Accès rapides : Reprise / Plans thématiques / Plan / Progression */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          <Link
            href={lastRead
              ? `/bible/read/${encodeURIComponent(lastRead.book_name)}/${lastRead.chapter}`
              : "/bible/lire"}
            style={{ textDecoration: "none" }}
          >
            <div style={cardSmall}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>▶️</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {lastRead ? "Reprendre" : "BIBLE"}
              </div>
              <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 14, color: T.text, marginTop: 2 }}>
                {lastRead ? `${lastRead.book_name} ${lastRead.chapter}` : "lire"}
              </div>
            </div>
          </Link>
          <Link href="/bible/theme" style={{ textDecoration: "none" }}>
            <div style={cardSmall}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🌿</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                13 thèmes
              </div>
              <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 14, color: T.text, marginTop: 2 }}>
                Plans thématiques
              </div>
            </div>
          </Link>
          <Link href="/plan-biblique" style={{ textDecoration: "none" }}>
            <div style={cardSmall}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📅</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Plan de lecture
              </div>
              <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 14, color: T.text, marginTop: 2 }}>
                Bible guidée
              </div>
            </div>
          </Link>
          <Link href="/bible/progression" style={{ textDecoration: "none" }}>
            <div style={cardSmall}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Stats & badges
              </div>
              <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 14, color: T.text, marginTop: 2 }}>
                Ma progression
              </div>
            </div>
          </Link>
        </div>

        {/* Collections */}
        <SectionTitle>📚 Mes collections</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10, marginBottom: 12,
        }}>
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/bible/collection/${c.id}`}
              style={{ ...collTile, textDecoration: "none" } as React.CSSProperties}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{c.emoji || "📖"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: F.body }}>
                {c.name}
              </div>
            </Link>
          ))}
          <button onClick={() => setShowNewColl(true)} style={{
            ...collTile,
            background: "transparent",
            border: `1.5px dashed ${T.violet}`,
            color: T.violet,
            cursor: "pointer",
          } as React.CSSProperties}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>＋</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>Nouvelle</div>
          </button>
        </div>

        {showNewColl && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: 14, marginBottom: 18,
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                placeholder="📖"
                value={newCollEmoji}
                onChange={(e) => setNewCollEmoji(e.target.value)}
                maxLength={2}
                style={{
                  width: 50, padding: "10px", textAlign: "center", fontSize: 18,
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
              <input
                placeholder="Nom (ex: Foi, Combat spirituel…)"
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCollection(); }}
                style={{
                  flex: 1, padding: "10px 12px", fontSize: 14,
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                  color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewColl(false)} style={btnLink}>Annuler</button>
              <button onClick={createCollection} style={btnViolet}>Créer</button>
            </div>
          </div>
        )}

        {/* Versets récents sauvegardés */}
        {savedVerses.length > 0 && (
          <>
            <SectionTitle>⭐ Mes versets sauvegardés</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {savedVerses.map((v) => (
                <div key={v.id} style={{
                  background: T.card, borderLeft: `3px solid ${T.gold}`,
                  borderRadius: "0 12px 12px 0", padding: "12px 14px",
                  border: `1px solid ${T.borderSoft}`, borderLeftWidth: 3,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: T.violet, marginBottom: 4,
                    fontFamily: F.body,
                  }}>
                    {v.reference}
                  </div>
                  <p style={{
                    margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.55,
                    fontStyle: "italic", fontFamily: F.body,
                  }}>
                    « {v.verse_text} »
                  </p>
                </div>
              ))}
              <Link href="/bible/lire" style={{
                ...btnViolet, textAlign: "center", textDecoration: "none",
                padding: "10px 14px",
              } as React.CSSProperties}>
                Voir tous mes versets →
              </Link>
            </div>
          </>
        )}

        {/* Recherche + Parcourir la Bible */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/bible/recherche" style={{ textDecoration: "none" }}>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: T.violetSoft, color: T.violet,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                🔍
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: F.title, fontSize: 15, fontWeight: 700,
                  color: T.text, marginBottom: 2,
                }}>
                  Rechercher
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, fontFamily: F.body }}>
                  Recherche full-text dans toute la LSG
                </div>
              </div>
              <div style={{ color: T.violet, fontSize: 18 }}>→</div>
            </div>
          </Link>

          <Link href="/bible/lire" style={{ textDecoration: "none" }}>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: "18px 18px",
              display: "flex", alignItems: "center", gap: 14,
              cursor: "pointer",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: "#fff",
              }}>
                📖
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: F.title, fontSize: 15, fontWeight: 700,
                  color: T.text, marginBottom: 2,
                }}>
                  Parcourir la Bible
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, fontFamily: F.body }}>
                  AT · NT · 66 livres · 13 versions (10 FR + 3 EN)
                </div>
              </div>
              <div style={{ color: T.violet, fontSize: 18 }}>→</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      flex: 1, background: BIBLE_THEME_CARD, padding: "10px 8px",
      borderRadius: 12, border: `1px solid ${BIBLE_THEME_BORDER}`,
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: F_TITLE, fontSize: 18, fontWeight: 700,
        color: BIBLE_THEME_VIOLET,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: BIBLE_THEME_MUTED, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
        fontFamily: F_BODY,
      }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: F_TITLE, fontSize: 13, fontWeight: 700,
      color: BIBLE_THEME_MUTED, textTransform: "uppercase",
      letterSpacing: "0.1em", margin: "6px 0 10px",
    }}>
      {children}
    </h2>
  );
}

// Constantes locales pour éviter import circulaire dans sous-composants
const BIBLE_THEME_CARD = "#FAF8F4";
const BIBLE_THEME_BORDER = "#E5DECC";
const BIBLE_THEME_VIOLET = "#5A2CA0";
const BIBLE_THEME_MUTED = "#857C95";
const F_TITLE = "var(--font-cinzel), Georgia, serif";
const F_BODY = "var(--font-montserrat), system-ui, sans-serif";

// ─── Styles partagés ─────────────────────────────────────────────────
const btnViolet: React.CSSProperties = {
  background: "#5A2CA0",
  color: "#fff",
  padding: "9px 16px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  fontFamily: F_BODY,
};
const btnLink: React.CSSProperties = {
  background: "transparent",
  color: "#857C95",
  padding: "9px 14px",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  fontFamily: F_BODY,
};
const cardSmall: React.CSSProperties = {
  background: BIBLE_THEME_CARD,
  border: `1px solid ${BIBLE_THEME_BORDER}`,
  borderRadius: 14,
  padding: "14px 14px",
  cursor: "pointer",
};
const collTile: React.CSSProperties = {
  background: BIBLE_THEME_CARD,
  border: `1px solid ${BIBLE_THEME_BORDER}`,
  borderRadius: 12,
  padding: "14px 8px",
  textAlign: "center",
  textDecoration: "none",
  color: "#1F1A33",
};
