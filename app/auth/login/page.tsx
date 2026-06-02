"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subscribeUserToPush } from "@/lib/push-notifications";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect. Veuillez reessayer.");
      setLoading(false);
    } else {
      // Auto-(ré)active les notifs push si possible (silencieux, non bloquant).
      // Couvre le cas où le user s'est inscrit ailleurs sans push ou a perdu
      // sa subscription DB.
      if (data?.user?.id) {
        void subscribeUserToPush(data.user.id).then((r) => {
          if (typeof window !== "undefined") {
            console.log("[CCB push] auto-subscribe login →", r);
          }
        });
      }
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div className="auth-error">
          <span>&#9888;</span> {error}
        </div>
      )}
      <div className="auth-field">
        <label className="auth-label">Adresse email</label>
        <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
      </div>
      <div className="auth-field">
        <div className="auth-input-row">
          <label className="auth-label">Mot de passe</label>
          <Link href="/auth/forgot-password" className="auth-forgot">Oublie ?</Link>
        </div>
        <div style={{ position: "relative" }}>
          <input
            className="auth-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            required
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-secondary)", display: "flex", alignItems: "center", lineHeight: 1, opacity: 0.7 }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
        {loading ? "Connexion en cours..." : "Se connecter →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
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
            &laquo;&nbsp;Je suis venu pour qu&apos;ils aient la vie, et qu&apos;ils l&apos;aient en abondance.&nbsp;&raquo;
          </div>
          <div className="auth-panel-verse-ref">Jean 10 : 10</div>
          <div className="auth-panel-features">
            {[
              { icon: "📖", text: "Bible LSG complete avec plan de lecture" },
              { icon: "🙏", text: "Mur d'intercession communautaire" },
              { icon: "📺", text: "Jesus Daily TV — predications, podcasts & live" },
              { icon: "🎓", text: "Classes et formations bibliques en ligne" },
            ].map(({ icon, text }) => (
              <div key={text} className="auth-panel-feature">
                <div className="auth-panel-feature-icon">{icon}</div>
                <div className="auth-panel-feature-text">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-panel-footer">&copy; 2026 Centre Chretien Berakah</div>
      </aside>
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div className="auth-form-logo-mobile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-officiel.png" alt="CCB" className="auth-logo-img" />
            </div>
            <h1 className="auth-form-title">Bon retour !</h1>
            <p className="auth-form-subtitle">Connectez-vous a votre espace CCB</p>
          </div>
          <div className="auth-card">
            <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Chargement...</div>}>
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
          <Link href="/" className="auth-back">← Retour a l&apos;accueil</Link>
        </div>
      </div>
    </div>
  );
}
