"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isModerator } from "@/lib/rbac";
import {
  IconUser, IconSettings, IconLogOut,
} from "@/components/icons";

// Ordre aligné sur l'accès rapide du Dashboard
const ALL_ITEMS = [
  { href: "/dashboard",     label: "Accueil",           emoji: "🏠" },
  // BERAKAH AI est accessible partout via le bouton flottant 🤖 (plus de page dédiée).
  // "Méditons ensemble" est affiché directement sur l'accueil (carte du jour)
  // — retiré du menu principal pour éviter le doublon.
  { href: "/bible",         label: "Ma Bible",          emoji: "📖" },
  // "Prions ensemble" est désormais un onglet du module Communauté
  // (/community/prions-ensemble) — retiré du menu principal.
  { href: "/community",     label: "Communauté",        emoji: "👥" },
  { href: "/community/messages", label: "Messagerie",   emoji: "💬" },
  { href: "/jesus-daily",   label: "Jesus Daily TV",    emoji: "📺" },
  { href: "/institut",      label: "Institut Berakah",  emoji: "🎓" },
  { href: "/events",        label: "Événements",        emoji: "📅" },
  { href: "/dons",          label: "Faire un Don",      emoji: "💝" },
  { href: "/galerie",       label: "Galerie",           emoji: "🖼️" },
  { href: "/bibliotheque",  label: "Bibliothèque",      emoji: "📚" },
  { href: "/rendez-vous",   label: "Rendez-vous",       emoji: "🗓️" },
  { href: "/temoignages",   label: "Témoignages",       emoji: "✨" },
  { href: "/contact",       label: "Contact",           emoji: "📬" },
  { href: "/nous-suivre",   label: "Nous Suivre",       emoji: "📡" },
  { href: "/a-propos",      label: "À Propos",          emoji: "⛪" },
  { href: "/notifications", label: "Notifications",     emoji: "🔔" },
  { href: "/premium",       label: "Premium",           emoji: "👑" },
];

export default function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const sb = createClient();
      await sb.auth.signOut();
    } catch { /* on déconnecte quand même côté navigation */ }
    onLinkClick?.(); // ferme le drawer mobile
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("user_roles").select("role").eq("user_id", user.id).single()
        .then(({ data }) => {
          if (isModerator(data?.role)) setIsAdmin(true);
        });
    });
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    // Messagerie englobe /community/messages ET /community/groups
    if (href === "/community/messages") {
      return pathname.startsWith("/community/messages") || pathname.startsWith("/community/groups");
    }
    // Communauté : tout /community SAUF la zone Messagerie
    if (href === "/community") {
      return pathname.startsWith("/community")
        && !pathname.startsWith("/community/messages")
        && !pathname.startsWith("/community/groups");
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          { }
          <img loading="lazy" decoding="async" src="/logo-officiel.png" alt="CCB" className="sidebar-logo-img" />
        </div>
        <div>
          <div className="sidebar-logo-title">CCB</div>
          <div className="sidebar-logo-sub">Centre Chrétien Berakah</div>
        </div>
      </div>

      {/* Menu — ordre aligné sur l'accès rapide */}
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
        <button className="sidebar-footer-link sidebar-footer-btn"
          onClick={handleSignOut} disabled={signingOut}
          style={{ cursor: signingOut ? "wait" : "pointer", opacity: signingOut ? 0.6 : 1 }}>
          <IconLogOut size={16} />
          <span>{signingOut ? "Déconnexion…" : "Déconnexion"}</span>
        </button>
      </div>
    </aside>
  );
}
