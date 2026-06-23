"use client";

import type { CSSProperties } from "react";

export interface Reactor {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

// Modale « qui a réagi » réutilisable (likes, Amen, 🔥, intercessions…).
// Theme-agnostique : utilise les variables globales (résolues en sombre).
export default function ReactorsModal({
  title, people, loading, onClose,
}: {
  title: string;
  people: Reactor[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={overlay} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={head}>
          <span style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: 15, color: "var(--gold-light)" }}>
            {title}
          </span>
          <button onClick={onClose} aria-label="Fermer" style={closeBtn}>✕</button>
        </div>
        {loading ? (
          <div style={empty}>Chargement…</div>
        ) : people.length === 0 ? (
          <div style={empty}>Personne pour l&apos;instant.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: "60vh" }}>
            {people.map((p) => (
              <a key={p.user_id} href={`/community/profil/${p.user_id}`} style={row}>
                {p.avatar_url ? (
                  <img loading="lazy" decoding="async" src={p.avatar_url} alt="" style={av} />
                ) : (
                  <span style={{ ...av, ...avFallback }}>{(p.display_name || "?").slice(0, 1).toUpperCase()}</span>
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                  {p.display_name || "Membre"}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
};
const sheet: CSSProperties = {
  width: "100%", maxWidth: 460, maxHeight: "75vh",
  background: "var(--card-bg)", border: "1px solid var(--border)",
  borderRadius: "18px 18px 0 0", padding: "16px 16px 24px",
  boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
  display: "flex", flexDirection: "column", gap: 10,
};
const head: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const closeBtn: CSSProperties = {
  background: "none", border: "none", color: "var(--text-muted)",
  fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4,
};
const empty: CSSProperties = { textAlign: "center", padding: "28px 12px", color: "var(--text-muted)", fontSize: 13.5 };
const row: CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, padding: "8px 6px",
  textDecoration: "none", borderRadius: 10,
};
const av: CSSProperties = { width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 };
const avFallback: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg, var(--violet), var(--gold))",
  color: "#1a1206", fontWeight: 800, fontSize: 14,
};
