"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  devotionId: string | null;
  userId: string | null;
  alreadyCompleted: boolean;
}

export default function DevotionClient({ devotionId, userId, alreadyCompleted }: Props) {
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleComplete() {
    if (!userId) {
      window.location.href = "/auth/login?redirect=/devotion";
      return;
    }
    if (completed || !devotionId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("devotion_progress").upsert({
        user_id: userId,
        devotion_id: devotionId,
      });
      setCompleted(true);
    } catch {}
    setLoading(false);
  }

  function handleShare() {
    const text = "Je viens de lire la devotion du jour sur CCB ! Rejoignez-nous sur centrechretienberakah.com";
    if (navigator.share) {
      navigator.share({ title: "Devotion du Jour — CCB", text, url: window.location.href })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text + "\n" + window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Bouton Marquer comme lu */}
      <button
        onClick={handleComplete}
        disabled={completed || loading}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: "var(--radius-lg)",
          border: completed ? "2px solid var(--success)" : "none",
          background: completed
            ? "rgba(22,163,74,0.1)"
            : "linear-gradient(135deg, var(--gold-dark) 0%, var(--gold) 100%)",
          color: completed ? "var(--success)" : "var(--violet-dark)",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "0.03em",
          cursor: completed ? "default" : loading ? "wait" : "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: completed ? "none" : "var(--shadow-gold)",
        }}
      >
        {completed ? (
          <><span>✓</span> Devotion completee — Bonne continuation !</>
        ) : loading ? (
          "Enregistrement..."
        ) : (
          <><span>☀️</span> J&apos;ai lu et medite cette devotion</>
        )}
      </button>

      {/* Bouton Partager */}
      <button
        onClick={handleShare}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-2)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {shared ? (
          <><span>✓</span> Lien copie dans le presse-papier !</>
        ) : (
          <><span>↗</span> Partager cette devotion</>
        )}
      </button>
    </div>
  );
}
