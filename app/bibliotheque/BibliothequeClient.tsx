"use client";
import { useState } from "react";

interface Resource { id: string; title: string; description?: string; type: string; url: string; thumbnail_url?: string; duration_secs?: number; is_premium: boolean; download_count?: number; created_at: string; tags?: string[]; }

const TYPE_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  pdf: { emoji: "📄", label: "PDF", color: "#ef4444" },
  audio: { emoji: "🎧", label: "Audio", color: "#8b5cf6" },
  video: { emoji: "🎬", label: "Vidéo", color: "#3b82f6" },
  ebook: { emoji: "📚", label: "Livre", color: "#10b981" },
  default: { emoji: "📁", label: "Fichier", color: "#94a3b8" },
};

function fmtDur(s?: number) { if (!s) return null; const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h > 0 ? `${h}h${(m % 60).toString().padStart(2, "0")}` : `${m} min`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }

const TYPES = ["Tout", "pdf", "audio", "video", "ebook"];

export default function BibliothequeClient({ resources, isPremium }: { resources: Resource[]; isPremium: boolean; userId?: string | null }) {
  const [filter, setFilter] = useState("Tout");
  const [search, setSearch] = useState("");

  const filtered = resources.filter(r => {
    const matchType = filter === "Tout" || r.type === filter;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>📚 Bibliothèque Digitale</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>PDFs, audio, vidéos et livres pour approfondir votre foi</p>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher une ressource..." style={{ width: "100%", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "12px 16px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {TYPES.map(t => {
            const info = t === "Tout" ? null : TYPE_INFO[t] ?? TYPE_INFO.default;
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ flexShrink: 0, background: filter === t ? (info?.color ?? "var(--gold)") : "var(--card-bg)", color: filter === t ? "#fff" : "var(--text-muted)", border: `1px solid ${filter === t ? (info?.color ?? "var(--gold)") : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {info ? `${info.emoji} ${info.label}` : "Tout"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>
            {search ? `Aucun résultat pour "${search}"` : "Aucune ressource disponible pour le moment."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map(r => {
            const info = TYPE_INFO[r.type] ?? TYPE_INFO.default;
            const locked = r.is_premium && !isPremium;
            const dur = fmtDur(r.duration_secs);
            return (
              <div key={r.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Thumbnail */}
                <div style={{ height: 120, background: `linear-gradient(135deg, ${info.color}18, ${info.color}30)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
                  {r.thumbnail_url ? (
                    <img loading="lazy" decoding="async" src={r.thumbnail_url} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  ) : <span style={{ fontSize: 42 }}>{locked ? "🔒" : info.emoji}</span>}
                  <span style={{ position: "absolute", top: 8, right: 8, background: info.color, color: "#fff", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{info.label}</span>
                  {dur && <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 10 }}>{dur}</span>}
                  {r.is_premium && <span style={{ position: "absolute", top: 8, left: 8, background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>👑 Premium</span>}
                </div>
                <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.title}</h3>
                  {r.description && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{r.description}</p>}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: "auto" }}>
                    {fmtDate(r.created_at)} · ⬇️ {r.download_count ?? 0}
                  </div>
                  {locked ? (
                    <a href="/premium" style={{ display: "block", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "8px", fontSize: 12, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
                      👑 Débloquer Premium
                    </a>
                  ) : (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: info.color, color: "#fff", borderRadius: "var(--radius-full)", padding: "8px", fontSize: 12, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
                      {r.type === "video" ? "▶️ Regarder" : r.type === "audio" ? "🎧 Écouter" : "📖 Lire"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium CTA */}
      {!isPremium && (
        <div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>👑</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 14px" }}>Accédez à toutes les ressources premium avec le Passe Berakah</p>
          <a href="/premium" style={{ display: "inline-block", background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Découvrir Premium →
          </a>
        </div>
      )}
    </div>
  );
}
