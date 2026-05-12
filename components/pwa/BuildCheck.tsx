"use client";

/**
 * BuildCheck — Détecte un nouveau déploiement Vercel et force un rechargement.
 *
 * Comment ça marche :
 *  1. Next.js injecte un `buildId` unique dans window.__NEXT_DATA__ à chaque build.
 *  2. On stocke ce buildId dans localStorage.
 *  3. Au prochain chargement, si le buildId a changé → nouveau déploiement détecté.
 *  4. On désinstalle tous les Service Workers, vide tous les caches, puis recharge.
 *
 * Résultat : TOUS les téléphones reçoivent la mise à jour au premier chargement
 * après un déploiement, quel que soit l'état du Service Worker.
 */

import { useEffect } from "react";

const STORAGE_KEY = "ccb_build_id";

export default function BuildCheck() {
  useEffect(() => {
    try {
      const currentBuildId: string | undefined =
        (window as any).__NEXT_DATA__?.buildId;

      if (!currentBuildId) return;

      const storedBuildId = localStorage.getItem(STORAGE_KEY);

      if (storedBuildId && storedBuildId !== currentBuildId) {
        // Nouveau déploiement détecté !
        console.log("CCB: nouveau déploiement détecté, nettoyage en cours...");

        // 1. Mettre à jour le buildId stocké immédiatement
        localStorage.setItem(STORAGE_KEY, currentBuildId);

        // 2. Désinscrire tous les Service Workers
        const unregisterAll = "serviceWorker" in navigator
          ? navigator.serviceWorker.getRegistrations().then((regs) =>
              Promise.all(regs.map((r) => r.unregister()))
            )
          : Promise.resolve([]);

        // 3. Vider tous les caches
        const clearAllCaches = "caches" in window
          ? caches.keys().then((keys) =>
              Promise.all(keys.map((k) => caches.delete(k)))
            )
          : Promise.resolve([]);

        // 4. Forcer le rechargement depuis le serveur
        Promise.all([unregisterAll, clearAllCaches]).then(() => {
          window.location.reload();
        });
      } else {
        // Première visite ou même version → mémoriser le buildId
        localStorage.setItem(STORAGE_KEY, currentBuildId);
      }
    } catch {
      // Silencieux — ne jamais bloquer l'app pour ça
    }
  }, []);

  return null;
}
