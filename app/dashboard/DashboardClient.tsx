"use client";

import Link from "next/link";
import {
  IconBook, IconHeart, IconUsers, IconSun, IconPlay,
  IconGraduationCap, IconBookmark, IconRadio,
  IconStar, IconTrendingUp, IconCalendar, IconZap, IconBell,
} from "@/components/icons";

interface Props {
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  role?: string;
}

const QUICK_ACTIONS = [
  { emoji: "☀️", label: "Dévotion du jour", sub: "Commence ta journée", href: "/devotion", gradient: "linear-gradient(145deg, #92400e 0%, #d97706 55%, #fbbf24 100%)", glow: "rgba(251,191,36,0.35)" },
  { emoji: "📖", label: "Bible", sub: "Lire les Écritures", href: "/bible", gradient: "linear-gradient(145deg, #1e3a5f 0%, #1e40af 55%, #3b82f6 100%)", glow: "rgba(59,130,246,0.35)" },
  { emoji: "🙏", label: "Prière", sub: "Intercession & demandes", href: "/prayer", gradient: "linear-gradient(145deg, #4c0519 0%, #9f1239 55%, #fb7185 100%)", glow: "rgba(251,113,133,0.35)" },
  { emoji: "👥", label: "Communauté", sub: "Échanges & partages", href: "/community", gradient: "linear-gradient(145deg, #14532d 0%, #16a34a 55%, #4ade80 100%)", glow: "rgba(74,222,128,0.35)" },
  { emoji: "🎬", label: "Jesus Daily", sub: "Vidéos prophétiques", href: "/jesus-daily", gradient: "linear-gradient(145deg, #3d1a72 0%, #5a2ca0 55%, #a78bfa 100%)", glow: "rgba(167,139,250,0.35)" },
  { emoji: "🎓", label: "Classes", sub: "Formation biblique", href: "/classes", gradient: "linear-gradient(145deg, #164e63 0%, #0891b2 55%, #22d3ee 100%)", glow: "rgba(34,211,238,0.35)" },
  { emoji: "📡", label: "Live", sub: "Cultes en direct", href: "/live", gradient: "linear-gradient(145deg, #1e1b4b 0%, #4338ca 55%, #818cf8 100%)", glow: "rgba(129,140,248,0.35)" },
];

const STATS = [
  { icon: IconStar, label: "Jours consécutifs", value: "7", sub: "🔥 Ta série continue !", color: "var(--gold)" },
  { icon: IconTrendingUp, label: "Chapitres lus", value: "42", sub: "ce mois-ci", color: "var(--violet)" },
  { icon: IconHeart, label: "Prières partagées", value: "12", sub: "cette semaine", color: "#f87171" },
  { icon: IconUsers, label: "Membres actifs", value: "148", sub: "dans ta communauté", color: "#34d399" },
];

const UPCOMING = [
  { icon: "⛪", title: "Culte dominical", time: "Dimanche 10h00", tag: "LIVE" },
  { icon: "📖", title: "Étude biblique", time: "Mercredi 19h30", tag: "Classe" },
  { icon: "🙏", title: "Nuit de prière", time: "Vendredi 22h00", tag: "Prière" },
];

export default function DashboardClient({ displayName, avatarUrl, email, role }: Props) {
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  return (
    <div className="dashboard-page">

      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-orb dashboard-hero-orb-1" />
        <div className="dashboard-hero-orb dashboard-hero-orb-2" />
        <div className="dashboard-hero-inner">
          <div className="dashboard-avatar-wrap">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="dashboard-avatar-img" />
            ) : (
              <div className="dashboard-avatar-initials">{initials}</div>
            )}
            <span className="dashboard-avatar-badge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-officiel.png" alt="" className="dashboard-badge-logo" />
            </span>
          </div>
          <div className="dashboard-hero-text">
            <p className="dashboard-greeting">{greeting},</p>
            <h2 className="dashboard-name">{displayName}</h2>
            <p className="dashboard-verse">
              Que ta parole soit une lampe a mes pieds — Ps 119:105
            </p>
          </div>
          <button className="dashboard-notif-btn">
            <IconBell size={20} />
            <span className="dashboard-notif-badge">3</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-section">
        <div className="dashboard-stats-grid">
          {STATS.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="dashboard-stat-card">
              <div className="dashboard-stat-icon" style={{ color }}><Icon size={22} /></div>
              <div className="dashboard-stat-value" style={{ color }}>{value}</div>
              <div className="dashboard-stat-label">{label}</div>
              <div className="dashboard-stat-sub">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Acces rapide</h3>
          <span className="dashboard-section-sub">Tout a portee de main</span>
        </div>
        <div className="dashboard-actions-grid">
          {QUICK_ACTIONS.map(({ label, sub, href, gradient, glow, emoji }) => (
            <Link key={href} href={href} className="dashboard-action-card" style={{ "--card-glow": glow } as React.CSSProperties}>
              <div className="dashboard-action-bg" style={{ background: gradient }} />
              <div className="dashboard-action-orb" style={{ background: glow }} />
              <div className="dashboard-action-content">
                <span className="dashboard-action-emoji">{emoji}</span>
                <div className="dashboard-action-label">{label}</div>
                <div className="dashboard-action-sub">{sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">A venir</h3>
          <Link href="/events" className="dashboard-see-all">Voir tout →</Link>
        </div>
        <div className="dashboard-upcoming-list">
          {UPCOMING.map(({ icon, title, time, tag }) => (
            <div key={title} className="dashboard-upcoming-item">
              <div className="dashboard-upcoming-icon">{icon}</div>
              <div className="dashboard-upcoming-info">
                <div className="dashboard-upcoming-title">{title}</div>
                <div className="dashboard-upcoming-time"><IconCalendar size={12} />{time}</div>
              </div>
              <span className="dashboard-upcoming-tag">{tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin shortcut — admin uniquement */}
      {role === "admin" && (
        <div className="dashboard-section">
          <Link
            href="/admin"
            style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "1rem 1.25rem", borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(124,58,237,0.12))",
              border: "1px solid rgba(212,175,55,0.3)", textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>⚙️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--gold)" }}>
                Dashboard Admin
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Membres · Publications · Prieres · Devotions
              </div>
            </div>
            <span style={{ color: "var(--gold)", fontSize: "1.1rem" }}>→</span>
          </Link>
        </div>
      )}

      {/* Premium CTA */}
      <div className="dashboard-section">
        <div className="dashboard-premium-cta">
          <div className="dashboard-premium-cta-orb" />
          <div className="dashboard-premium-cta-left">
            <span className="dashboard-premium-cta-crown">👑</span>
            <div>
              <div className="dashboard-premium-cta-title">Passe au Premium</div>
              <div className="dashboard-premium-cta-desc">
                Acces illimite · Classes exclusives · Groupes prives
              </div>
            </div>
          </div>
          <Link href="/premium" className="dashboard-premium-cta-btn">
            <IconZap size={14} />
            Debloquer
          </Link>
        </div>
      </div>

    </div>
  );
}
