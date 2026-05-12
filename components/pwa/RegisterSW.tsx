"use client";

import { useEffect, useState } from "react";

export default function RegisterSW() {
  const [showInstall, setShowInstall]   = useState(false);
  const [showUpdate, setShowUpdate]     = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [waitingWorker, setWaitingWorker]   = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // ── Enregistrement du SW ──────────────────────────────────────────────────
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("SW enregistré:", reg.scope);

        // Forcer la vérification d'une nouvelle version maintenant
        reg.update().catch(() => {});

        // Vérifier toutes les 30 secondes si le SW a été mis à jour
        const interval = setInterval(() => reg.update().catch(() => {}), 30_000);

        // Nouveau SW en attente (waiting) → proposer la mise à jour
        const handleWaiting = (worker: ServiceWorker) => {
          setWaitingWorker(worker);
          setShowUpdate(true);
        };

        if (reg.waiting) handleWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              handleWaiting(newWorker);
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch((err) => console.error("SW erreur:", err));

    // ── Rechargement quand le nouveau SW prend le contrôle ───────────────────
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // ── Vérifier le SW quand la page regagne le focus ────────────────────────
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready
          .then((reg) => reg.update())
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── Prompt d'installation PWA ─────────────────────────────────────────────
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        // Délai pour ne pas spammer l'utilisateur à l'arrivée
        setTimeout(() => setShowInstall(true), 3000);
      }
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  // ── Appliquer la mise à jour ──────────────────────────────────────────────
  function applyUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShowUpdate(false);
  }

  // ── Installer la PWA ──────────────────────────────────────────────────────
  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setDeferredPrompt(null);
  }

  return (
    <>
      {/* ── Bannière mise à jour disponible ── */}
      {showUpdate && (
        <div style={{
          position: "fixed",
          top: 70,
          left: 16,
          right: 16,
          zIndex: 9999,
          background: "linear-gradient(135deg, #064e3b, #065f46)",
          border: "1px solid #10b981",
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 32px rgba(16,185,129,0.3)",
          maxWidth: 480,
          margin: "0 auto",
          animation: "slideDown 0.3s ease",
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🔄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
              Mise à jour disponible !
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
              Une nouvelle version de l&apos;app CCB est prête
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowUpdate(false)} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
              padding: "6px 10px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
            }}>
              Plus tard
            </button>
            <button onClick={applyUpdate} style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              border: "none", borderRadius: 8, padding: "6px 14px",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              Mettre à jour
            </button>
          </div>
        </div>
      )}

      {/* ── Bannière installation PWA ── */}
      {showInstall && !showUpdate && (
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
          boxShadow: "0 8px 32px rgba(90,44,160,0.4)",
          maxWidth: 500,
          margin: "0 auto",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-72x72.png" alt="CCB" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
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
      )}
    </>
  );
}
