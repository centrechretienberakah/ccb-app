"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IconHome, IconBook, IconHeart, IconUsers, IconSun,
  IconPlay, IconGraduationCap, IconRadio,
  IconUser, IconSettings, IconLogOut, IconBell, IconBookmark,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Accueil",         Icon: IconHome },
  { href: "/bible",         label: "Bible",           Icon: IconBook },
  { href: "/plan-biblique", label: "Plan de Lecture", Icon: IconBookmark },
  { href: "/prayer",        label: "Prière",          Icon: IconHeart },
  { href: "/community",     label: "Communauté",      Icon: IconUsers },
  { href: "/notifications", label: "Notifications",   Icon: IconBell },
  { href: "/devotion",      label: "Dévotion",        Icon: IconSun },
  { href: "/jesus-daily",   label: "Jesus Daily",     Icon: IconPlay },
  { href: "/classes",       label: "Salle de classe", Icon: IconGraduationCap },
  { href: "/live",          label: "Live",            Icon: IconRadio },
];

const MINISTRY_ITEMS = [
  { href: "/events",        label: "Événements",    emoji: "📅" },
  { href: "/enseignements", label: "Enseignements", emoji: "🎙️" },
  { href: "/annonces",      label: "Annonces",      emoji: "📢" },
  { href: "/galerie",       label: "Galerie",       emoji: "🖼️" },
  { href: "/bibliotheque",  label: "Bibliothèque",  emoji: "📚" },
  { href: "/temoignages",   label: "Témoignages",   emoji: "✨" },
  { href: "/groupes",       label: "Groupes",       emoji: "👥" },
];

const SERVICE_ITEMS = [
  { href: "/rendez-vous", label: "Rendez-vous",  emoji: "🗓️" },
  { href: "/contact",     label: "Contact",      emoji: "📬" },
  { href: "/dons",        label: "Faire un Don", emoji: "🙌" },
  { href: "/premium",     label: "Premium",      emoji: "👑" },
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

      {/* Nav principale */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">NAVIGATION</div>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href} href={href}
              className={`sidebar-link ${active ? "active" : ""}`}
              data-label={label}
              onClick={onLinkClick}
            >
              <Icon size={18} className="sidebar-link-icon" />
              <span>{label}</span>
              {active && <span className="sidebar-active-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-separator" />

      {/* Ministère */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">MINISTÈRE</div>
        {MINISTRY_ITEMS.map(({ href, label, emoji }) => {
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

      <div className="sidebar-separator" />

      {/* Services */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">SERVICES</div>
        {SERVICE_ITEMS.map(({ href, label, emoji }) => {
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
