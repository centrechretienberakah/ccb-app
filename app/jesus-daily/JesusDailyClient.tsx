"use client";
import { useState } from "react";

interface Video { id: string; date: string; title: string; scripture: string; theme: string; youtubeId: string; tiktokUrl: string; content: string; emoji: string; }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function JesusDailyClient({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(videos[0]);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const text = `🔥 Jesus Daily — ${active.title}\n\n"${active.content}"\n\n📖 ${active.scripture}\n\n📱 Centre Chrétien Berakah`;
    try { await navigator.share({ text, title: "Jesus Daily — CCB" }); }
    catch { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 2000); }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, var(--gold), #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 4px" }}>
          Jesus Daily
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Un message d&apos;évangélisation chaque matin — 45 secondes pour partager l&apos;Évangile</p>
      </div>

      {/* Featured Card */}
      <div style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(245,158,11,0.08))", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", padding: "28px 24px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 100, opacity: 0.06 }}>{active.emoji}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.4)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            📅 {fmtDate(active.date)}
          </span>
          <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            🏷️ {active.theme}
          </span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px" }}>{active.emoji} {active.title}</h2>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>
          &ldquo;{active.content}&rdquo;
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>📖 {active.scripture}</span>
        </div>
      </div>

      {/* YouTube embed si disponible */}
      {active.youtubeId && (
        <div style={{ position: "relative", paddingBottom: "177.78%", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: 24, background: "#000" }}>
          <iframe src={`https://www.youtube.com/embed/${active.youtubeId}`} title={active.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
        <button onClick={handleShare} style={{ flex: 1, background: "var(--gold)", color: "#000", border: "none", borderRadius: "var(--radius-full)", padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {shared ? "✅ Copié !" : "📤 Partager ce message"}
        </button>
        <a href="https://youtube.com/@centrechretienberakah" target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: "#FF0000", color: "#fff", borderRadius: "var(--radius-full)", padding: "12px 20px", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          ▶️ Voir sur YouTube
        </a>
      </div>

      {/* Archives */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
        📅 Messages récents
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {videos.map((v) => (
          <button key={v.id} onClick={() => setActive(v)}
            style={{ display: "flex", gap: 14, alignItems: "center", background: active.id === v.id ? "rgba(212,175,55,0.1)" : "var(--card-bg)", border: `1px solid ${active.id === v.id ? "rgba(212,175,55,0.4)" : "var(--border)"}`, borderRadius: "var(--radius-xl)", padding: "14px 18px", cursor: "pointer", textAlign: "left", width: "100%" }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{v.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{v.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📖 {v.scripture} · {fmtDate(v.date)}</div>
            </div>
            {active.id === v.id && <span style={{ color: "var(--gold)", fontSize: 16 }}>▶</span>}
          </button>
        ))}
      </div>

      {/* CTA TikTok */}
      <div style={{ marginTop: 32, padding: 20, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🎵</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 14px" }}>Retrouvez tous nos Jesus Daily en format vidéo sur TikTok et YouTube Shorts</p>
        <a href="https://tiktok.com/@jesusdaily_ccb" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", background: "linear-gradient(135deg, #69C9D0, #EE1D52)", color: "#fff", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Nous suivre sur TikTok →
        </a>
      </div>
    </div>
  );
}
