"use client";

import Link from "next/link";
import { IconCalendar } from "@/components/icons";
import DevotionHomeCard from "./DevotionHomeCard";
import type { UnifiedDevotion } from "@/lib/devotion/fetch";

interface Props {
  displayName: string;
  avatarUrl: string | null;
  email?: string | null;
  role?: string;
  devotion: UnifiedDevotion;
  devotionRead: boolean;
  userId: string | null;
}

const QUICK_ACTIONS = [
  { emoji: "📖", label: "Ma Bible", sub: "Lire & Plan de lecture", href: "/bible", gradient: "linear-gradient(145deg, #1e3a5f 0%, #1e40af 55%, #3b82f6 100%)", glow: "rgba(59,130,246,0.35)" },
  { emoji: "👥", label: "Communaute", sub: "Echanges & partages", href: "/community", gradient: "linear-gradient(145deg, #14532d 0%, #16a34a 55%, #4ade80 100%)", glow: "rgba(74,222,128,0.35)" },
  { emoji: "📺", label: "Jesus Daily TV", sub: "Predications & live", href: "/jesus-daily", gradient: "linear-gradient(145deg, #3d1a72 0%, #5a2ca0 55%, #a78bfa 100%)", glow: "rgba(167,139,250,0.35)" },
  { emoji: "🎓", label: "Institut Berakah", sub: "Formations & cursus", href: "/institut", gradient: "linear-gradient(145deg, #3e1c70 0%, #7c3aed 55%, #d4af37 100%)", glow: "rgba(212,175,55,0.35)" },
  { emoji: "📅", label: "Evenements", sub: "Calendrier CCB", href: "/events", gradient: "linear-gradient(145deg, #064e3b 0%, #059669 55%, #34d399 100%)", glow: "rgba(52,211,153,0.35)" },
  { emoji: "💝", label: "Faire un don", sub: "Soutenir le ministere", href: "/dons", gradient: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 55%, #f87171 100%)", glow: "rgba(248,113,113,0.35)" },
  { emoji: "🖼️", label: "Galerie", sub: "Photos & souvenirs", href: "/galerie", gradient: "linear-gradient(145deg, #831843 0%, #db2777 55%, #f9a8d4 100%)", glow: "rgba(249,168,212,0.35)" },
  { emoji: "📚", label: "Bibliotheque", sub: "Ressources digitales", href: "/bibliotheque", gradient: "linear-gradient(145deg, #164e63 0%, #0891b2 55%, #67e8f9 100%)", glow: "rgba(103,232,249,0.35)" },
  { emoji: "🗓️", label: "Rendez-vous", sub: "Conseil pastoral", href: "/rendez-vous", gradient: "linear-gradient(145deg, #4c1d95 0%, #7c3aed 55%, #c4b5fd 100%)", glow: "rgba(196,181,253,0.35)" },
  { emoji: "✨", label: "Temoignages", sub: "Gloire a Dieu", href: "/temoignages", gradient: "linear-gradient(145deg, #713f12 0%, #ca8a04 55%, #fde047 100%)", glow: "rgba(253,224,71,0.35)" },
  { emoji: "📬", label: "Contact", sub: "Nous joindre", href: "/contact", gradient: "linear-gradient(145deg, #064e3b 0%, #059669 55%, #6ee7b7 100%)", glow: "rgba(110,231,183,0.35)" },
  { emoji: "📡", label: "Nous suivre", sub: "Reseaux sociaux", href: "/nous-suivre", gradient: "linear-gradient(145deg, #0c4a6e 0%, #0ea5e9 55%, #7dd3fc 100%)", glow: "rgba(125,211,252,0.35)" },
  { emoji: "⛪", label: "A propos", sub: "Notre histoire", href: "/a-propos", gradient: "linear-gradient(145deg, #431407 0%, #b45309 55%, #fcd34d 100%)", glow: "rgba(180,83,9,0.35)" },
];

const UPCOMING = [
  { icon: "⛪", title: "Culte du Dimanche", time: "Tous les dim. · 17h30 (Belgique)", tag: "Culte", href: "/events" },
  { icon: "🌙", title: "Nuit de Priere", time: "Prochain : 29 Mai · 23h30", tag: "Priere", href: "/prayer" },
  { icon: "🎓", title: "Bootcamp CCB 2026", time: "26 – 28 Juin 2026 · Douala & Online", tag: "Bootcamp", href: "https://bootcamp.centrechretienberakah.com" },
];

export default function DashboardClient({ displayName, avatarUrl, devotion, devotionRead, userId }: Props) {
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon apres-midi";
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
        </div>
      </div>

      {/* Méditons ensemble — carte premium (juste sous le message de bienvenue) */}
      <DevotionHomeCard devotion={devotion} userId={userId} initialRead={devotionRead} />

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
      <div className="dashboard-section" style={{ paddingBottom: 32 }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">A venir</h3>
          <Link href="/events" className="dashboard-see-all">Voir tout</Link>
        </div>
        <div className="dashboard-upcoming-list">
          {UPCOMING.map(({ icon, title, time, tag, href }) => (
            <Link key={title} href={href} style={{ textDecoration: "none" }}>
              <div className="dashboard-upcoming-item">
                <div className="dashboard-upcoming-icon">{icon}</div>
                <div className="dashboard-upcoming-info">
                  <div className="dashboard-upcoming-title">{title}</div>
                  <div className="dashboard-upcoming-time">
                    <IconCalendar size={12} />
                    {time}
                  </div>
                </div>
                <span className="dashboard-upcoming-tag">{tag}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
