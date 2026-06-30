"use client";

import { useEffect, useState } from "react";

/**
 * Bouton PERMANENT « Installer l'application » pour les Réglages.
 *
 * - Android / Chrome / Edge : déclenche l'invite native (beforeinstallprompt,
 *   capté et partagé par RegisterSW via window.__ccbInstallPrompt).
 * - iPhone / iPad (Safari) : pas d'invite native → affiche une aide dédiée
 *   « Ajouter à l'écran d'accueil » (Partager → Sur l'écran d'accueil).
 * - Déjà installée (mode standalone) : état informatif.
 * - Autres cas : aide générique.
 *
 * Ainsi TOUS les membres peuvent installer, quel que soit l'appareil.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone/iPod/iPad + iPadOS 13+ (qui se présente comme un Mac tactile)
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
}

type Mode = "loading" | "installed" | "prompt" | "ios" | "other";

export default function InstallAppButton() {
  const [mode, setMode] = useState<Mode>("loading");
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function resolve() {
      if (isStandalone()) { setMode("installed"); return; }
      if ((window as unknown as { __ccbInstallPrompt?: Event }).__ccbInstallPrompt) { setMode("prompt"); return; }
      if (isIOS()) { setMode("ios"); return; }
      setMode("other");
    }
    resolve();
    const onInstallable = () => { if (!isStandalone()) setMode("prompt"); };
    const onInstalled = () => { setMode("installed"); setDone(true); };
    window.addEventListener("ccb:installable", onInstallable);
    window.addEventListener("ccb:installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("ccb:installable", onInstallable);
      window.removeEventListener("ccb:installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    // Cas natif (Android/Chrome/Edge) : on déclenche l'invite réelle.
    const deferred = (window as unknown as { __ccbInstallPrompt?: BeforeInstallPromptEvent }).__ccbInstallPrompt;
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") { setDone(true); setMode("installed"); }
        (window as unknown as { __ccbInstallPrompt?: Event }).__ccbInstallPrompt = undefined;
      } catch { /* annulé */ }
      setBusy(false);
      return;
    }
    // Sinon (iOS ou navigateur sans invite native) : on montre les instructions.
    setShowHelp(true);
  }

  if (mode === "loading") return null;

  if (mode === "installed") {
    return (
      <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)", color: "#16a34a", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
        ✓ {done ? "Application installée ! Retrouve l'icône CCB sur ton écran d'accueil." : "L'application est déjà installée sur cet appareil."}
      </div>
    );
  }

  const subtitle =
    mode === "ios"
      ? "Sur iPhone/iPad : ajoute CCB à ton écran d'accueil en 2 gestes."
      : "Accès rapide en plein écran, comme une vraie app, depuis ton écran d'accueil.";

  return (
    <>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{subtitle}</div>
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, var(--violet-dark), var(--violet-light))",
          border: "none", borderRadius: "var(--radius-full)", padding: "12px",
          color: "#fff", fontWeight: 700, fontSize: 14,
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        📲 {mode === "ios" ? "Comment installer l'app" : "Installer l'application"}
      </button>

      {showHelp && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, color: "var(--text-primary)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "var(--font-title)" }}>📲 Installer l&apos;app CCB</span>
              <button onClick={() => setShowHelp(false)} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
            </div>

            {mode === "ios" ? (
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <Step n="1">Ouvre ce site dans <b>Safari</b> (l&apos;installation ne marche pas depuis Chrome sur iPhone).</Step>
                <Step n="2">Touche le bouton <b>Partager</b> <span style={{ fontSize: 16 }}>􀈂</span> (le carré avec une flèche vers le haut), en bas de l&apos;écran.</Step>
                <Step n="3">Fais défiler et touche <b>« Sur l&apos;écran d&apos;accueil »</b>.</Step>
                <Step n="4">Touche <b>« Ajouter »</b> en haut à droite. L&apos;icône CCB apparaît sur ton écran d&apos;accueil. 🎉</Step>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                <Step n="1">Ouvre le <b>menu</b> de ton navigateur (les ⋮ ou ⋯ en haut).</Step>
                <Step n="2">Choisis <b>« Installer l&apos;application »</b> ou <b>« Ajouter à l&apos;écran d&apos;accueil »</b>.</Step>
                <Step n="3">Confirme. L&apos;icône CCB apparaît sur ton écran d&apos;accueil. 🎉</Step>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>
                  Astuce : sur ordinateur (Chrome/Edge), une icône d&apos;installation apparaît aussi à droite de la barre d&apos;adresse.
                </div>
              </ol>
            )}

            <button onClick={() => setShowHelp(false)} style={{ marginTop: 18, width: "100%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", border: "none", borderRadius: "var(--radius-full)", padding: "11px", color: "#1a1206", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "var(--violet)", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-secondary)", paddingTop: 3 }}>{children}</span>
    </li>
  );
}
