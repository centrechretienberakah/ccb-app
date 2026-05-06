"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      setError("Email ou mot de passe incorrect. Veuillez reessayer.");
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div className="auth-error">
          <span>⚠</span> {error}
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
        />
      </div>

      <div className="auth-field">
        <div className="auth-input-row">
          <label className="auth-label">Mot de passe</label>
          <Link href="/auth/forgot-password" className="auth-forgot">
            Oublie ?
          </Link>
        </div>
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <button
        type="submit"
        className="auth-btn"
        disabled={loading}
        style={{ marginTop: 4 }}
      >
        {loading ? "Connexion en cours..." : "Se connecter →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page">

      {/* ── Panneau gauche decoratif (desktop) ── */}
      <aside className="auth-panel-left">
        <div className="auth-panel-orb auth-panel-orb-1" />
        <div className="auth-panel-orb auth-panel-orb-2" />

        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">✝</div>
          <div>
            <div className="auth-panel-logo-name">CCB</div>
            <div className="auth-panel-logo-sub">Centre Chretien Berakah</div>
          </div>
        </div>

        <div className="auth-panel-content">
          <div className="auth-panel-verse">
            &laquo;&nbsp;Je suis venu pour qu'ils aient la vie,
            et qu'ils l'aient en abondance.&nbsp;&raquo;
          </div>
          <div className="auth-panel-verse-ref">Jean 10 : 10</div>

          <div className="auth-panel-features">
            {[
              { icon: "📖", text: "Bible LSG complete avec plan de lecture" },
              { icon: "🙏", text: "Mur d'intercession communautaire" },
              { icon: "🎬", text: "Jesus Daily — videos prophetiques quotidiennes" },
              { icon: "🎓", text: "Classes et formations bibliques en ligne" },
            ].map(({ icon, text }) => (
              <div key={text} className="auth-panel-feature">
                <div className="auth-panel-feature-icon">{icon}</div>
                <div className="auth-panel-feature-text">{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-panel-footer">
          &copy; 2026 Centre Chretien Berakah
        </div>
      </aside>

      {/* ── Panneau droit formulaire ── */}
      <div className="auth-panel-right">
        <div className="auth-form-container">

          {/* Logo mobile */}
          <div className="auth-form-header">
            <div className="auth-form-logo-mobile">✝</div>
            <h1 className="auth-form-title">Bon retour !</h1>
            <p className="auth-form-subtitle">
              Connectez-vous a votre espace CCB 🙏
            </p>
          </div>

          <div className="auth-card">
            <Suspense fallback={
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                Chargement...
              </div>
            }>
              <LoginForm />
            </Suspense>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">ou</span>
              <div className="auth-divider-line" />
            </div>

            <p className="auth-switch">
              Pas encore de compte ?{" "}
              <Link href="/auth/register">Creer un compte</Link>
            </p>
          </div>

          <Link href="/" className="auth-back">
            ← Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
