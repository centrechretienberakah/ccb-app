"use client";
import { useState } from "react";

interface Event { id: string; title: string; description?: string; event_date: string; location?: string; cover_image_url?: string; }

const YOUTUBE_CHANNEL_ID = "UCxxxxxxxxxxxxxxxxxx"; // À remplacer par le vrai ID
const LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&autoplay=1`;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default function LiveClient({ upcomingEvents }: { upcomingEvents: Event[] }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 10px #ef4444", animation: "pulse 1.5s infinite" }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Cultes en Direct</h1>
        <span style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", borderRadius: "var(--radius-full)", padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
          LIVE
        </span>
      </div>

      {/* Player */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: 24, border: "1px solid var(--border)" }}>
        <iframe
          src="https://www.youtube.com/embed?listType=user_uploads&list=centrechretienberakah&autoplay=0"
          title="CCB Live Stream"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
        <a href="https://youtube.com/@centrechretienberakah" target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, minWidth: 140, background: "#FF0000", color: "#fff", borderRadius: "var(--radius-full)", padding: "11px 20px", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none" }}>
          ▶️ Voir sur YouTube
        </a>
        <button onClick={() => setChatOpen(!chatOpen)}
          style={{ flex: 1, minWidth: 140, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "var(--radius-full)", padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          💬 {chatOpen ? "Fermer le chat" : "Ouvrir le chat live"}
        </button>
        <a href="/prayer" style={{ flex: 1, minWidth: 140, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "11px 20px", fontWeight: 700, fontSize: 14, textAlign: "center", textDecoration: "none" }}>
          🙏 Mur de prière
        </a>
      </div>

      {/* Chat embed */}
      {chatOpen && (
        <div style={{ marginBottom: 32, borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border)", height: 400 }}>
          <iframe
            src="https://www.youtube.com/live_chat?is_popout=1&v=live"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Live Chat"
          />
        </div>
      )}

      {/* Programme */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
        📅 Prochains Cultes
      </h2>

      {/* Programme régulier — toujours visible */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {[
          { icon: "⛪", title: "Culte du Dimanche", time: "Tous les dimanches · 17h30 (Belgique)", sub: "En ligne — partout dans le monde", accent: "#ef4444", href: null },
          { icon: "🌙", title: "Nuit de Prière", time: "Dernier vendredi du mois · 23h30 (Belgique)", sub: "Prochain : 29 Mai 2026 · Intercession collective", accent: "var(--gold)", href: "/prayer" },
          { icon: "🎓", title: "Bootcamp Annuel CCB 2026", time: "26 – 28 Juin 2026 · Douala, Cameroun & En ligne", sub: "SEMBLABLE À CHRIST · Romains 8:29", accent: "var(--gold)", href: "https://bootcamp.centrechretienberakah.com" },
        ].map((item) => (
          <div key={item.title} style={{ display: "flex", gap: 16, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", alignItems: "center" }}>
            <div style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}40`, borderRadius: "var(--radius-lg)", padding: "10px 12px", textAlign: "center", flexShrink: 0, fontSize: 22 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: item.accent, fontWeight: 600, marginBottom: 2 }}>{item.time}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.sub}</div>
            </div>
            {item.href && (
              <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                style={{ background: `${item.accent}18`, border: `1px solid ${item.accent}40`, color: item.accent, borderRadius: "var(--radius-full)", padding: "6px 14px", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                Rejoindre →
              </a>
            )}
          </div>
        ))}
      </div>

      {upcomingEvents.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Aucun événement ponctuel programmé en ce moment.<br/>Rejoignez-nous le dimanche à 17h30 (heure Belgique) pour le culte hebdomadaire.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {upcomingEvents.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 16, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "16px 20px", alignItems: "center" }}>
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-lg)", padding: "10px 14px", textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{new Date(e.event_date).getDate()}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {new Date(e.event_date).toLocaleDateString("fr-FR", { month: "short" })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  🕐 {fmtDate(e.event_date)} {e.location && `· 📍 ${e.location}`}
                </div>
              </div>
              <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "var(--radius-full)", padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
                🔔 Rappel
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rediffusions */}
      <div style={{ marginTop: 32, padding: 20, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📼</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 14px" }}>Vous avez manqué un culte ? Toutes nos rediffusions sont disponibles sur notre chaîne.</p>
        <a href="https://youtube.com/@centrechretienberakah" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", background: "#FF0000", color: "#fff", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Voir toutes les rediffusions →
        </a>
      </div>
    </div>
  );
}
