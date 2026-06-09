"use client";

import { useEffect, useState } from "react";

/**
 * Mode Économie de données CCB — adapté aux réseaux africains (3G/4G instables,
 * forfaits limités). Réglage global, ACTIVÉ PAR DÉFAUT.
 *
 * Quand il est actif, les composants doivent :
 *  - ne pas autoplay / précharger les vidéos ;
 *  - charger les images en lazy + qualité réduite ;
 *  - éviter les requêtes/animations superflues ;
 *  - privilégier texte & audio.
 */
export const DATA_SAVER_KEY = "ccb-data-saver";
const CHANGE_EVENT = "ccb-data-saver-change";

interface NetConnection {
  effectiveType?: string;   // "slow-2g" | "2g" | "3g" | "4g"
  type?: string;            // "wifi" | "cellular" … (non standard, souvent absent)
  saveData?: boolean;
  addEventListener?: (t: string, cb: () => void) => void;
  removeEventListener?: (t: string, cb: () => void) => void;
}
function conn(): NetConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as { connection?: NetConnection }).connection;
}

/** Type de réseau effectif ("4g" par défaut si inconnu). */
export function effectiveNetworkType(): string {
  return conn()?.effectiveType || "4g";
}

/** Réseau lent (2G/3G) ou demande explicite d'économie de l'OS. */
export function isSlowNetwork(): boolean {
  const c = conn();
  if (c?.saveData) return true;
  const t = c?.effectiveType;
  return t === "slow-2g" || t === "2g" || t === "3g";
}

/** Mode Économie de données effectif (réglage utilisateur, défaut ON). */
export function isDataSaverEnabled(): boolean {
  try {
    const v = localStorage.getItem(DATA_SAVER_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* noop */ }
  // Pas de préférence enregistrée → ON par défaut (ou si l'OS demande saveData)
  return true;
}

export function setDataSaver(on: boolean): void {
  try {
    localStorage.setItem(DATA_SAVER_KEY, on ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch { /* noop */ }
}

/** Hook réactif : renvoie l'état du Mode Économie de données. */
export function useDataSaver(): boolean {
  const [on, setOn] = useState(true); // SSR : on assume ON (sécuritaire)
  useEffect(() => {
    const sync = () => setOn(isDataSaverEnabled());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}

/** Hook : informations réseau (type effectif + lenteur). */
export function useNetworkInfo(): { effectiveType: string; slow: boolean; online: boolean } {
  const [info, setInfo] = useState({ effectiveType: "4g", slow: false, online: true });
  useEffect(() => {
    const sync = () =>
      setInfo({
        effectiveType: effectiveNetworkType(),
        slow: isSlowNetwork(),
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
      });
    sync();
    const c = conn();
    c?.addEventListener?.("change", sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      c?.removeEventListener?.("change", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return info;
}

/* ───────────── Préchargement Wi-Fi du contenu spirituel ───────────── */

export const PRELOAD_KEY = "ccb-preload-wifi";
const PRELOAD_TS_KEY = "ccb-preload-ts";
const PRELOAD_PAGES = ["/dashboard", "/community/prions-ensemble", "/plan-biblique", "/bible"];

export function isPreloadEnabled(): boolean {
  try {
    const v = localStorage.getItem(PRELOAD_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* noop */ }
  return true; // défaut ON (mais bridé par shouldPreload : jamais sur données mobiles)
}

export function setPreload(on: boolean): void {
  try { localStorage.setItem(PRELOAD_KEY, on ? "1" : "0"); } catch { /* noop */ }
}

/**
 * Condition de préchargement — PRUDENT pour ne JAMAIS consommer de données
 * mobiles à l'insu de l'utilisateur :
 *  - Wi-Fi confirmé (connection.type === "wifi") → OK ;
 *  - cellulaire confirmé → NON ;
 *  - type inconnu (cas fréquent sur mobile) → seulement si l'éco de données est
 *    DÉSACTIVÉE (signal « j'ai du forfait/Wi-Fi ») ET bonne connexion.
 */
function shouldPreload(): boolean {
  if (typeof navigator === "undefined" || !navigator.onLine) return false;
  if (!isPreloadEnabled()) return false;
  const c = conn();
  if (c?.type === "wifi") return true;
  if (c?.type && c.type !== "wifi") return false;
  if (isDataSaverEnabled()) return false;
  return effectiveNetworkType() === "4g";
}

/** Précharge en arrière-plan les pages de contenu (warm le cache offline). */
export async function preloadSpiritualContent(): Promise<void> {
  if (!shouldPreload()) return;
  try {
    const last = Number(localStorage.getItem(PRELOAD_TS_KEY) || "0");
    if (Date.now() - last < 6 * 60 * 60 * 1000) return; // au plus 1×/6 h
    localStorage.setItem(PRELOAD_TS_KEY, String(Date.now()));
  } catch { /* noop */ }
  for (const p of PRELOAD_PAGES) {
    try { await fetch(p, { credentials: "same-origin" }); } catch { /* noop */ }
  }
}
