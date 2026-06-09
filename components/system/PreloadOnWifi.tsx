"use client";

import { useEffect } from "react";
import { preloadSpiritualContent } from "@/lib/net/dataSaver";

/**
 * Précharge en arrière-plan le contenu spirituel (Méditons, Prières, Plan, Bible)
 * dans le cache hors-ligne — UNIQUEMENT sur Wi-Fi / bonne connexion non bridée.
 * Voir shouldPreload() : ne consomme jamais de données mobiles à l'insu de l'user.
 */
export default function PreloadOnWifi() {
  useEffect(() => {
    // On laisse le chargement initial de la page se terminer d'abord.
    const t = setTimeout(() => {
      void preloadSpiritualContent();
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
