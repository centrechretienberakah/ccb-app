"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Verse {
  verse: number;
  text: string;
}

interface Props {
  bookFr: string;
  bookEn: string;
  bookNumber: number; // 1-66 for getbible.net
  chapter: number;
  totalChapters: number;
}

// ─── Bible fetch — GitHub raw LSG (CORS ok) avec fallback proxy ──────────────

async function fetchFromGitHub(bookNumber: number, chapter: number): Promise<Verse[]> {
  const padded = String(bookNumber).padStart(2, "0");
  const url = `https://raw.githubusercontent.com/Mikenslywed/Bible-Francais-Louis-Segond/main/${padded}.json`;
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error("GitHub " + res.status);
  const data = await res.json();
  const ch = (data.chapters as any[]).find((c) => c.chapter_number === chapter);
  if (!ch?.verses?.length) throw new Error("Chapitre introuvable");
  return (ch.verses as any[])
    .map((v) => ({ verse: v.verse_number, text: String(v.text).replace(/^¶\s*/, "").trim() }))
    .filter((v) => v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);
}

async function fetchFromProxy(bookEn: string, bookNumber: number, chapter: number): Promise<Verse[]> {
  const params = new URLSearchParams({ bookNumber: String(bookNumber), chapter: String(chapter), bookEn });
  const res = await fetch(`/api/bible?${params}`);
  if (!res.ok) throw new Error("Proxy " + res.status);
  const data = await res.json();
  if (!data.verses?.length) throw new Error("Aucun verset");
  return data.verses as Verse[];
}

async function fetchChapter(bookEn: string, bookNumber: number, chapter: number): Promise<Verse[]> {
  try {
    return await fetchFromGitHub(bookNumber, chapter);
  } catch {
    return await fetchFromProxy(bookEn, bookNumber, chapter);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReaderClient({
  bookFr,
  bookEn,
  bookNumber,
  chapter,
  totalChapters,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    setVerses([]);
    try {
      const result = await fetchChapter(bookEn, bookNumber, chapter);
      setVerses(result);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [bookEn, bookNumber, chapter]);

  useEffect(() => {
    load();
  }, [load]);

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
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 1000, padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a", borderRadius: "20px 20px 0 0",
              padding: "24px 20px 36px", width: "100%", maxWidth: 600,
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
                  flex: 1,
                  background: "linear-gradient(135deg, #d4af37, #f0c040)",
                  color: "#000", border: "none", borderRadius: 12,
                  padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer"
                }}
              >
                ⭐ Sauvegarder
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${bookFr} ${chapter}:${selectedVerse.verse} — ${selectedVerse.text}`
                  );
                  showToast("Copié !");
                  setSelectedVerse(null);
                }}
                style={{
                  background: "#2a2a2a", color: "#aaa", border: "none",
                  borderRadius: 12, padding: "12px 18px", fontSize: 18, cursor: "pointer"
                }}
              >
                📋
              </button>
              <button
                onClick={() => setSelectedVerse(null)}
                style={{
                  background: "#2a2a2a", color: "#aaa", border: "none",
                  borderRadius: 12, padding: "12px 18px", fontSize: 14, cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,10,0.96)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #1a1a1a", padding: "12px 16px"
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 10, padding: "8px 14px",
              color: "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0
            }}
          >
            ← Plan
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#d4af37" }}>{bookFr}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Chapitre {chapter} / {totalChapters} · LSG
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => setFontSize((f) => Math.max(13, f - 1))}
              style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 8, width: 32, height: 32,
                color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif"
              }}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize((f) => Math.min(24, f + 1))}
              style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 8, width: 32, height: 32,
                color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif"
              }}
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Top chapter nav */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => navigate("prev")} disabled={!hasPrev}
            style={{
              flex: 1, background: hasPrev ? "#1a1a1a" : "#0d0d0d",
              border: `1px solid ${hasPrev ? "#2a2a2a" : "#181818"}`,
              borderRadius: 12, padding: "10px",
              color: hasPrev ? "#888" : "#2a2a2a",
              fontSize: 13, cursor: hasPrev ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            ← Chap. {chapter - 1}
          </button>
          <button
            onClick={() => navigate("next")} disabled={!hasNext}
            style={{
              flex: 1, background: hasNext ? "#1a1a1a" : "#0d0d0d",
              border: `1px solid ${hasNext ? "#2a2a2a" : "#181818"}`,
              borderRadius: 12, padding: "10px",
              color: hasNext ? "#888" : "#2a2a2a",
              fontSize: 13, cursor: hasNext ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Chap. {chapter + 1} →
          </button>
        </div>
      </div>

      {/* Chapter title */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 16px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.25)", borderRadius: 20,
          padding: "5px 18px", fontSize: 12, color: "#d4af37",
          fontFamily: "'Inter', sans-serif", marginBottom: 14, fontWeight: 600
        }}>
          Louis Segond 1910
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f0e8d0", margin: 0 }}>
          {bookFr} {chapter}
        </h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 40px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              width: 36, height: 36, border: "3px solid #2a2a2a",
              borderTopColor: "#d4af37", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px"
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: "#888", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
              Chargement du chapitre...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div style={{
            textAlign: "center", padding: "50px 20px",
            background: "#111", borderRadius: 16
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#aaa" }}>
              Impossible de charger ce chapitre.
            </div>
            <p style={{ fontSize: 13, color: "#666", marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
              Vérifiez votre connexion et réessayez.
            </p>
            <button
              onClick={load}
              style={{
                marginTop: 16, background: "#d4af37", color: "#000",
                border: "none", borderRadius: 10, padding: "10px 24px",
                fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Verses */}
        {!loading && !fetchError && verses.length > 0 && (
          <div>
            <p style={{
              fontSize: 11, color: "#444", textAlign: "center",
              marginBottom: 20, fontFamily: "'Inter', sans-serif"
            }}>
              Appuyez sur un verset pour le sauvegarder ou le copier
            </p>
            <div style={{ lineHeight: 2 }}>
              {verses.map((v) => (
                <span
                  key={v.verse}
                  onClick={() => setSelectedVerse(v)}
                  style={{ cursor: "pointer", display: "inline" }}
                >
                  <sup style={{
                    fontSize: "0.6em", color: "#d4af37", fontWeight: 700,
                    marginRight: 3, marginLeft: 8,
                    fontFamily: "'Inter', sans-serif", verticalAlign: "super"
                  }}>
                    {v.verse}
                  </sup>
                  <span
                    style={{ fontSize, color: "#e8e0d0" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = "rgba(212,175,55,0.12)";
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
        borderTop: "1px solid #1a1a1a", padding: "12px 16px 24px"
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10 }}>
          <button
            onClick={() => navigate("prev")} disabled={!hasPrev}
            style={{
              flex: 1,
              background: hasPrev ? "#1c1c1c" : "#0d0d0d",
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
            onClick={() => router.push("/bible")}
            style={{
              background: "#1a1a1a", border: "1px solid #333",
              borderRadius: 14, padding: "14px 16px",
              color: "#d4af37", fontSize: 18, cursor: "pointer"
            }}
            title="Retour au plan"
          >
            📖
          </button>
          <button
            onClick={() => navigate("next")} disabled={!hasNext}
            style={{
              flex: 1,
              background: hasNext ? "linear-gradient(135deg, #d4af37, #c9a227)" : "#0d0d0d",
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
