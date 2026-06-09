"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Rend consultable hors-ligne CHAQUE page de contenu que le membre ouvre.
 * Next.js navigue en SPA (requêtes RSC) → le HTML complet de la page n'est PAS
 * mis en cache par une simple navigation. On déclenche donc un fetch() direct
 * (sans en-tête RSC) du HTML de la page courante : le service worker le met
 * alors en cache (voir networkFirstPage / OFFLINE_PAGES dans sw.js).
 * Throttlé à 1×/24 h par chemin pour limiter les données.
 */
const OFFLINE_PAGES = ["/dashboard", "/bible", "/plan-biblique", "/community/prions-ensemble", "/institut"];

export default function OfflineWarm() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const match = OFFLINE_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!match) return;

    const key = "ccb-warm:" + pathname;
    try {
      const last = Number(localStorage.getItem(key) || "0");
      if (Date.now() - last < 24 * 60 * 60 * 1000) return; // 1×/24 h par chemin
    } catch { /* noop */ }

    // Laisse la page finir de se charger avant de réchauffer le cache.
    const t = setTimeout(() => {
      fetch(pathname, { credentials: "same-origin" })
        .then((r) => { if (r.ok && !r.redirected) { try { localStorage.setItem(key, String(Date.now())); } catch { /* noop */ } } })
        .catch(() => { /* hors-ligne / erreur → on réessaiera plus tard */ });
    }, 2500);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
