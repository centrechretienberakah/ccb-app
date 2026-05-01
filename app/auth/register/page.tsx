"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#07040f",
  bgCard: "rgba(255,255,255,0.05)",
  border: "rgba(212,175,55,0.20)",
  borderSoft: "rgba(255,255,255,0.08)",
  gold: "#d4af37",
  goldLight: "#f0d060",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.38)",
};

const inputStyle = {
  width: "100%",
  padding: "0.875rem 1rem",
  borderRadius: "12px",
  border: `1.5px solid ${C.borderSoft}`,
  background: "rgba(255,255,255,0.04)",
  color: C.textPrimary,
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.2s",
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Erreur lors de la création du compte : " + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

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
      {/* Glows */}
      <div style={{
        position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)",
        width: "700px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "5%", right: "15%",
        width: "350px", height: "350px", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: "440px" }}>

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
            Créer un compte
          </h1>
          <p style={{ color: C.textMuted, fontSize: "0.88rem", margin: 0 }}>
            Rejoins la famille Berakah aujourd'hui 🙌
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

          {success ? (
            /* Success state */
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✉️</div>
              <h2 style={{ color: C.gold, fontFamily: "'Cinzel', serif", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                Vérifie ta boîte mail !
              </h2>
              <p style={{ color: C.textSecondary, fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                Un email de confirmation a été envoyé à <strong style={{ color: C.textPrimary }}>{form.email}</strong>.
                Clique sur le lien pour activer ton compte.
              </p>
              <Link
                href="/auth/login"
                style={{
                  display: "inline-block",
                  padding: "0.875rem 2rem",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                  color: "#07040f",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                Aller à la connexion →
              </Link>
            </div>
          ) : (
            /* Register form */
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
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

              {/* Nom complet */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                  NOM COMPLET
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Jean Dupont"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.borderSoft)}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                  ADRESSE EMAIL
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="vous@example.com"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.borderSoft)}
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                  MOT DE PASSE
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractères"
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.borderSoft)}
                />
              </div>

              {/* Confirmer */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: C.textSecondary, marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                  CONFIRMER LE MOT DE PASSE
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
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
                  marginTop: "0.25rem",
                }}
              >
                {loading ? "Création en cours..." : "Créer mon compte →"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
                <span style={{ fontSize: "0.75rem", color: C.textMuted }}>ou</span>
                <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
              </div>

              <p style={{ textAlign: "center", fontSize: "0.88rem", color: C.textSecondary, margin: 0 }}>
                Déjà un compte ?{" "}
                <Link href="/auth/login" style={{ color: C.gold, fontWeight: 700, textDecoration: "none" }}>
                  Se connecter
                </Link>
              </p>
            </form>
          )}
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
