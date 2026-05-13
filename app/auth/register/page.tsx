"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  { label: "Compte", icon: "✉" },
  { label: "Profil", icon: "👤" },
  { label: "Bienvenue", icon: "🎉" },
];

export default function RegisterPage() {
  const router = useRouter();

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2
  const [displayName, setDisplayName] = useState("");
  const [cellGroup, setCellGroup] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Step 1: valider email + mot de passe ── */
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setStep(2);
  }

  /* ── Step 2: creer le compte ── */
  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Veuillez entrer votre prenom ou nom d'affichage.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          cell_group: cellGroup.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already")
          ? "Un compte avec cet email existe deja. Essayez de vous connecter."
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    // Upsert user_profiles
    if (data.user) {
      await supabase.from("user_profiles").upsert({
        user_id: data.user.id,
        display_name: displayName.trim(),
        cell_group: cellGroup.trim() || null,
      });
    }

    // Initialize notification preferences — all ON by default
    try {
      localStorage.setItem("ccb-notif-prefs", JSON.stringify({
        likes: true, comments: true, prayer_reply: true, new_post: true, system: true,
      }));
    } catch {}

    setStep(3);
    setLoading(false);
  }

  return (
    <div className="auth-page">

      {/* ── Panneau gauche (desktop) ── */}
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
            &laquo;&nbsp;Vous ne m'avez pas choisi ;
            mais moi, je vous ai choisis.&nbsp;&raquo;
          </div>
          <div className="auth-panel-verse-ref">Jean 15 : 16</div>

          <div className="auth-panel-features">
            {[
              { icon: "🌍", text: "Rejoignez une communaute de disciples passionnes" },
              { icon: "✨", text: "Developpez votre foi avec des outils numeriques" },
              { icon: "📡", text: "Cultes en direct et replays disponibles" },
              { icon: "👑", text: "Acces Premium aux formations et groupes prives" },
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

      {/* ── Panneau droit ── */}
      <div className="auth-panel-right">
        <div className="auth-form-container">

          {/* Header */}
          <div className="auth-form-header">
            <div className="auth-form-logo-mobile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-officiel.png" alt="CCB" className="auth-logo-img" />
            </div>
            {step < 3 ? (
              <>
                <h1 className="auth-form-title">Rejoignez CCB</h1>
                <p className="auth-form-subtitle">Votre place dans la famille est reservee</p>
              </>
            ) : (
              <>
                <h1 className="auth-form-title">Bienvenue ! 🎉</h1>
                <p className="auth-form-subtitle">Votre compte a ete cree avec succes</p>
              </>
            )}
          </div>

          {/* Stepper */}
          {step < 3 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 24 }}>
              {STEPS.map(({ label, icon }, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: done ? "var(--violet)" : active ? "var(--violet)" : "var(--surface-2)",
                        border: `2px solid ${active || done ? "var(--violet)" : "var(--border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: done ? 16 : 14,
                        color: active || done ? "white" : "var(--text-muted)",
                        fontWeight: 700,
                        transition: "all 0.2s",
                      }}>
                        {done ? "✓" : icon}
                      </div>
                      <span style={{ fontSize: 10, color: active ? "var(--violet)" : "var(--text-muted)", fontWeight: active ? 700 : 400 }}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 48, height: 2, background: step > n ? "var(--violet)" : "var(--border)", margin: "0 4px", marginBottom: 18 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Card */}
          <div className="auth-card">
            {error && (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* ── ETAPE 1 ── */}
            {step === 1 && (
              <form onSubmit={handleStep1} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                  <label className="auth-label">Mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Confirmer le mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="auth-btn" style={{ marginTop: 4 }}>
                  Continuer →
                </button>
              </form>
            )}

            {/* ── ETAPE 2 ── */}
            {step === 2 && (
              <form onSubmit={handleStep2} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="auth-field">
                  <label className="auth-label">Prenom / Nom d&apos;affichage</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Jean-Pierre ou Soeur Marie"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Groupe de cellule (optionnel)</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={cellGroup}
                    onChange={(e) => setCellGroup(e.target.value)}
                    placeholder="Ex: Cellule Bastos, Groupe Alpha..."
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(""); }}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                      color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 600,
                    }}
                  >
                    ← Retour
                  </button>
                  <button
                    type="submit"
                    className="auth-btn"
                    disabled={loading}
                    style={{ flex: 2 }}
                  >
                    {loading ? "Creation..." : "Creer mon compte 🎉"}
                  </button>
                </div>
              </form>
            )}

            {/* ── ETAPE 3 — Succes ── */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "center" }}>
                <div style={{ fontSize: 56, lineHeight: 1 }}>🎉</div>
                <div>
                  <div style={{ fontFamily: "var(--font-title)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                    Bienvenue dans la famille CCB !
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Verifiez votre boite email pour confirmer votre adresse,
                    puis connectez-vous pour acceder a votre espace.
                  </div>
                </div>
                <div className="auth-success">
                  Un email de confirmation a ete envoye a <strong>{email}</strong>
                </div>
                <button
                  onClick={() => router.push("/auth/login")}
                  className="auth-btn auth-btn-gold"
                >
                  Aller a la connexion →
                </button>
              </div>
            )}

            {step < 3 && (
              <>
                <div className="auth-divider">
                  <div className="auth-divider-line" />
                  <span className="auth-divider-text">ou</span>
                  <div className="auth-divider-line" />
                </div>
                <p className="auth-switch">
                  Deja un compte ?{" "}
                  <Link href="/auth/login">Se connecter</Link>
                </p>
              </>
            )}
          </div>

          <Link href="/" className="auth-back">
            ← Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
