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
