"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string; label: string; icon: string;
  title: string; subtitle?: string; href: string;
}

/** Recherche globale CCB — overlay contrôlé (ouvert depuis la TopBar). */
export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    // Réinitialise à la fermeture
    setQ(""); setResults([]); setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runSearch = useCallback((value: string) => {
    if (debRef.current) clearTimeout(debRef.current);
    const v = value.trim();
    if (v.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
  }, []);

  function onChange(v: string) { setQ(v); runSearch(v); }
  function go(href: string) { onClose(); router.push(href); }

  if (!open) return null;

  return (
    <div className="gsearch-overlay" onMouseDown={onClose}>
      <div className="gsearch-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="gsearch-inputrow">
          <span style={{ fontSize: 17 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Rechercher dans toute l'app…"
            className="gsearch-input"
          />
          <button onClick={onClose} className="gsearch-close" aria-label="Fermer">✕</button>
        </div>
        <div className="gsearch-results">
          {q.trim().length < 2 ? (
            <div className="gsearch-hint">Tape au moins 2 lettres.<br /><span style={{ opacity: 0.7 }}>Membres · Publications · Vidéos JDTV · Leçons · Bibliothèque · Événements · Méditations · Prières · Témoignages</span></div>
          ) : loading ? (
            <div className="gsearch-hint">Recherche…</div>
          ) : results.length === 0 ? (
            <div className="gsearch-hint">Aucun résultat pour « {q.trim()} ».</div>
          ) : (
            results.map((r, i) => (
              <button key={i} className="gsearch-item" onClick={() => go(r.href)}>
                <span className="gsearch-item-icon">{r.icon}</span>
                <span className="gsearch-item-body">
                  <span className="gsearch-item-title">{r.title}</span>
                  {r.subtitle && <span className="gsearch-item-sub">{r.subtitle}</span>}
                </span>
                <span className="gsearch-item-tag">{r.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <style>{`
        .gsearch-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(17,17,17,0.45); backdrop-filter: blur(2px);
          display: flex; justify-content: center;
          padding: calc(56px + env(safe-area-inset-top,0px)) 14px 14px;
          animation: gsearch-fade .15s ease both;
        }
        @keyframes gsearch-fade { from { opacity:0 } to { opacity:1 } }
        .gsearch-panel {
          width: 100%; max-width: 620px; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,0.3);
          animation: gsearch-pop .18s ease both;
        }
        @keyframes gsearch-pop { from { opacity:0; transform: translateY(-8px) } to { opacity:1; transform:none } }
        .gsearch-inputrow {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-bottom: 1px solid var(--border-subtle);
        }
        .gsearch-input {
          flex: 1; min-width: 0; border: none; outline: none; background: transparent;
          color: var(--text-primary); font-size: 15.5px; font-family: var(--font-body);
        }
        .gsearch-close {
          background: var(--surface, #f0ece3); border: none; cursor: pointer;
          width: 30px; height: 30px; border-radius: 9px; color: var(--text-muted); font-size: 15px; flex-shrink: 0;
        }
        .gsearch-results { overflow-y: auto; padding: 6px; }
        .gsearch-hint { padding: 26px 18px; text-align: center; color: var(--text-muted); font-size: 13px; line-height: 1.7; }
        .gsearch-item {
          display: flex; align-items: center; gap: 12px; width: 100%;
          background: transparent; border: none; cursor: pointer; text-align: left;
          padding: 10px 12px; border-radius: 12px; transition: background .12s;
        }
        .gsearch-item:hover { background: var(--page-bg); }
        .gsearch-item-icon { font-size: 20px; flex-shrink: 0; }
        .gsearch-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .gsearch-item-title { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gsearch-item-sub { font-size: 11.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gsearch-item-tag { font-size: 10px; font-weight: 700; color: var(--violet, #5B21B6); background: var(--violet-50, #f5f3ff); border-radius: 999px; padding: 3px 9px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
