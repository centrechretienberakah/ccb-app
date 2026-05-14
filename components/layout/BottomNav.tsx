"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconUsers, IconHeart, IconBook, IconSun } from "@/components/icons";

const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Accueil",    Icon: IconHome },
  { href: "/bible",     label: "Bible",      Icon: IconBook },
  { href: "/devotion",  label: "Dévotion",   Icon: IconSun },
  { href: "/prayer",    label: "Prière",     Icon: IconHeart },
  { href: "/community", label: "Communauté", Icon: IconUsers },
];

const MORE_SECTIONS = [
  {
    title: "Navigation",
    items: [
      { href: "/plan-biblique", label: "Plan de Lecture", emoji: "📖" },
      { href: "/jesus-daily",   label: "Jesus Daily",     emoji: "▶️" },
      { href: "/classes",       label: "Salle de classe", emoji: "🎓" },
      { href: "/live",          label: "Live",            emoji: "📡" },
      { href: "/notifications", label: "Notifications",   emoji: "🔔" },
      { href: "/events",        label: "Événements",      emoji: "📅" },
    ],
  },
  {
    title: "Ministère",
    items: [
      { href: "/enseignements", label: "Enseignements", emoji: "🎙️" },
      { href: "/galerie",       label: "Galerie",       emoji: "🖼️" },
      { href: "/bibliotheque",  label: "Bibliothèque",  emoji: "📚" },
      { href: "/temoignages",   label: "Témoignages",   emoji: "✨" },
      { href: "/groupes",       label: "Groupes",       emoji: "👥" },
    ],
  },
  {
    title: "Services",
    items: [
      { href: "/rendez-vous", label: "Rendez-vous", emoji: "🗓️" },
      { href: "/contact",     label: "Contact",     emoji: "📬" },
      { href: "/dons",        label: "Faire un Don",emoji: "🙌" },
      { href: "/premium",     label: "Premium",     emoji: "👑" },
      { href: "/profile",     label: "Mon Profil",  emoji: "👤" },
      { href: "/settings",    label: "Paramètres",  emoji: "⚙️" },
    ],
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const anyMoreActive = MORE_SECTIONS.flatMap((s) => s.items).some((i) => isActive(i.href));

  return (
    <>
      <nav className="bottom-nav">
        {PRIMARY_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`bottom-nav-item ${active ? "active" : ""}`}>
              <div className={`bottom-nav-icon-wrap ${active ? "active" : ""}`}>
                <Icon size={22} />
              </div>
              <span className="bottom-nav-label">{label}</span>
            </Link>
          );
        })}

        {/* Bouton Plus */}
        <button
          className={`bottom-nav-item ${anyMoreActive ? "active" : ""}`}
          onClick={() => setSheetOpen(true)}
          aria-label="Plus de navigation"
        >
          <div className={`bottom-nav-icon-wrap ${anyMoreActive && !sheetOpen ? "active" : ""} ${sheetOpen ? "active" : ""}`}
            style={sheetOpen ? { background: "var(--violet-pale)" } : undefined}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>☰</span>
          </div>
          <span className="bottom-nav-label">Plus</span>
        </button>
      </nav>

      {/* Bottom Sheet */}
      {sheetOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setSheetOpen(false)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />

            {MORE_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="bottom-sheet-section-title">{section.title}</div>
                <div className="bottom-sheet-grid">
                  {section.items.map(({ href, label, emoji }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`bottom-sheet-item ${active ? "active" : ""}`}
                        onClick={() => setSheetOpen(false)}
                      >
                        <span className="bottom-sheet-icon">{emoji}</span>
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ height: 8 }} />
          </div>
        </>
      )}
    </>
  );
}
