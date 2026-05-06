"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconUsers, IconHeart, IconBook, IconUser } from "@/components/icons";

const BOTTOM_ITEMS = [
  { href: "/dashboard", label: "Accueil",     Icon: IconHome },
  { href: "/community", label: "Communauté",  Icon: IconUsers },
  { href: "/prayer",    label: "Prière",      Icon: IconHeart },
  { href: "/bible",     label: "Bible",       Icon: IconBook },
  { href: "/profile",   label: "Profil",      Icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="bottom-nav">
      {BOTTOM_ITEMS.map(({ href, label, Icon }) => {
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
