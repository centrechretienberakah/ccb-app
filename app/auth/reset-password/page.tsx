"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Établit la session de recovery depuis l'URL (hash implicit OU query PKCE)
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function establishSession() {
      if (typeof window === "undefined") return;

      // CAS 1 : flow PKCE → ?code=xxx en query
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!mounted) return;
        if (!error) {
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setSessionReady(true);
          return;
        }
      }

      // CAS 2 : flow implicit → #access_token=...&refresh_token=...&type=recovery dans le hash
      if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!mounted) return;
          if (!error) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setSessionReady(true);
            return;
          }
        }
      }

      // CAS 3 : session déjà active (event déjà passé ou user déjà connecté)
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) {
        setSessionReady(true);
        return;
      }

      // Aucune session → lien invalide après un délai
      setTimeout(() => {
        if (mounted && !sessionReady) setSessionError(true);
      }, 2500);
    }

    // Listener pour l'event PASSWORD_RECOVERY (auto-détection Supabase)
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
      }
    });

    establishSession();

    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2200);
  };

  return (
    <div className="auth-page">
      <aside className="auth-panel-left">
        <div className="auth-panel-orb auth-panel-orb-1" />
        <div className="auth-panel-orb auth-panel-orb-2" />
        <div className="auth-panel-logo">
          <div className="auth-panel-logo-mark">
            { }
            <img loading="lazy" decoding="async" src="/logo-officiel.png" alt="CCB" className="auth-logo-img" />
          </div>
          <div>
            <div className="auth-panel-logo-name">CCB</div>
            <div className="auth-panel-logo-sub">Centre Chretien Berakah</div>
          </div>
        </div>
        <div className="auth-panel-content">
          <div className="auth-panel-verse">
            &laquo;&nbsp;Crée en moi un cœur pur, ô Dieu, renouvelle en moi un esprit bien disposé.&nbsp;&raquo;
          </div>
          <div className="auth-panel-verse-ref">Psaume 51 : 12</div>
        </div>
        <div className="auth-panel-footer">&copy; 2026 Centre Chretien Berakah</div>
      </aside>

      <div className="auth-panel-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div className="auth-form-logo-mobile">🔒</div>
            <h1 className="auth-form-title">Nouveau mot de passe</h1>
            <p className="auth-form-subtitle">Choisissez un nouveau mot de passe sécurisé.</p>
          </div>

          <div className="auth-card">
            {done ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h3 style={{ margin: 0, color: "#22c55e", fontSize: 18 }}>Mot de passe mis à jour</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  Vous allez être redirigé vers votre tableau de bord…
                </p>
              </div>
            ) : sessionError ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>⏰</div>
                <h3 style={{ margin: 0, color: "#f87171", fontSize: 18 }}>Lien invalide ou expiré</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  Ce lien de réinitialisation n&apos;est plus valide. Demandez-en un nouveau.
                </p>
                <Link href="/auth/forgot-password" className="auth-btn" style={{ textDecoration: "none", marginTop: 8 }}>
                  Demander un nouveau lien
                </Link>
              </div>
            ) : !sessionReady ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
                <p style={{ margin: 0, fontSize: 14 }}>Vérification du lien…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {error && (
                  <div className="auth-error">
                    <span>&#9888;</span> {error}
                  </div>
                )}
                <div className="auth-field">
                  <label className="auth-label">Nouveau mot de passe</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Au moins 8 caractères"
                      required
                      minLength={8}
                      style={{ paddingRight: 44 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Masquer" : "Afficher"}
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
                <div className="auth-field">
                  <label className="auth-label">Confirmer le mot de passe</label>
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    required
                    minLength={8}
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? "Enregistrement..." : "Mettre à jour le mot de passe"}
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
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
