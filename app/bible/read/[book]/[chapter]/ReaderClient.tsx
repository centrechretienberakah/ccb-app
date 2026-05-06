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
  bookNumber: number;
  chapter: number;
  totalChapters: number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
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
export default function ReaderClient({ bookFr, bookEn, bookNumber, chapter, totalChapters }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);

  const load = useCallback(async () => {
    setLoading(true); setFetchError(false); setVerses([]);
    try {
      const result = await fetchChapter(bookEn, bookNumber, chapter);
      setVerses(result);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [bookEn, bookNumber, chapter]);

  useEffect(() => { load(); }, [load]);

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
    if (!user) { showToast("Connectez-vous pour sauvegarder."); return; }
    const reference = `${bookFr} ${chapter}:${v.verse}`;
    try {
      await supabase.from("user_saved_verses").upsert(
        { user_id: user.id, book_name: bookFr, chapter, verse_number: v.verse, verse_text: v.text, reference },
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
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "Georgia, 'Times New Roman', serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "var(--gold)", color: "#000", padding: "10px 24px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 700,
          zIndex: 9999, boxShadow: "var(--shadow-gold)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* Verse popup */}
      {selectedVerse && (
        <div onClick={() => setSelectedVerse(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "20px 20px 0 0", padding: "24px 20px 40px",
            width: "100%", maxWidth: 600, boxShadow: "var(--shadow-lg)",
          }}>
            <div style={{ color: "var(--gold)", fontWeight: 700, marginBottom: 10, fontSize: 14, fontFamily: "var(--font-body)" }}>
              {bookFr} {chapter}:{selectedVerse.verse}
            </div>
            <p style={{ fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.8, fontSize: 15, marginBottom: 20 }}>
              « {selectedVerse.text} »
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveVerse(selectedVerse)} style={{
                flex: 1, background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                color: "#000", border: "none", borderRadius: "var(--radius-md)",
                padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}>
                ⭐ Sauvegarder
              </button>
              <button onClick={() => {
                navigator.clipboard?.writeText(`${bookFr} ${chapter}:${selectedVerse.verse} — ${selectedVerse.text}`);
                showToast("Copié !"); setSelectedVerse(null);
              }} style={{
                background: "var(--surface-2)", color: "var(--text-secondary)", border: "none",
                borderRadius: "var(--radius-md)", padding: "12px 18px",
                fontSize: 18, cursor: "pointer",
              }}>📋</button>
              <button onClick={() => setSelectedVerse(null)} style={{
                background: "var(--surface-2)", color: "var(--text-muted)", border: "none",
                borderRadius: "var(--radius-md)", padding: "12px 18px",
                fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)",
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Reader sub-header: book info + font controls + chapter nav */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 62, zIndex: 50,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => router.back()} style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "6px 12px",
              color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-body)", flexShrink: 0,
            }}>
              ← Plan
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>
                {bookFr}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Chapitre {chapter} / {totalChapters} · LSG 1910
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setFontSize((f) => Math.max(13, f - 1))} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 30, height: 30,
                color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}>A-</button>
              <button onClick={() => setFontSize((f) => Math.min(24, f + 1))} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 30, height: 30,
                color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}>A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter title */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 16px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-full)",
          padding: "4px 16px", fontSize: 11, color: "var(--gold)",
          fontFamily: "var(--font-body)", marginBottom: 14, fontWeight: 600, letterSpacing: "0.05em",
        }}>
          Louis Segond 1910
        </div>
        <h1 style={{
          fontFamily: "var(--font-title)",
          fontSize: "clamp(1.4rem, 4vw, 1.9rem)",
          fontWeight: 700, color: "var(--text-primary)", margin: 0,
        }}>
          {bookFr} {chapter}
        </h1>
      </div>

      {/* Content area */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 120px" }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <style>{`@keyframes ccb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 36, height: 36, border: "3px solid var(--border)",
              borderTopColor: "var(--gold)", borderRadius: "50%",
              animation: "ccb-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
              Chargement du chapitre...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-secondary)" }}>
              Impossible de charger ce chapitre.
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-body)" }}>
              Vérifiez votre connexion et réessayez.
            </p>
            <button onClick={load} style={{
              marginTop: 16, background: "var(--gold)", color: "#000",
              border: "none", borderRadius: "var(--radius-md)", padding: "10px 24px",
              fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14,
            }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Verses */}
        {!loading && !fetchError && verses.length > 0 && (
          <div>
            <p style={{
              fontSize: 11, color: "var(--text-muted)", textAlign: "center",
              marginBottom: 24, fontFamily: "var(--font-body)",
            }}>
              Appuyez sur un verset pour le sauvegarder
            </p>
            <div style={{ lineHeight: 2.1 }}>
              {verses.map((v) => (
                <span key={v.verse} onClick={() => setSelectedVerse(v)}
                  style={{ cursor: "pointer", display: "inline" }}>
                  <sup style={{
                    fontSize: "0.58em", color: "var(--gold)", fontWeight: 700,
                    marginRight: 3, marginLeft: 8,
                    fontFamily: "var(--font-body)", verticalAlign: "super",
                  }}>
                    {v.verse}
                  </sup>
                  <span style={{ fontSize }}
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

      {/* Sticky bottom chapter navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--nav-bg)", backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)", padding: "10px 16px 24px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10 }}>
          <button onClick={() => navigate("prev")} disabled={!hasPrev} style={{
            flex: 1, background: hasPrev ? "var(--surface)" : "var(--surface-2)",
            border: `1px solid ${hasPrev ? "var(--border)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-lg)", padding: "13px",
            color: hasPrev ? "var(--text-secondary)" : "var(--text-muted)",
            fontSize: 13, fontWeight: 600,
            cursor: hasPrev ? "pointer" : "not-allowed",
            fontFamily: "var(--font-body)",
          }}>
            ← Chap. {chapter - 1}
          </button>
          <button onClick={() => router.push("/bible")} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "13px 16px",
            color: "var(--gold)", fontSize: 18, cursor: "pointer",
          }} title="Retour au plan">
            📖
          </button>
          <button onClick={() => navigate("next")} disabled={!hasNext} style={{
            flex: 1,
            background: hasNext ? "linear-gradient(135deg, var(--gold-dark), var(--gold))" : "var(--surface-2)",
            border: "none",
            borderRadius: "var(--radius-lg)", padding: "13px",
            color: hasNext ? "#000" : "var(--text-muted)",
            fontSize: 13, fontWeight: 700,
            cursor: hasNext ? "pointer" : "not-allowed",
            fontFamily: "var(--font-body)",
          }}>
            Chap. {chapter + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}
