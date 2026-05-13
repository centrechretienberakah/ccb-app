"use client";
import { useState } from "react";

interface Annonce { id: string; title: string; content: string; category?: string; is_pinned?: boolean; image_url?: string; created_at: string; author_name?: string; }

const CATEGORIES = ["Tout", "Culte", "Formation", "Événement", "Pastoral", "Autre"];

function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }

export default function AnnoncesClient({ annonces }: { annonces: Annonce[] }) {
  const [filter, setFilter] = useState("Tout");
  const [expanded, setExpanded] = useState<string | null>(null);

  const pinned = annonces.filter(a => a.is_pinned);
  const rest = annonces.filter(a => !a.is_pinned);
  const filtered = filter === "Tout" ? rest : rest.filter(a => a.category === filter);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>📢 Annonces</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Actualités et informations du Centre Chrétien Berakah</p>
      </div>

      {/* Épinglés */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>📌 Épinglés</div>
          {pinned.map(a => (
            <div key={a.id} style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", padding: "18px 20px", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "rgba(212,175,55,0.2)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>📌 {a.category || "Général"}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(a.created_at)}</span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{a.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ flexShrink: 0, background: filter === c ? "var(--gold)" : "var(--card-bg)", color: filter === c ? "#000" : "var(--text-muted)", border: `1px solid ${filter === c ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(a => (
            <div key={a.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              {a.image_url && <img src={a.image_url} alt={a.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />}
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  {a.category && <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{a.category}</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{fmtDate(a.created_at)}</span>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{a.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6, overflow: "hidden", maxHeight: expanded === a.id ? "none" : 64 }}>
                  {a.content}
                </p>
                {a.content.length > 120 && (
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 0 0", marginTop: 4 }}>
                    {expanded === a.id ? "Réduire ↑" : "Lire plus ↓"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
