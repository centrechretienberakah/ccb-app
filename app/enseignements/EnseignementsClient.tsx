"use client";

import { useState } from "react";

export interface Sermon {
  id: string;
  title: string;
  description?: string;
  speaker: string;
  series?: string;
  scripture_ref?: string;
  video_url?: string;
  audio_url?: string;
  thumbnail_url?: string;
  duration_secs?: number;
  is_premium: boolean;
  view_count: number;
  published_at?: string;
  created_at: string;
}

function fmtDuration(secs?: number) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m} min`;
}

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function SermonCard({ sermon, isPremiumUser }: { sermon: Sermon; isPremiumUser: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const locked = sermon.is_premium && !isPremiumUser;
  const duration = fmtDuration(sermon.duration_secs);

  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      transition: "border-color 0.2s ease",
    }}>
      {/* Thumbnail ou placeholder */}
      {sermon.thumbnail_url ? (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sermon.thumbnail_url} alt={sermon.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
          {locked && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 32 }}>🔒</span>
            </div>
          )}
          {duration && (
            <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)", color: "#fff", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              {duration}
            </span>
          )}
        </div>
      ) : (
        <div style={{ height: 120, background: "linear-gradient(135deg, #1d4ed820, #1d4ed840)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ fontSize: 48 }}>{locked ? "🔒" : "🎙️"}</span>
          {duration && (
            <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              {duration}
            </span>
          )}
        </div>
      )}

      <div style={{ padding: "14px 16px" }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {sermon.series && (
            <span style={{ background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.4)", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>
              📚 {sermon.series}
            </span>
          )}
          {sermon.is_premium && (
            <span style={{ background: "rgba(212,175,55,0.15)", border: "1px solid var(--gold)", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>
              👑 Premium
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-title)", lineHeight: 1.3 }}>
          {sermon.title}
        </h3>

        {/* Speaker + ref */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🎤 {sermon.speaker}</span>
          {sermon.scripture_ref && <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>📖 {sermon.scripture_ref}</span>}
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>👁️ {sermon.view_count}</span>
        </div>

        {/* Description */}
        {sermon.description && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, display: expanded ? "block" : "-webkit-box", WebkitLineClamp: expanded ? "unset" : 2, WebkitBoxOrient: "vertical" as never, overflow: expanded ? "visible" : "hidden" }}>
            {sermon.description}
          </p>
        )}
        {sermon.description && sermon.description.length > 100 && (
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "var(--violet-light)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10, fontFamily: "inherit" }}>
            {expanded ? "Voir moins ↑" : "Voir plus ↓"}
          </button>
        )}

        {/* Action buttons */}
        {locked ? (
          <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-lg)", padding: "10px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>👑 Accès Premium requis</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sermon.video_url && (
              <a href={sermon.video_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 100, background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: "var(--radius-full)", padding: "9px 14px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                ▶️ Vidéo
              </a>
            )}
            {sermon.audio_url && (
              <a href={sermon.audio_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 100, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "9px 14px", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                🎧 Audio
              </a>
            )}
            {!sermon.video_url && !sermon.audio_url && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Médias bientôt disponibles</div>
            )}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
          {fmtDate(sermon.published_at || sermon.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function EnseignementsClient({ sermons, isPremiumUser, isAdmin }: {
  sermons: Sermon[];
  isPremiumUser: boolean;
  isAdmin: boolean;
}) {
  const [filter, setFilter] = useState<"tous" | "video" | "audio" | "premium">("tous");
  const [search, setSearch] = useState("");

  const filtered = sermons.filter((s) => {
    if (filter === "video" && !s.video_url) return false;
    if (filter === "audio" && !s.audio_url) return false;
    if (filter === "premium" && !s.is_premium) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.series ?? "").toLowerCase().includes(q) ||
        (s.scripture_ref ?? "").toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "12px 14px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "#3b82f6" : "transparent"}`,
    color: active ? "#60a5fa" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)", minHeight: "100vh" }}>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)", padding: "28px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎙️</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-title)" }}>
          Sermons & Enseignements
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          {sermons.length} message{sermons.length !== 1 ? "s" : ""} disponible{sermons.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un sermon, une série..."
          style={{ width: "100%", background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "10px 16px", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}
        />
      </div>

      {/* Tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(filter === "tous")}    onClick={() => setFilter("tous")}>    Tous ({sermons.length})</button>
          <button style={tabStyle(filter === "video")}   onClick={() => setFilter("video")}>   ▶️ Vidéo</button>
          <button style={tabStyle(filter === "audio")}   onClick={() => setFilter("audio")}>   🎧 Audio</button>
          <button style={tabStyle(filter === "premium")} onClick={() => setFilter("premium")}> 👑 Premium</button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 100px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {sermons.length === 0 ? "Les sermons arrivent bientôt." : "Aucun sermon ne correspond à votre recherche."}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {filtered.map((s) => (
              <SermonCard key={s.id} sermon={s} isPremiumUser={isPremiumUser} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
