"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface DevotionClientProps {
  devotionId: string | null;
  userId: string | null;
  alreadyCompleted: boolean;
}

export default function DevotionClient({ devotionId, userId, alreadyCompleted }: DevotionClientProps) {
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [loading, setLoading] = useState(false);

  const C = {
    gold: "#d4af37",
    goldLight: "#f0d060",
    goldDark: "#b8941f",
  };

  const handleComplete = async () => {
    if (!userId) return;
    if (!devotionId) {
      // Dévotion fallback (pas en base) — on marque localement seulement
      setCompleted(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("user_devotion_progress")
      .insert({ user_id: userId, devotion_id: devotionId });

    if (!error) setCompleted(true);
    setLoading(false);
  };

  if (!userId) {
    // Non connecté — inviter à se connecter
    return (
      <div style={{
        borderRadius: "16px",
        padding: "1.25rem 1.5rem",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
      }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem", marginBottom: "0.75rem" }}>
          Connecte-toi pour suivre ta progression quotidienne
        </p>
        <Link
          href="/auth/login"
          style={{
            display: "inline-block",
            padding: "0.7rem 1.75rem",
            borderRadius: "9999px",
            background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
            color: "#07040f",
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
          }}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{
        borderRadius: "16px",
        padding: "1.25rem 1.5rem",
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.25)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
        <p style={{ color: "#86efac", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
          Dévotion complétée aujourd'hui !
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
          Reviens demain pour une nouvelle dévotion 🙏
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      style={{
        width: "100%",
        padding: "1rem",
        borderRadius: "14px",
        border: "none",
        background: loading
          ? "rgba(212,175,55,0.3)"
          : `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
        color: "#07040f",
        fontWeight: 800,
        fontSize: "1rem",
        cursor: loading ? "not-allowed" : "pointer",
        letterSpacing: "0.04em",
        transition: "opacity 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {loading ? "Enregistrement..." : "✦ J'ai lu ma dévotion aujourd'hui"}
    </button>
  );
}
