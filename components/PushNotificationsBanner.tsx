"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "@/lib/push-notifications";

const DISMISS_KEY = "ccb-push-banner-dismissed-at";
const DISMISS_COOLDOWN_DAYS = 7;

export default function PushNotificationsBanner() {
  const { state, subscribe, error } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // par défaut caché, on hydrate après mount

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) {
      setDismissed(false);
      return;
    }
    const dismissedAt = parseInt(raw, 10);
    const elapsedDays = (Date.now() - dismissedAt) / (24 * 60 * 60 * 1000);
    setDismissed(elapsedDays < DISMISS_COOLDOWN_DAYS);
  }, []);

  function dismiss() {
    if (typeof window === "undefined") return;
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  }

  async function handleEnable() {
    await subscribe();
    // Si l'user a refusé dans la popup browser, on dismiss aussi (sinon la banner reste)
    if (state === "denied") dismiss();
  }

  // Affiche uniquement quand l'utilisateur peut encore décider
  if (dismissed) return null;
  if (state === "subscribed") return null;
  if (state === "unsupported") return null;
  if (state === "denied") return null;
  if (state === "loading") return null;

  return (
    <div
      role="region"
      aria-label="Activer les notifications"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: 16,
        maxWidth: 420,
        marginLeft: "auto",
        zIndex: 9000,
        background: "linear-gradient(135deg, var(--violet-dark, #5B21B6), var(--violet, #7c3aed))",
        borderRadius: 16,
        padding: "14px 16px",
        color: "#fff",
        boxShadow: "0 10px 40px rgba(91, 33, 182, 0.4)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🔔</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          Activer les notifications
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.45, margin: "0 0 10px", opacity: 0.92 }}>
          Reçois les annonces du Centre Chrétien Berakah : nouveaux sermons, événements, prières d&apos;intercession et messages du pasteur.
        </p>
        {error && (
          <p style={{ fontSize: 11, color: "#fca5a5", margin: "0 0 8px" }}>
            ⚠ {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleEnable}
            style={{
              background: "var(--gold, #d4af37)",
              color: "#1a0a00",
              border: "none",
              borderRadius: 9999,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ✅ Activer
          </button>
          <button
            onClick={dismiss}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              border: "none",
              borderRadius: 9999,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Fermer"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 18,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
