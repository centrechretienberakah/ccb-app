"use client";

import { useEffect } from "react";

/**
 * ChunkErrorReload — recharge la page quand un chunk JS/CSS échoue à charger.
 *
 * Cas typique : l'app (PWA) reste ouverte longtemps ; un nouveau déploiement
 * renomme les chunks. En naviguant vers une page pas encore chargée, l'ancien
 * code tente de récupérer un chunk disparu → "ChunkLoadError" / page qui ne se
 * charge pas. Un rechargement complet récupère le HTML + les chunks à jour.
 *
 * Garde anti-boucle : au plus un rechargement toutes les 30 s.
 */
const GUARD_KEY = "ccb-chunk-reload-ts";

function isChunkError(message?: unknown): boolean {
  if (typeof message !== "string") return false;
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk\s+[\w-]+\s+failed/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export default function ChunkErrorReload() {
  useEffect(() => {
    function reloadOnce() {
      try {
        const last = Number(sessionStorage.getItem(GUARD_KEY) || "0");
        if (Date.now() - last < 30000) return;
        sessionStorage.setItem(GUARD_KEY, String(Date.now()));
      } catch { /* sessionStorage indispo → on recharge quand même */ }
      window.location.reload();
    }
    function onError(e: ErrorEvent) {
      const err = e?.error as Error | undefined;
      if ((err && err.name === "ChunkLoadError") || isChunkError(e?.message) || isChunkError(err?.message)) {
        reloadOnce();
      }
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r = e?.reason as Error | string | undefined;
      const msg = typeof r === "string" ? r : r?.message;
      const name = typeof r === "object" && r ? r.name : undefined;
      if (name === "ChunkLoadError" || isChunkError(msg)) reloadOnce();
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
