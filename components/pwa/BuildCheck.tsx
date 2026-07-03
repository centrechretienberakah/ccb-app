"use client";

/**
 * BuildCheck — Détecte un nouveau déploiement Vercel et force un rechargement.
 *
 * Comment ça marche :
 *  1. Le `buildId` (SHA du commit Vercel) est passé en prop depuis le layout
 *     serveur — fiable sur l'App Router (window.__NEXT_DATA__ n'existe plus ici).
 *  2. On le stocke dans localStorage.
 *  3. Au prochain chargement, si le buildId a changé → nouveau déploiement détecté.
 *  4. On désinstalle tous les Service Workers, vide tous les caches, puis recharge.
 *
 * Résultat : TOUS les appareils reçoivent la mise à jour au premier chargement
 * après un déploiement, quel que soit l'état du Service Worker.
 */

import { useEffect } from "react";

const STORAGE_KEY = "ccb_build_id";

/** Vide SW + caches puis recharge depuis le serveur. */
async function hardRefresh(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* noop */ }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* noop */ }
  window.location.reload();
}

export default function BuildCheck({ buildId }: { buildId: string }) {
  // 1) Au chargement : si le buildId a changé depuis la dernière visite → MàJ.
  useEffect(() => {
    try {
      if (!buildId || buildId === "dev") return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== buildId) {
        localStorage.setItem(STORAGE_KEY, buildId);
        void hardRefresh();
      } else {
        localStorage.setItem(STORAGE_KEY, buildId);
      }
    } catch { /* ne jamais bloquer l'app */ }
  }, [buildId]);

  // 2) Au RÉVEIL de l'app (reprise) : on interroge /api/version pour détecter un
  // nouveau déploiement SANS recharger. Résout le cas de l'app Android : la
  // WebView Capacitor garde la page chargée entre les reprises, donc les MàJ web
  // n'arrivaient qu'après un redémarrage complet / une MàJ Play Store.
  useEffect(() => {
    if (!buildId || buildId === "dev") return;
    let checking = false;
    const check = async () => {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { buildId?: string };
          const server = data.buildId;
          if (server && server !== "dev" && server !== buildId) {
            try { localStorage.setItem(STORAGE_KEY, server); } catch { /* noop */ }
            await hardRefresh();
            return;
          }
        }
      } catch { /* hors-ligne → on ne fait rien */ }
      checking = false;
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [buildId]);

  return null;
}
