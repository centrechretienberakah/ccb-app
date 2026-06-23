"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OT_BOOKS, NT_BOOKS, type BibleBook } from "@/lib/bible/books";

/**
 * « Lire la Bible » — sélection des livres en DEUX COLONNES (Ancien Testament /
 * Nouveau Testament), tous les livres visibles immédiatement. Au clic sur un
 * livre, on choisit le chapitre ; on rejoint ensuite le lecteur existant
 * (/bible/read/[livre]/[chapitre]) sans aucune régression fonctionnelle.
 */
export default function LireBibleClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<BibleBook | null>(null);

  function openChapter(book: BibleBook, chapter: number) {
    router.push(`/bible/read/${encodeURIComponent(book.fr)}/${chapter}`);
  }

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)", paddingBottom: 40 }}>
      <style>{`
        .lire-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lire-book { transition: background .12s, color .12s, border-color .12s; }
        .lire-book:hover { background: var(--violet-soft, rgba(91,33,182,0.10)); border-color: var(--violet, #5B21B6); }
        @keyframes lire-modal-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* En-tête compact avec retour */}
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
          <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>📖 Lire la Bible</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Choisis un livre puis un chapitre</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px 0" }}>
        <div className="lire-cols">
          <Testament title="Ancien Testament" emoji="📜" books={OT_BOOKS} onSelect={setSelected} />
          <Testament title="Nouveau Testament" emoji="✝️" books={NT_BOOKS} onSelect={setSelected} />
        </div>
      </div>

      {/* Sélecteur de chapitre */}
      {selected && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,12,40,0.55)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
          <div style={{
            background: "var(--card-bg)", borderTop: "3px solid var(--gold)",
            borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560,
            maxHeight: "80vh", overflowY: "auto",
            padding: "16px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
            animation: "lire-modal-in .22s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 800, color: "var(--gold)" }}>
                {selected.fr} · {selected.chapters} chapitres
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fermer" style={{
                background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
                padding: "5px 11px", color: "var(--text-muted)", fontSize: 14, cursor: "pointer",
              }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))", gap: 6 }}>
              {Array.from({ length: selected.chapters }, (_, i) => i + 1).map((ch) => (
                <button key={ch} onClick={() => openChapter(selected, ch)} style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm, 8px)", padding: "11px 4px",
                  color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center",
                }}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Testament({ title, emoji, books, onSelect }: {
  title: string; emoji: string; books: BibleBook[]; onSelect: (b: BibleBook) => void;
}) {
  return (
    <div style={{
      background: "var(--card-bg)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg, 14px)", overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 1,
        background: "var(--violet-soft, rgba(91,33,182,0.10))",
        borderBottom: "1px solid var(--border)",
        padding: "9px 12px", fontFamily: "var(--font-title)", fontWeight: 800,
        fontSize: 12.5, color: "var(--gold)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>{emoji}</span><span>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700 }}>{books.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {books.map((b) => (
          <button key={b.fr} onClick={() => onSelect(b)} className="lire-book" style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
            background: "none", border: "none", borderBottom: "1px solid var(--border-subtle, var(--border))",
            cursor: "pointer", color: "var(--text-primary)", fontFamily: "var(--font-body)",
            padding: "9px 11px",
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.25 }}>{b.fr}</span>
            <span style={{ flexShrink: 0, fontSize: 10.5, color: "var(--text-muted)" }}>{b.chapters}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
