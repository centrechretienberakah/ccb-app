"use client";

import { useEffect, useState } from "react";
import { rescuePushSubscription } from "@/lib/push-notifications";

export default function RegisterSW() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Enregistrement du SW
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Vérifier immédiatement si une nouvelle version existe
        reg.update().catch(() => {});

        // Filet de sécurité : si une subscription navigateur existe mais
        // n'est pas associée en DB (cas du signup où getUser() était null),
        // on la (re)connecte automatiquement à l'user courant.
        rescuePushSubscription().catch(() => {});

        // Re-vérifier à chaque fois que l'onglet reprend le focus
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
            rescuePushSubscription().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch((err) => console.error("SW:", err));

    // Rechargement automatique quand le nouveau SW prend le contrôle
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Prompt d'installation PWA
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setTimeout(() => setShowInstall(true), 4000);
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setDeferredPrompt(null);
  }

  if (!showInstall) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 76,
      left: 16,
      right: 16,
      zIndex: 9999,
      background: "linear-gradient(135deg, #1a0a3e, #2d1060)",
      border: "1px solid var(--violet-light, #8b5cf6)",
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 8px 32px rgba(91, 33, 182,0.4)",
      maxWidth: 500,
      margin: "0 auto",
    }}>
      { }
      <img loading="lazy" decoding="async" src="/icon-72x72.png" alt="CCB" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
          Installer l&apos;app CCB
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
          Accès rapide depuis votre écran d&apos;accueil
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setShowInstall(false)} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
          padding: "6px 10px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
        }}>
          Plus tard
        </button>
        <button onClick={handleInstall} style={{
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          border: "none", borderRadius: 8, padding: "6px 14px",
          color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          Installer
        </button>
      </div>
    </div>
  );
}
