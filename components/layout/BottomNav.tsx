"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconBook, IconPlay, IconGraduationCap, IconMenu } from "@/components/icons";

const PRIMARY_ITEMS = [
  { href: "/dashboard",   label: "Accueil",  Icon: IconHome },
  { href: "/bible",       label: "Ma Bible", Icon: IconBook },
  { href: "/jesus-daily", label: "JDTV",     Icon: IconPlay },
  { href: "/institut",    label: "Institut", Icon: IconGraduationCap },
];

export default function BottomNav({ onMore }: { onMore?: () => void }) {
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
      {/* 5e onglet « Plus » : ouvre le menu latéral (tous les autres modules) */}
      <button
        type="button"
        className="bottom-nav-item"
        onClick={onMore}
        aria-label="Plus de modules"
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <div className="bottom-nav-icon-wrap">
          <IconMenu size={22} />
        </div>
        <span className="bottom-nav-label">Plus</span>
      </button>
    </nav>
  );
}
