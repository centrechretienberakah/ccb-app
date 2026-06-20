"use client";

import { useEffect } from "react";

/**
 * Garde-fou global : toute erreur d'affichage d'une page (runtime / chunk) est
 * capturée ici et présente un écran « Réessayer » au lieu du « This page
 * couldn't load » brut du navigateur. En cas d'erreur de chunk (déploiement /
 * connexion instable), on recharge automatiquement une fois.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const name = error?.name || "";
    const msg = error?.message || "";
    const isChunk =
      /ChunkLoadError/i.test(name) ||
      /Loading chunk\s+[\w-]+\s+failed/i.test(msg) ||
      /Loading CSS chunk/i.test(msg) ||
      /dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg);
    if (isChunk) {
      // Anti-boucle : au plus un rechargement toutes les 20 s.
      try {
        const k = "ccb-err-reload-ts";
        const last = Number(sessionStorage.getItem(k) || "0");
        if (Date.now() - last > 20000) {
          sessionStorage.setItem(k, String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div style={{
      minHeight: "60vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
      padding: 24, textAlign: "center",
      fontFamily: "var(--font-body)", color: "var(--text-primary)",
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontFamily: "var(--font-title)", fontSize: 18, fontWeight: 700 }}>
        Oups, un souci d&apos;affichage
      </div>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.6 }}>
        Cette page n&apos;a pas pu se charger correctement. Réessaie — cela vient
        le plus souvent d&apos;une connexion instable.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => reset()} style={{
          background: "var(--violet, #5B21B6)", color: "#fff", border: "none",
          borderRadius: 999, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          Réessayer
        </button>
        <button onClick={() => { try { window.location.reload(); } catch { /* noop */ } }} style={{
          background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border)",
          borderRadius: 999, padding: "10px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          Recharger
        </button>
      </div>
    </div>
  );
}
