"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";

interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
}

interface SearchResponse {
  results?: SearchResult[];
  total?: number;
  query?: string;
  error?: string;
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bible/search?q=${encodeURIComponent(q)}&limit=80`);
      const json: SearchResponse = await res.json();
      setData(json);
    } catch {
      setData({ error: "Erreur réseau" });
    } finally {
      setBusy(false);
    }
  }

  function highlight(text: string, q: string): React.ReactNode {
    const norm = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const terms = norm.split(/\s+/).filter((t) => t.length >= 2);
    if (terms.length === 0) return text;
    // Match case-insensitive sur version normalisée
    const lowerText = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const parts: Array<{ s: string; hl: boolean }> = [];
    let cursor = 0;
    while (cursor < text.length) {
      let foundAt = -1;
      let foundLen = 0;
      for (const t of terms) {
        const idx = lowerText.indexOf(t, cursor);
        if (idx >= 0 && (foundAt < 0 || idx < foundAt)) {
          foundAt = idx;
          foundLen = t.length;
        }
      }
      if (foundAt < 0) {
        parts.push({ s: text.slice(cursor), hl: false });
        break;
      }
      if (foundAt > cursor) parts.push({ s: text.slice(cursor, foundAt), hl: false });
      parts.push({ s: text.slice(foundAt, foundAt + foundLen), hl: true });
      cursor = foundAt + foundLen;
    }
    return parts.map((p, i) =>
      p.hl
        ? <mark key={i} style={{ background: T.hlYellow, color: T.text, padding: "0 2px", borderRadius: 3 }}>{p.s}</mark>
        : <span key={i}>{p.s}</span>,
    );
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/bible" style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Bible</Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🔍</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.4rem, 4.5vw, 1.9rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Rechercher
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            Tape un mot ou une expression — recherche dans toute la Bible (LSG)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={runSearch} style={{
          display: "flex", gap: 8, marginBottom: 18,
        }}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ex: amour, foi, berger, espérance…"
            autoFocus
            style={{
              flex: 1, padding: "12px 14px",
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 15,
              fontFamily: F.body, outline: "none",
            }}
          />
          <button type="submit" disabled={busy || query.trim().length < 2} style={{
            background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
            color: "#fff", border: "none", borderRadius: 12,
            padding: "0 22px", fontWeight: 700, fontSize: 14,
            cursor: busy ? "wait" : "pointer", fontFamily: F.body,
            opacity: query.trim().length < 2 ? 0.5 : 1,
          }}>
            {busy ? "…" : "Chercher"}
          </button>
        </form>

        {/* Hints */}
        {!data && !busy && (
          <div style={{
            background: T.card, border: `1px solid ${T.borderSoft}`,
            borderRadius: 12, padding: 14, fontSize: 12,
            color: T.textMuted, lineHeight: 1.6,
          }}>
            💡 <strong style={{ color: T.text }}>Astuce :</strong> tape plusieurs mots pour affiner.
            La 1ère recherche peut prendre 3-5 secondes (chargement de la Bible en mémoire),
            puis instantanée.
          </div>
        )}

        {busy && (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <style>{`@keyframes ccb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 32, height: 32, border: `3px solid ${T.border}`,
              borderTopColor: T.violet, borderRadius: "50%",
              animation: "ccb-spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <div style={{ color: T.textMuted, fontSize: 13 }}>
              Recherche dans la Bible…
            </div>
          </div>
        )}

        {data?.error && (
          <div style={{
            background: "rgba(194,75,122,0.1)", border: "1px solid rgba(194,75,122,0.3)",
            color: "#C24B7A", borderRadius: 12, padding: 14, fontSize: 13,
          }}>
            ⚠️ {data.error}
          </div>
        )}

        {data?.results && (
          <>
            <div style={{
              fontSize: 12, color: T.textMuted, marginBottom: 12,
              fontWeight: 600,
            }}>
              {data.total === 0
                ? "Aucun résultat."
                : `${data.total} résultat${(data.total ?? 0) > 1 ? "s" : ""}${(data.total ?? 0) > data.results.length ? ` (top ${data.results.length} affichés)` : ""}`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.results.map((r, i) => (
                <Link
                  key={`${r.book}-${r.chapter}-${r.verse}-${i}`}
                  href={`/bible/read/${encodeURIComponent(r.book)}/${r.chapter}`}
                  style={{
                    textDecoration: "none", color: T.text, display: "block",
                  }}
                >
                  <div style={{
                    background: T.card, border: `1px solid ${T.borderSoft}`,
                    borderLeft: `3px solid ${T.gold}`,
                    borderRadius: "0 12px 12px 0",
                    padding: "12px 14px",
                  }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: T.gold,
                      marginBottom: 5, fontFamily: F.body,
                    }}>
                      {r.book} {r.chapter}:{r.verse}
                    </div>
                    <p style={{
                      margin: 0, fontSize: 14, color: T.textSoft,
                      lineHeight: 1.6, fontFamily: F.body,
                    }}>
                      {highlight(r.text, query)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
