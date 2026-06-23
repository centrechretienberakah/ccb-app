"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BIBLE_VERSIONS, getVersionById } from "@/lib/bible/versions";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";

interface Verse { verse: number; text: string }

interface Props {
  bookFr: string;
  bookEn: string;
  bookNumber: number;
  chapter: number;
  totalChapters: number;
}

async function fetchChapter(bookEn: string, bookNumber: number, chapter: number, versionId: string): Promise<Verse[]> {
  const params = new URLSearchParams({
    bookNumber: String(bookNumber), chapter: String(chapter),
    bookEn, version: versionId,
  });
  const res = await fetch(`/api/bible?${params}`);
  if (!res.ok) throw new Error("Erreur API");
  const data = await res.json();
  return (data.verses ?? []) as Verse[];
}

export default function ParallelClient({ bookFr, bookEn, bookNumber, chapter, totalChapters }: Props) {
  const router = useRouter();
  const [leftId, setLeftId] = useState<string>("lsg");
  const [rightId, setRightId] = useState<string>("s21");
  const [left, setLeft] = useState<Verse[]>([]);
  const [right, setRight] = useState<Verse[]>([]);
  const [loadingL, setLoadingL] = useState(true);
  const [loadingR, setLoadingR] = useState(true);
  const [errL, setErrL] = useState<string | null>(null);
  const [errR, setErrR] = useState<string | null>(null);

  const loadLeft = useCallback(async () => {
    setLoadingL(true); setErrL(null);
    try {
      const v = await fetchChapter(bookEn, bookNumber, chapter, leftId);
      setLeft(v);
    } catch (e) {
      setErrL((e as Error).message);
    } finally {
      setLoadingL(false);
    }
  }, [bookEn, bookNumber, chapter, leftId]);

  const loadRight = useCallback(async () => {
    setLoadingR(true); setErrR(null);
    try {
      const v = await fetchChapter(bookEn, bookNumber, chapter, rightId);
      setRight(v);
    } catch (e) {
      setErrR((e as Error).message);
    } finally {
      setLoadingR(false);
    }
  }, [bookEn, bookNumber, chapter, rightId]);

  useEffect(() => { loadLeft(); }, [loadLeft]);
  useEffect(() => { loadRight(); }, [loadRight]);

  function navigate(dir: "prev" | "next") {
    const newChap = dir === "prev" ? chapter - 1 : chapter + 1;
    if (newChap < 1 || newChap > totalChapters) return;
    router.push(`/bible/parallel/${encodeURIComponent(bookFr)}/${newChap}`);
  }

  const hasPrev = chapter > 1;
  const hasNext = chapter < totalChapters;

  // Construit une map verseNumber → text pour aligner les colonnes
  const maxVerse = Math.max(
    left.length > 0 ? Math.max(...left.map((v) => v.verse)) : 0,
    right.length > 0 ? Math.max(...right.map((v) => v.verse)) : 0,
  );
  const leftMap = new Map(left.map((v) => [v.verse, v.text]));
  const rightMap = new Map(right.map((v) => [v.verse, v.text]));
  const verseNumbers = Array.from({ length: maxVerse }, (_, i) => i + 1);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 14px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Link href={`/bible/read/${encodeURIComponent(bookFr)}/${chapter}`} style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Lecteur simple</Link>
          <div style={{
            flex: 1, textAlign: "center", fontFamily: F.title,
            fontWeight: 700, fontSize: 16, color: T.text,
          }}>
            ⇄ {bookFr} {chapter}
          </div>
        </div>

        {/* Version selectors */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14,
        }}>
          <VersionSelect value={leftId} onChange={setLeftId} label="Colonne gauche" />
          <VersionSelect value={rightId} onChange={setRightId} label="Colonne droite" />
        </div>

        {/* Two columns */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        }}>
          {/* Left col */}
          <ColPane
            label={getVersionById(leftId).shortLabel}
            year={getVersionById(leftId).year}
            loading={loadingL}
            error={errL}
            verses={left}
          />
          {/* Right col */}
          <ColPane
            label={getVersionById(rightId).shortLabel}
            year={getVersionById(rightId).year}
            loading={loadingR}
            error={errR}
            verses={right}
          />
        </div>

        {/* Aligned synchronized scroll table — alternative mobile-friendly */}
        {!loadingL && !loadingR && left.length > 0 && right.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{
              fontFamily: F.title, fontSize: 13, fontWeight: 700,
              color: T.textMuted, textTransform: "uppercase",
              letterSpacing: "0.1em", margin: "0 0 10px",
            }}>
              📑 Verset par verset
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {verseNumbers.map((n) => (
                <div key={n} style={{
                  background: T.card, border: `1px solid ${T.borderSoft}`,
                  borderRadius: 10, padding: "10px 12px",
                  display: "grid", gridTemplateColumns: "32px 1fr 1fr", gap: 10,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    color: T.gold, fontWeight: 700, fontSize: 13,
                    paddingTop: 2,
                  }}>
                    {n}
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.6, color: T.textSoft,
                    fontFamily: "Georgia, serif",
                    borderRight: `1px solid ${T.borderSoft}`,
                    paddingRight: 8,
                  }}>
                    {leftMap.get(n) ?? <span style={{ color: T.textMuted, fontStyle: "italic" }}>—</span>}
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.6, color: T.textSoft,
                    fontFamily: "Georgia, serif",
                  }}>
                    {rightMap.get(n) ?? <span style={{ color: T.textMuted, fontStyle: "italic" }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.card, backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.border}`, padding: "10px 16px 12px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 10 }}>
          <button onClick={() => navigate("prev")} disabled={!hasPrev} style={{
            flex: 1, background: hasPrev ? T.surface2 : "transparent",
            border: `1px solid ${hasPrev ? T.border : T.borderSoft}`,
            borderRadius: 12, padding: 12,
            color: hasPrev ? T.textSoft : T.textMuted,
            fontSize: 13, fontWeight: 600,
            cursor: hasPrev ? "pointer" : "not-allowed", fontFamily: F.body,
          }}>← Ch. {chapter - 1}</button>
          <button onClick={() => router.push("/bible")} style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "12px 16px",
            color: T.gold, fontSize: 18, cursor: "pointer",
          }}>📖</button>
          <button onClick={() => navigate("next")} disabled={!hasNext} style={{
            flex: 1,
            background: hasNext ? `linear-gradient(135deg, ${T.violet}, ${T.violetDark})` : "transparent",
            border: hasNext ? "none" : `1px solid ${T.borderSoft}`,
            borderRadius: 12, padding: 12,
            color: hasNext ? "#fff" : T.textMuted,
            fontSize: 13, fontWeight: 700,
            cursor: hasNext ? "pointer" : "not-allowed", fontFamily: F.body,
          }}>Ch. {chapter + 1} →</button>
        </div>
      </div>
    </div>
  );
}

function VersionSelect({ value, onChange, label }: {
  value: string; onChange: (id: string) => void; label: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
      }}>
        {label}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", padding: "9px 12px", borderRadius: 10,
        background: T.card, border: `1px solid ${T.border}`,
        color: T.gold, fontWeight: 700, fontSize: 13,
        fontFamily: F.body, cursor: "pointer", outline: "none",
      }}>
        {BIBLE_VERSIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.shortLabel} — {v.label} {v.year ? `(${v.year})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColPane({ label, year, loading, error, verses }: {
  label: string; year?: string; loading: boolean;
  error: string | null; verses: Verse[];
}) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "14px 14px", minHeight: 200,
    }}>
      <div style={{
        fontFamily: F.title, fontSize: 13, fontWeight: 700,
        color: T.gold, marginBottom: 10, letterSpacing: "0.02em",
        borderBottom: `1px solid ${T.borderSoft}`, paddingBottom: 8,
      }}>
        {label} {year && <span style={{ color: T.textMuted, fontWeight: 400 }}>· {year}</span>}
      </div>
      {loading && (
        <div style={{ color: T.textMuted, fontSize: 12, textAlign: "center", padding: 20 }}>
          Chargement…
        </div>
      )}
      {!loading && error && (
        <div style={{ color: "#C24B7A", fontSize: 12, padding: 10 }}>
          ⚠️ {error}
        </div>
      )}
      {!loading && !error && verses.length > 0 && (
        <div style={{ fontFamily: "Georgia, serif", lineHeight: 1.7, fontSize: 13, color: T.textSoft }}>
          {verses.map((v) => (
            <span key={v.verse} style={{ display: "inline" }}>
              <sup style={{ color: T.gold, fontWeight: 700, fontSize: "0.62em", marginLeft: 6, marginRight: 2 }}>
                {v.verse}
              </sup>
              {v.text}{" "}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
