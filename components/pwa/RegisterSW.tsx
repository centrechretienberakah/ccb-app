"use client";

import { useEffect, useState } from "react";

export default function RegisterSW() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Enregistrement du Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("SW enregistré:", reg.scope))
        .catch((err) => console.error("SW erreur:", err));
    }

    // Écouter l'événement d'installation PWA
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Afficher le banner seulement si pas encore installée
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  }

  if (!showBanner) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 80,
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
      boxShadow: "0 8px 32px rgba(90,44,160,0.4)",
      maxWidth: 500,
      margin: "0 auto",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-72x72.png" alt="CCB" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
          Installer l'app CCB
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
          Accès rapide depuis votre écran d'accueil, même hors-ligne
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setShowBanner(false)} style={{
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
