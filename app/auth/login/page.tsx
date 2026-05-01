"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#07040f",
  bgCard: "rgba(255,255,255,0.05)",
  border: "rgba(212,175,55,0.20)",
  borderSoft: "rgba(255,255,255,0.08)",
  gold: "#d4af37",
  goldLight: "#f0d060",
  violet: "#7c3aed",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.38)",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect. Veuillez réessayer.");
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.35)",
          color: "#fca5a5",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          fontSize: "0.85rem",
        }}>
          ⚠️ {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
          ADRESSE EMAIL
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@example.com"
          required
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            borderRadius: "12px",
            border: `1.5px solid ${C.borderSoft}`,
            background: "rgba(255,255,255,0.04)",
            color: C.textPrimary,
            fontSize: "0.95rem",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.borderSoft)}
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, letterSpacing: "0.06em" }}>
            MOT DE PASSE
          </label>
          <Link href="/auth/forgot-password" style={{ fontSize: "0.78rem", color: C.gold, textDecoration: "none", fontWeight: 500 }}>
            Oublié ?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            borderRadius: "12px",
            border: `1.5px solid ${C.borderSoft}`,
            background: "rgba(255,255,255,0.04)",
            color: C.textPrimary,
            fontSize: "0.95rem",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.borderSoft)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "12px",
          border: "none",
          background: loading
            ? "rgba(212,175,55,0.35)"
            : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          color: "#07040f",
          fontWeight: 800,
          fontSize: "0.95rem",
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.05em",
          transition: "opacity 0.2s",
        }}
      >
        {loading ? "Connexion..." : "Se connecter →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Violet glow */}
      <div style={{
        position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)",
        width: "700px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Gold glow bottom */}
      <div style={{
        position: "absolute", bottom: "5%", left: "20%",
        width: "350px", height: "350px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>

        {/* Logo + titre */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <Link href="/" style={{ display: "inline-block", marginBottom: "1rem" }}>
            <Image
              src="/logo-ccb.png"
              alt="Centre Chrétien Berakah"
              width={72}
              height={72}
              style={{ objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(212,175,55,0.45))" }}
            />
          </Link>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: "0.06em",
            margin: "0 0 0.5rem",
          }}>
            Connexion
          </h1>
          <p style={{ color: C.textMuted, fontSize: "0.88rem", margin: 0 }}>
            Bon retour dans la famille Berakah 🙏
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          padding: "2rem",
          backdropFilter: "blur(16px)",
        }}>
          <Suspense fallback={
            <div style={{ textAlign: "center", color: C.textMuted, padding: "2rem" }}>Chargement...</div>
          }>
            <LoginForm />
          </Suspense>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
            <span style={{ fontSize: "0.75rem", color: C.textMuted }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
          </div>

          <p style={{ textAlign: "center", fontSize: "0.88rem", color: C.textSecondary, margin: 0 }}>
            Pas encore de compte ?{" "}
            <Link href="/auth/register" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
              Créer un compte
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
          <Link href="/" style={{ color: C.textMuted, fontSize: "0.82rem", textDecoration: "none" }}>
            ← Retour à l'accueil
          </Link>
        </p>

        <p style={{ textAlign: "center", color: C.textMuted, fontSize: "0.72rem", margin: 0 }}>
          © 2026 Centre Chrétien Berakah
        </p>
      </div>
    </div>
  );
}
