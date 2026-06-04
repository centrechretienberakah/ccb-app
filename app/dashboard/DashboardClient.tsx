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
  { emoji: "📖", label: "Ma Bible",         sub: "Lire & étudier la Parole",    href: "/bible",        accent: "#2563EB" },
  { emoji: "👥", label: "Communauté",       sub: "Échanges & partages",         href: "/community",    accent: "#16A34A" },
  { emoji: "📺", label: "Jesus Daily TV",   sub: "Prédications & directs",      href: "/jesus-daily",  accent: "#7C3AED" },
  { emoji: "🎓", label: "Institut Berakah", sub: "Formations & enseignements",  href: "/institut",     accent: "#6D28D9" },
  { emoji: "📅", label: "Événements",       sub: "Agenda du ministère",         href: "/events",       accent: "#0EA5E9" },
  { emoji: "💝", label: "Faire un don",     sub: "Soutenir la mission",         href: "/dons",         accent: "#DC2626" },
  { emoji: "🖼️", label: "Galerie",          sub: "Photos & souvenirs",          href: "/galerie",      accent: "#DB2777" },
  { emoji: "📚", label: "Bibliothèque",     sub: "Ressources numériques",       href: "/bibliotheque", accent: "#0891B2" },
  { emoji: "🗓️", label: "Rendez-vous",      sub: "Conseil pastoral",            href: "/rendez-vous",  accent: "#9333EA" },
  { emoji: "✨", label: "Témoignages",      sub: "Histoires transformées",      href: "/temoignages",  accent: "#CA8A04" },
  { emoji: "📬", label: "Contact",          sub: "Nous joindre",                href: "/contact",      accent: "#059669" },
  { emoji: "📡", label: "Nous suivre",      sub: "Réseaux sociaux",             href: "/nous-suivre",  accent: "#0284C7" },
  { emoji: "⛪", label: "À propos",         sub: "Notre histoire",              href: "/a-propos",     accent: "#B45309" },
];

const UPCOMING = [
  { icon: "⛪", title: "Culte du Dimanche", time: "Tous les dim. · 17h30 (Belgique)", tag: "Culte", href: "/events" },
  { icon: "🌙", title: "Nuit de Priere", time: "Prochain : 29 Mai · 23h30", tag: "Priere", href: "/prayer" },
  { icon: "🎓", title: "Bootcamp CCB 2026", time: "26 – 28 Juin 2026 · Douala & Online", tag: "Bootcamp", href: "https://bootcamp.centrechretienberakah.com" },
];

export default function DashboardClient({ displayName, devotion, devotionRead, userId }: Props) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  return (
    <div className="dashboard-page">

      {/* Bande d'accueil — accueil chaleureux (style Communauté) */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <p className="dashboard-hero-greet">{greeting} {displayName} <span aria-hidden="true">👋</span></p>
          <p className="dashboard-hero-bless">Que le Seigneur vous bénisse aujourd&apos;hui.</p>
        </div>
      </div>

      {/* Méditons ensemble — carte premium (juste sous le message de bienvenue) */}
      <DevotionHomeCard devotion={devotion} userId={userId} initialRead={devotionRead} />

      {/* Accès rapide — cartes modernes */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Accès rapide</h3>
          <span className="dashboard-section-sub">Tout à portée de main</span>
        </div>
        <div className="dashboard-actions-grid">
          {QUICK_ACTIONS.map(({ label, sub, href, accent, emoji }) => (
            <Link key={href} href={href} className="dashboard-action-card">
              <span className="dashboard-action-icon" style={{ background: `${accent}1a`, color: accent }}>{emoji}</span>
              <div className="dashboard-action-label">{label}</div>
              <div className="dashboard-action-sub">{sub}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      <div className="dashboard-section" style={{ paddingBottom: 32 }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">À venir</h3>
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
