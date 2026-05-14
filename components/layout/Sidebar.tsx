"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IconUser, IconSettings, IconLogOut,
} from "@/components/icons";

// Toutes les rubriques — ordre alphabétique (Accueil en premier)
const ALL_ITEMS = [
  { href: "/dashboard",     label: "Accueil",           emoji: "🏠" },
  { href: "/annonces",      label: "Annonces",          emoji: "📢" },
  { href: "/bible",         label: "Ma Bible",          emoji: "📖" },
  { href: "/bibliotheque",  label: "Bibliothèque",      emoji: "📚" },
  { href: "/community",     label: "Communauté",        emoji: "👥" },
  { href: "/contact",       label: "Contact",           emoji: "📬" },
  { href: "/devotion",      label: "Dévotion",          emoji: "☀️" },
  { href: "/enseignements", label: "Enseignements",     emoji: "🎙️" },
  { href: "/events",        label: "Événements",        emoji: "📅" },
  { href: "/dons",          label: "Faire un Don",      emoji: "💝" },
  { href: "/galerie",       label: "Galerie",           emoji: "🖼️" },
  { href: "/groupes",       label: "Groupes",           emoji: "🤝" },
  { href: "/jesus-daily",   label: "Jesus Daily",       emoji: "🎬" },
  { href: "/live",          label: "Live",              emoji: "📡" },
  { href: "/notifications", label: "Notifications",     emoji: "🔔" },
  { href: "/premium",       label: "Premium",           emoji: "👑" },
  { href: "/prayer",        label: "Prière",            emoji: "🙏" },
  { href: "/rendez-vous",   label: "Rendez-vous",       emoji: "🗓️" },
  { href: "/classes",       label: "Salle de classe",   emoji: "🎓" },
  { href: "/temoignages",   label: "Témoignages",       emoji: "✨" },
];

export default function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("user_roles").select("role").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (data?.role === "admin" || data?.role === "leader") setIsAdmin(true);
        });
    });
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-officiel.png" alt="CCB" className="sidebar-logo-img" />
        </div>
        <div>
          <div className="sidebar-logo-title">CCB</div>
          <div className="sidebar-logo-sub">Centre Chrétien Berakah</div>
        </div>
      </div>

      {/* Menu — ordre alphabétique */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">MENU</div>
        {ALL_ITEMS.map(({ href, label, emoji }) => {
          const active = isActive(href);
          return (
            <Link
              key={href} href={href}
              className={`sidebar-link ${active ? "active" : ""}`}
              data-label={label}
              onClick={onLinkClick}
            >
              <span style={{ fontSize: 16, width: 18, textAlign: "center", flexShrink: 0 }}>{emoji}</span>
              <span>{label}</span>
              {active && <span className="sidebar-active-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      {/* Premium banner */}
      <div className="sidebar-premium-card">
        <div className="sidebar-premium-icon">👑</div>
        <div className="sidebar-premium-text">
          <div className="sidebar-premium-title">Passe Premium</div>
          <div className="sidebar-premium-sub">Accès illimité à tout</div>
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {isAdmin && (
          <Link href="/admin" className="sidebar-footer-link" data-label="Administration" onClick={onLinkClick}
            style={{ color: "var(--gold)", fontWeight: 700 }}>
            <span style={{ fontSize: 16, width: 16, textAlign: "center" }}>⚙️</span>
            <span>Administration</span>
          </Link>
        )}
        <Link href="/profile" className="sidebar-footer-link" data-label="Profil" onClick={onLinkClick}>
          <IconUser size={16} />
          <span>Mon profil</span>
        </Link>
        <Link href="/settings" className="sidebar-footer-link" data-label="Paramètres" onClick={onLinkClick}>
          <IconSettings size={16} />
          <span>Paramètres</span>
        </Link>
        <button className="sidebar-footer-link sidebar-footer-btn">
          <IconLogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
