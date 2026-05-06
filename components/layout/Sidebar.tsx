"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome, IconBook, IconHeart, IconUsers, IconSun,
  IconPlay, IconGraduationCap, IconRadio,
  IconGift, IconCrown, IconUser, IconSettings, IconLogOut, IconBell,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Accueil",        Icon: IconHome },
  { href: "/bible",         label: "Bible",          Icon: IconBook },
  { href: "/prayer",        label: "Prière",         Icon: IconHeart },
  { href: "/community",     label: "Communauté",     Icon: IconUsers },
  { href: "/notifications", label: "Notifications",  Icon: IconBell },
  { href: "/devotion",      label: "Dévotion",       Icon: IconSun },
  { href: "/jesus-daily",   label: "Jesus Daily",    Icon: IconPlay },
  { href: "/classes",       label: "Salle de classe",Icon: IconGraduationCap },
  { href: "/live",          label: "Live",           Icon: IconRadio },
];

const SECONDARY_ITEMS = [
  { href: "/dons",    label: "Dons",    Icon: IconGift },
  { href: "/premium", label: "Premium", Icon: IconCrown },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <span className="sidebar-logo-cross">✝</span>
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
            <Link key={href} href={href} className={`sidebar-link ${active ? "active" : ""}`}>
              <Icon size={18} className="sidebar-link-icon" />
              <span>{label}</span>
              {active && <span className="sidebar-active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Séparateur */}
      <div className="sidebar-separator" />

      {/* Secondaire */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">COMMUNAUTÉ</div>
        {SECONDARY_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`sidebar-link ${active ? "active" : ""}`}>
              <Icon size={18} className="sidebar-link-icon" />
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

      {/* Footer links */}
      <div className="sidebar-footer">
        <Link href="/profile" className="sidebar-footer-link">
          <IconUser size={16} />
          <span>Mon profil</span>
        </Link>
        <Link href="/settings" className="sidebar-footer-link">
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
