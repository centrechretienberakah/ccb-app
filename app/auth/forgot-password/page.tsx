"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // On envoie directement vers /auth/reset-password. Supabase peut renvoyer
    // soit un flow implicite (#access_token=...) soit PKCE (?code=...).
    // La page reset-password gère les deux côté client.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <aside className="auth-panel-left">
        <div className="auth-panel-orb auth-panel-orb-1" />
        <div className="auth-panel-orb auth-panel-orb-2" />
        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-officiel.png" alt="CCB" className="auth-logo-img" />
          </div>
          <div>
            <div className="auth-panel-logo-name">CCB</div>
            <div className="auth-panel-logo-sub">Centre Chretien Berakah</div>
          </div>
        </div>
        <div className="auth-panel-content">
          <div className="auth-panel-verse">
            &laquo;&nbsp;L&apos;Eternel est mon berger : je ne manquerai de rien.&nbsp;&raquo;
          </div>
          <div className="auth-panel-verse-ref">Psaume 23 : 1</div>
        </div>
        <div className="auth-panel-footer">&copy; 2026 Centre Chretien Berakah</div>
      </aside>

      <div className="auth-panel-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div className="auth-form-logo-mobile">🔑</div>
            <h1 className="auth-form-title">Mot de passe oublié ?</h1>
            <p className="auth-form-subtitle">
              Entrez votre email — nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="auth-card">
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>📬</div>
                <h3 style={{ margin: 0, color: "var(--gold)", fontSize: 18 }}>Email envoyé !</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  Si un compte existe avec <strong>{email}</strong>, vous recevrez un lien sécurisé dans quelques minutes pour réinitialiser votre mot de passe.
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                  Pensez à vérifier vos spams. Le lien est valide 1 heure.
                </p>
                <Link href="/auth/login" className="auth-btn" style={{ textDecoration: "none", marginTop: 8 }}>
                  ← Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {error && (
                  <div className="auth-error">
                    <span>&#9888;</span> {error}
                  </div>
                )}
                <div className="auth-field">
                  <label className="auth-label">Adresse email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
                </button>
              </form>
            )}

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">ou</span>
              <div className="auth-divider-line" />
            </div>
            <p className="auth-switch">
              <Link href="/auth/login">← Se connecter</Link>
              {" · "}
              <Link href="/auth/register">Créer un compte</Link>
            </p>
          </div>
          <Link href="/" className="auth-back">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  );
}
