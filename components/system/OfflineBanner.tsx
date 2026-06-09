"use client";

import { useNetworkInfo } from "@/lib/net/dataSaver";

/**
 * Bandeau discret affiché quand l'appareil est hors-ligne — informe que le
 * contenu affiché provient du cache local (offline-first).
 */
export default function OfflineBanner() {
  const { online } = useNetworkInfo();
  if (online) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        left: 12, right: 12, maxWidth: 460, margin: "0 auto",
        zIndex: 140,
        background: "#1f2937", color: "#fff",
        borderRadius: 12, padding: "9px 14px",
        fontSize: 12.5, fontWeight: 600, textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
      }}
    >
      📴 Hors ligne — contenu en cache. Reconnecte-toi pour les nouveautés.
    </div>
  );
}
