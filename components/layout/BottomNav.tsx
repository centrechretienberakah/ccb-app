"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconUsers, IconBook, IconSun } from "@/components/icons";

const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Accueil",    Icon: IconHome },
  { href: "/bible",     label: "Ma Bible",   Icon: IconBook },
  { href: "/devotion",  label: "Méditons",   Icon: IconSun },
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

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
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
    </nav>
  );
}
