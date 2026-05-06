"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BIBLE_VERSIONS, getVersionById, type BibleVersion } from "@/lib/bible/versions";

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

// ─── Fetch chapter via proxy ──────────────────────────────────────────────────
async function fetchChapter(bookEn: string, bookNumber: number, chapter: number, versionId: string): Promise<Verse[]> {
  const params = new URLSearchParams({
    bookNumber: String(bookNumber),
    chapter: String(chapter),
    bookEn,
    version: versionId,
  });
  const res = await fetch(`/api/bible?${params}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "BIBLE_API_KEY_REQUIRED") throw new Error("API_KEY_REQUIRED");
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.verses?.length) throw new Error("Aucun verset reçu");
  return data.verses as Verse[];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReaderClient({ bookFr, bookEn, bookNumber, chapter, totalChapters }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [versionId, setVersionId] = useState<string>("lsg");
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Persist version in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ccb-bible-version");
    if (saved && BIBLE_VERSIONS.find((v) => v.id === saved)) setVersionId(saved);
  }, []);

  function changeVersion(id: string) {
    setVersionId(id);
    localStorage.setItem("ccb-bible-version", id);
    setShowVersionPicker(false);
  }

  // Close picker on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowVersionPicker(false);
      }
    }
    if (showVersionPicker) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showVersionPicker]);

  const load = useCallback(async () => {
    setLoading(true); setFetchError(null); setVerses([]);
    try {
      const result = await fetchChapter(bookEn, bookNumber, chapter, versionId);
      setVerses(result);
    } catch (e: any) {
      setFetchError(e.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [bookEn, bookNumber, chapter, versionId]);

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

  const currentVersion = getVersionById(versionId);
  const hasPrev = chapter > 1;
  const hasNext = chapter < totalChapters;
  const isApiKeyRequired = fetchError === "API_KEY_REQUIRED";

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "Georgia, serif" }}>

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
              {bookFr} {chapter}:{selectedVerse.verse} · {currentVersion.shortLabel}
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
                navigator.clipboard?.writeText(`${bookFr} ${chapter}:${selectedVerse.verse} (${currentVersion.shortLabel}) — ${selectedVerse.text}`);
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

      {/* Sticky sub-header */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 62, zIndex: 50,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Back button */}
            <button onClick={() => router.back()} style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "6px 12px",
              color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-body)", flexShrink: 0,
            }}>
              ← Retour
            </button>

            {/* Book + chapter info */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>
                {bookFr} {chapter}
              </div>
            </div>

            {/* Font size */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => setFontSize((f) => Math.max(13, f - 1))} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 28, height: 28,
                color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}>A-</button>
              <button onClick={() => setFontSize((f) => Math.min(24, f + 1))} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 28, height: 28,
                color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}>A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter header + version selector */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 16px", textAlign: "center" }}>
        <h1 style={{
          fontFamily: "var(--font-title)",
          fontSize: "clamp(1.4rem, 4vw, 1.9rem)",
          fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px",
        }}>
          {bookFr} {chapter}
        </h1>

        {/* Version picker */}
        <div ref={pickerRef} style={{ position: "relative", display: "inline-block" }}>
          <button
            onClick={() => setShowVersionPicker((v) => !v)}
            style={{
              background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.4)",
              borderRadius: "var(--radius-full)", padding: "6px 16px",
              color: "var(--gold)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "var(--font-body)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📖 {currentVersion.shortLabel} {currentVersion.year && `· ${currentVersion.year}`}
            <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>

          {/* Dropdown */}
          {showVersionPicker && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)",
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
              minWidth: 280, zIndex: 100, overflow: "hidden",
              textAlign: "left",
            }}>
              {/* Free versions */}
              <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "uppercase" }}>
                Versions libres
              </div>
              {BIBLE_VERSIONS.filter((v) => v.source !== "apibible").map((v) => (
                <VersionRow key={v.id} version={v} active={v.id === versionId} onClick={() => changeVersion(v.id)} />
              ))}

              {/* Premium versions */}
              <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", fontFamily: "var(--font-body)", textTransform: "uppercase", borderTop: "1px solid var(--border)", marginTop: 4 }}>
                Versions modernes (clé API)
              </div>
              {BIBLE_VERSIONS.filter((v) => v.source === "apibible").map((v) => (
                <VersionRow key={v.id} version={v} active={v.id === versionId} onClick={() => changeVersion(v.id)} locked />
              ))}
              <div style={{ padding: "8px 14px 12px", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                💡 Ajoutez <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 3 }}>BIBLE_API_KEY</code> sur Vercel pour débloquer
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 120px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <style>{`@keyframes ccb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 36, height: 36, border: "3px solid var(--border)",
              borderTopColor: "var(--gold)", borderRadius: "50%",
              animation: "ccb-spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
              Chargement — {currentVersion.label}...
            </div>
          </div>
        )}

        {!loading && isApiKeyRequired && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔑</div>
            <div style={{ fontFamily: "var(--font-title)", fontSize: 17, color: "var(--text-primary)", marginBottom: 8 }}>
              Clé API requise
            </div>
            <p style={{ fontSize: 14, color: "var(--text-muted)", fontFamily: "var(--font-body)", maxWidth: 340, margin: "0 auto 20px", lineHeight: 1.6 }}>
              La version <strong>{currentVersion.label}</strong> est protégée par copyright. Elle nécessite une clé <strong>API.Bible gratuite</strong>.
            </p>
            <a href="https://scripture.api.bible/signup" target="_blank" rel="noopener" style={{
              display: "inline-block", background: "var(--gold)", color: "#000",
              borderRadius: "var(--radius-md)", padding: "10px 22px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
              textDecoration: "none", marginBottom: 10,
            }}>
              Créer une clé gratuite →
            </a>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Puis ajoutez <code>BIBLE_API_KEY</code> dans vos variables Vercel.
            </p>
            <button onClick={() => changeVersion("lsg")} style={{
              marginTop: 8, background: "var(--surface-2)", color: "var(--text-secondary)",
              border: "none", borderRadius: "var(--radius-md)", padding: "8px 18px",
              fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
            }}>
              ← Revenir à LSG
            </button>
          </div>
        )}

        {!loading && fetchError && !isApiKeyRequired && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-secondary)" }}>
              Impossible de charger ce chapitre.
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-body)" }}>
              {fetchError}
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
                <span key={v.verse} onClick={() => setSelectedVerse(v)} style={{ cursor: "pointer", display: "inline" }}>
                  <sup style={{
                    fontSize: "0.58em", color: "var(--gold)", fontWeight: 700,
                    marginRight: 3, marginLeft: 8,
                    fontFamily: "var(--font-body)", verticalAlign: "super",
                  }}>
                    {v.verse}
                  </sup>
                  <span
                    style={{ fontSize }}
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
            ← Ch. {chapter - 1}
          </button>
          <button onClick={() => router.push("/bible")} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "13px 16px",
            color: "var(--gold)", fontSize: 18, cursor: "pointer",
          }} title="Retour à la Bible">
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
            Ch. {chapter + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Version row item ─────────────────────────────────────────────────────────
function VersionRow({ version, active, onClick, locked }: {
  version: BibleVersion;
  active: boolean;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center",
        gap: 10, padding: "9px 14px",
        background: active ? "rgba(212,175,55,0.1)" : "none",
        border: "none", cursor: "pointer",
        fontFamily: "var(--font-body)", textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      <span style={{
        minWidth: 44, fontSize: 11, fontWeight: 700,
        color: active ? "var(--gold)" : "var(--text-muted)",
        background: active ? "rgba(212,175,55,0.15)" : "var(--surface-2)",
        borderRadius: "var(--radius-sm)", padding: "2px 5px", textAlign: "center",
      }}>
        {version.shortLabel}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: active ? "var(--gold)" : "var(--text-primary)", fontWeight: active ? 700 : 400 }}>
          {version.label}
        </div>
        {version.year && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{version.year}</div>
        )}
      </div>
      {active && <span style={{ color: "var(--gold)", fontSize: 14 }}>✓</span>}
      {locked && !active && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>🔒</span>}
    </button>
  );
}
