"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconSearch, IconBell, IconMoon, IconSun, IconMenu, IconUser } from "@/components/icons";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Tableau de bord",
  "/bible":          "Bible",
  "/plan-biblique":  "Plan de Lecture",
  "/prayer":         "Priere",
  "/community":     "Communaute",
  "/devotion":      "Méditons ensemble",
  "/jesus-daily":   "Jesus Daily",
  "/dons":          "Dons",
  "/premium":       "Premium",
  "/profile":       "Mon profil",
  "/notifications": "Notifications",
  "/events":        "Evenements",
  "/settings":      "Parametres",
  "/admin":         "Administration",
  "/galerie":       "Galerie Photos",
  "/bibliotheque":  "Bibliothèque",
  "/rendez-vous":   "Rendez-vous Pastoral",
  "/temoignages":   "Témoignages",
  "/contact":       "Contact",
  "/nous-suivre":   "Nous Suivre",
  "/a-propos":      "À Propos",
};

export default function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("ccb-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(saved === "dark" || (!saved && prefersDark));
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);

      channel = supabase
        .channel("notif-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, async () => {
          const { count: c } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          setUnreadCount(c ?? 0);
        })
        .subscribe();
    }

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (pathname === "/notifications") setUnreadCount(0);
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("ccb-theme", next ? "dark" : "light");
  }

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    key === "/dashboard" ? pathname === key : pathname.startsWith(key)
  )?.[1] ?? "Centre Chretien Berakah";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuToggle} aria-label="Menu">
          <IconMenu size={22} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className={`topbar-search ${searchOpen ? "open" : ""}`}>
        <IconSearch size={16} className="topbar-search-icon" />
        <input
          type="text"
          placeholder="Rechercher un verset, une priere..."
          className="topbar-search-input"
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon-btn" onClick={() => setSearchOpen((v) => !v)} aria-label="Rechercher">
          <IconSearch size={20} />
        </button>

        <Link
          href="/notifications"
          className="topbar-icon-btn topbar-notif-btn"
          aria-label="Notifications"
          style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <IconBell size={20} />
          {unreadCount > 0 && (
            <span className="topbar-notif-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {mounted && (
          <button className="topbar-icon-btn topbar-theme-btn" onClick={toggleTheme} aria-label="Changer de theme">
            {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>
        )}

        <Link href="/profile" className="topbar-avatar">
          <IconUser size={18} />
        </Link>
      </div>
    </header>
  );
}
