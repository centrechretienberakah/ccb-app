"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Verse {
  verse: number;
  text: string;
}

interface Props {
  bookFr: string;
  bookEn: string;
  chapter: number;
  totalChapters: number;
  verses: Verse[];
  fetchError: boolean;
}

export default function ReaderClient({
  bookFr,
  bookEn,
  chapter,
  totalChapters,
  verses,
  fetchError,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function navigate(dir: "prev" | "next") {
    const newChap = dir === "prev" ? chapter - 1 : chapter + 1;
    if (newChap < 1 || newChap > totalChapters) return;
    router.push(`/bible/read/${encodeURIComponent(bookFr)}/${newChap}`);
  }

  async function saveVerse(v: Verse) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast("Connectez-vous pour sauvegarder des versets.");
      return;
    }
    const reference = `${bookFr} ${chapter}:${v.verse}`;
    try {
      await supabase.from("user_saved_verses").upsert(
        {
          user_id: user.id,
          book_name: bookFr,
          chapter,
          verse_number: v.verse,
          verse_text: v.text,
          reference,
        },
        { onConflict: "user_id,book_name,chapter,verse_number" }
      );
      showToast(`⭐ ${reference} sauvegardé !`);
    } catch {
      showToast("Erreur lors de la sauvegarde.");
    }
    setSelectedVerse(null);
  }

  async function addNote() {
    router.push(`/bible?tab=notes&book=${encodeURIComponent(bookFr)}&chapter=${chapter}`);
  }

  const hasPrev = chapter > 1;
  const hasNext = chapter < totalChapters;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e8e0d0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#d4af37", color: "#000", padding: "10px 24px",
          borderRadius: 30, fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap"
        }}>
          {toast}
        </div>
      )}

      {/* Verse popup */}
      {selectedVerse && (
        <div
          onClick={() => setSelectedVerse(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 1000, padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a", borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px", width: "100%", maxWidth: 600,
              border: "1px solid #2a2a2a"
            }}
          >
            <div style={{ color: "#d4af37", fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
              {bookFr} {chapter}:{selectedVerse.verse}
            </div>
            <p style={{
              fontStyle: "italic", color: "#ddd", lineHeight: 1.8,
              fontSize: 15, marginBottom: 20
            }}>
              « {selectedVerse.text} »
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => saveVerse(selectedVerse)}
                style={{
                  flex: 1, background: "linear-gradient(135deg, #d4af37, #f0c040)",
                  color: "#000", border: "none", borderRadius: 12,
                  padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer"
                }}
              >
                ⭐ Sauvegarder ce verset
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${bookFr} ${chapter}:${selectedVerse.verse} — ${selectedVerse.text}`);
                  showToast("Copié !");
                  setSelectedVerse(null);
                }}
                style={{
                  background: "#2a2a2a", color: "#aaa", border: "none",
                  borderRadius: 12, padding: "12px 16px", fontSize: 14, cursor: "pointer"
                }}
              >
                📋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #1a1a1a", padding: "12px 16px"
      }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 12
        }}>
          {/* Back */}
          <button
            onClick={() => router.push("/bible")}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 10, padding: "8px 14px",
              color: "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer",
              flexShrink: 0
            }}
          >
            ← Plan
          </button>

          {/* Title */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#d4af37" }}>
              {bookFr}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Chapitre {chapter} / {totalChapters} · LSG
            </div>
          </div>

          {/* Font size */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => setFontSize((f) => Math.max(13, f - 1))}
              style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 8, width: 30, height: 30,
                color: "#888", fontSize: 14, cursor: "pointer"
              }}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize((f) => Math.min(24, f + 1))}
              style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 8, width: 30, height: 30,
                color: "#aaa", fontSize: 16, cursor: "pointer"
              }}
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Chapter navigation — top */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <button
            onClick={() => navigate("prev")}
            disabled={!hasPrev}
            style={{
              flex: 1, background: hasPrev ? "#1a1a1a" : "#111",
              border: `1px solid ${hasPrev ? "#2a2a2a" : "#1a1a1a"}`,
              borderRadius: 12, padding: "10px",
              color: hasPrev ? "#aaa" : "#333",
              fontSize: 13, cursor: hasPrev ? "pointer" : "not-allowed"
            }}
          >
            ← Chap. {chapter - 1}
          </button>
          <button
            onClick={() => navigate("next")}
            disabled={!hasNext}
            style={{
              flex: 1, background: hasNext ? "#1a1a1a" : "#111",
              border: `1px solid ${hasNext ? "#2a2a2a" : "#1a1a1a"}`,
              borderRadius: 12, padding: "10px",
              color: hasNext ? "#aaa" : "#333",
              fontSize: 13, cursor: hasNext ? "pointer" : "not-allowed"
            }}
          >
            Chap. {chapter + 1} →
          </button>
        </div>
      </div>

      {/* Chapter title */}
      <div style={{
        maxWidth: 680, margin: "0 auto", padding: "28px 20px 16px",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-block", background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20,
          padding: "6px 18px", fontSize: 12, color: "#d4af37",
          fontFamily: "'Inter', sans-serif", marginBottom: 16, fontWeight: 600
        }}>
          {bookFr} — Chapitre {chapter}
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#f0e8d0",
          margin: 0, letterSpacing: 0.5
        }}>
          {bookFr} {chapter}
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 40px" }}>
        {fetchError ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            color: "#888", background: "#111", borderRadius: 16
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15 }}>
              Impossible de charger ce chapitre pour l'instant.
            </div>
            <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
              Vérifiez votre connexion et réessayez.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16, background: "#d4af37", color: "#000",
                border: "none", borderRadius: 10, padding: "10px 20px",
                fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif"
              }}
            >
              Réessayer
            </button>
          </div>
        ) : verses.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            color: "#888", fontFamily: "'Inter', sans-serif"
          }}>
            Chargement...
          </div>
        ) : (
          <div>
            {/* Hint */}
            <p style={{
              fontSize: 11, color: "#444", textAlign: "center",
              marginBottom: 20, fontFamily: "'Inter', sans-serif"
            }}>
              Appuyez sur un verset pour le sauvegarder ou le copier
            </p>

            {/* Verses */}
            <div style={{ lineHeight: 1.9 }}>
              {verses.map((v) => (
                <span
                  key={v.verse}
                  onClick={() => setSelectedVerse(v)}
                  style={{
                    cursor: "pointer",
                    display: "inline",
                  }}
                >
                  <sup style={{
                    fontSize: "0.6em", color: "#d4af37", fontWeight: 700,
                    marginRight: 3, marginLeft: 6,
                    fontFamily: "'Inter', sans-serif", verticalAlign: "super"
                  }}>
                    {v.verse}
                  </sup>
                  <span
                    style={{
                      fontSize: fontSize,
                      color: "#e8e0d0",
                      background: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = "rgba(212,175,55,0.1)";
                      (e.currentTarget as HTMLSpanElement).style.borderRadius = "4px";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = "none";
                    }}
                  >
                    {v.text}{" "}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(10,10,10,0.97)", backdropFilter: "blur(10px)",
        borderTop: "1px solid #1a1a1a", padding: "12px 16px 20px"
      }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", gap: 10
        }}>
          <button
            onClick={() => navigate("prev")}
            disabled={!hasPrev}
            style={{
              flex: 1,
              background: hasPrev ? "linear-gradient(135deg, #1a1a1a, #222)" : "#111",
              border: `1px solid ${hasPrev ? "#333" : "#1a1a1a"}`,
              borderRadius: 14, padding: "14px",
              color: hasPrev ? "#ccc" : "#333",
              fontSize: 14, fontWeight: 600,
              cursor: hasPrev ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            ← Chapitre {chapter - 1}
          </button>

          <button
            onClick={addNote}
            style={{
              background: "#1a1a1a", border: "1px solid #333",
              borderRadius: 14, padding: "14px 16px",
              color: "#d4af37", fontSize: 14, cursor: "pointer",
              fontFamily: "'Inter', sans-serif"
            }}
            title="Ajouter une note"
          >
            📝
          </button>

          <button
            onClick={() => navigate("next")}
            disabled={!hasNext}
            style={{
              flex: 1,
              background: hasNext
                ? "linear-gradient(135deg, #d4af37, #c9a227)"
                : "#111",
              border: "none",
              borderRadius: 14, padding: "14px",
              color: hasNext ? "#000" : "#333",
              fontSize: 14, fontWeight: 700,
              cursor: hasNext ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Chapitre {chapter + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}
