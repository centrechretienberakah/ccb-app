"use client";

import { useEffect } from "react";

// Enregistre une fois par onglet la session (IP/appareil) du membre connecté,
// pour la vue Admin du profil. Fire-and-forget, n'affiche rien, ne bloque rien.
export default function SessionBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ccb_sess_beacon") === "1") return;
      sessionStorage.setItem("ccb_sess_beacon", "1");
    } catch { /* sessionStorage indispo : on tente quand même une fois */ }
    const t = setTimeout(() => {
      fetch("/api/track/session", { method: "POST", keepalive: true }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
