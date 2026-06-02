"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconUsers, IconBook, IconPlay } from "@/components/icons";

const PRIMARY_ITEMS = [
  { href: "/dashboard",   label: "Accueil",    Icon: IconHome },
  { href: "/bible",       label: "Ma Bible",   Icon: IconBook },
  { href: "/jesus-daily", label: "JDTV",       Icon: IconPlay },
  { href: "/community",   label: "Communauté", Icon: IconUsers },
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
