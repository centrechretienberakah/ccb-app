"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications, subscribeUserToPush } from "@/lib/push-notifications";

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
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("Cameroun");
  const [city, setCity] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Image trop volumineuse (max 5 Mo).");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    setError("");
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  // ── Auto-prompt push notifications après signup réussi (étape 3) ──
  // On utilise subscribeUserToPush(userId) avec l'id récupéré dans signUp,
  // pour éviter le bug où getUser() renvoie null juste après création de compte
  // (session pas encore propagée → la subscription DB échoue silencieusement).
  const push = usePushNotifications();
  const [signedUpUserId, setSignedUpUserId] = useState<string | null>(null);
  useEffect(() => {
    if (step !== 3 || !signedUpUserId) return;
    const timer = setTimeout(async () => {
      const result = await subscribeUserToPush(signedUpUserId);
      if (typeof window !== "undefined") {
        console.log("[CCB push] auto-subscribe register →", result);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [step, signedUpUserId]);

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
          bio: bio.trim() || null,
          country: country.trim() || "Cameroun",
          city: city.trim() || null,
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

    // Upload avatar (best-effort, ne bloque pas la création du compte)
    let avatarUrl: string | null = null;
    if (data.user && avatarFile) {
      setUploadingAvatar(true);
      try {
        const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
        // Path attendu par la policy RLS : <user_id>/<filename>
        const path = `${data.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, {
          upsert: true, cacheControl: "3600",
        });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      } catch { /* silencieux */ }
      setUploadingAvatar(false);
    }

    // Upsert user_profiles avec tous les champs
    if (data.user) {
      await supabase.from("user_profiles").upsert({
        user_id: data.user.id,
        display_name: displayName.trim(),
        full_name: displayName.trim(),
        bio: bio.trim() || null,
        country: country.trim() || "Cameroun",
        city: city.trim() || null,
        avatar_url: avatarUrl,
      });
    }

    // Initialize notification preferences — all ON by default
    try {
      localStorage.setItem("ccb-notif-prefs", JSON.stringify({
        likes: true, comments: true, prayer_reply: true, new_post: true, system: true,
      }));
    } catch {}

    // Capture user.id pour auto-subscribe push (step 3) — bypass la latence de session
    if (data.user) setSignedUpUserId(data.user.id);

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
            { }
            <img src="/logo-officiel.png" alt="CCB" className="auth-logo-img" />
          </div>
          <div>
            <div className="auth-panel-logo-name">CCB</div>
            <div className="auth-panel-logo-sub">Centre Chretien Berakah</div>
          </div>
        </div>

        <div className="auth-panel-content">
          <div className="auth-panel-verse">
            &laquo;&nbsp;Vous ne m&apos;avez pas choisi ;
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
              { }
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
              <form onSubmit={handleStep2} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Photo de profil */}
                <div className="auth-field" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <label htmlFor="register-avatar" style={{
                    cursor: "pointer", flexShrink: 0, position: "relative",
                    width: 72, height: 72, borderRadius: "50%",
                    background: avatarPreview
                      ? `url(${avatarPreview}) center/cover`
                      : "linear-gradient(135deg, var(--violet), #3E1C70)",
                    border: "2px solid var(--violet)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, color: "#fff",
                    boxShadow: "0 4px 14px rgba(90,44,160,0.25)",
                  }}>
                    {!avatarPreview && (
                      <span style={{ opacity: 0.8 }}>📷</span>
                    )}
                    <span style={{
                      position: "absolute", bottom: -2, right: -2,
                      width: 24, height: 24, borderRadius: "50%",
                      background: "var(--gold)", color: "#000",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                      border: "2px solid var(--surface-2)",
                    }}>+</span>
                    <input id="register-avatar" type="file" accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: "none" }} />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                      Photo de profil
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {avatarFile ? avatarFile.name.slice(0, 32) : "Optionnel · JPG/PNG · max 5 Mo"}
                    </div>
                    {avatarPreview && (
                      <button type="button"
                        onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                        style={{
                          marginTop: 4, padding: "3px 9px",
                          background: "transparent", color: "var(--text-muted)",
                          border: "1px solid var(--border)", borderRadius: 999,
                          fontSize: 10.5, fontWeight: 600, cursor: "pointer",
                        }}>Retirer</button>
                    )}
                  </div>
                </div>

                {/* Prénom / Nom d'affichage */}
                <div className="auth-field">
                  <label className="auth-label">Prénom / Nom d&apos;affichage *</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Jean-Pierre, Sœur Marie..."
                    required
                  />
                </div>

                {/* Bio */}
                <div className="auth-field">
                  <label className="auth-label">Bio (optionnel)</label>
                  <textarea
                    className="auth-input"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Quelques mots sur ton parcours, ta vocation, ton ministère..."
                    rows={3}
                    maxLength={300}
                    style={{ resize: "vertical", minHeight: 64 }}
                  />
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", textAlign: "right", marginTop: 2 }}>
                    {bio.length}/300
                  </div>
                </div>

                {/* Pays + Ville (ligne) */}
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="auth-field" style={{ flex: 1 }}>
                    <label className="auth-label">Pays</label>
                    <select
                      className="auth-input"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="Cameroun">🇨🇲 Cameroun</option>
                      <option value="Belgique">🇧🇪 Belgique</option>
                      <option value="France">🇫🇷 France</option>
                      <option value="Côte d&apos;Ivoire">🇨🇮 Côte d&apos;Ivoire</option>
                      <option value="Sénégal">🇸🇳 Sénégal</option>
                      <option value="RD Congo">🇨🇩 RD Congo</option>
                      <option value="Congo">🇨🇬 Congo</option>
                      <option value="Gabon">🇬🇦 Gabon</option>
                      <option value="Bénin">🇧🇯 Bénin</option>
                      <option value="Togo">🇹🇬 Togo</option>
                      <option value="Mali">🇲🇱 Mali</option>
                      <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                      <option value="Niger">🇳🇪 Niger</option>
                      <option value="Tchad">🇹🇩 Tchad</option>
                      <option value="Guinée">🇬🇳 Guinée</option>
                      <option value="Madagascar">🇲🇬 Madagascar</option>
                      <option value="Maroc">🇲🇦 Maroc</option>
                      <option value="Tunisie">🇹🇳 Tunisie</option>
                      <option value="Algérie">🇩🇿 Algérie</option>
                      <option value="Canada">🇨🇦 Canada</option>
                      <option value="USA">🇺🇸 États-Unis</option>
                      <option value="Royaume-Uni">🇬🇧 Royaume-Uni</option>
                      <option value="Suisse">🇨🇭 Suisse</option>
                      <option value="Allemagne">🇩🇪 Allemagne</option>
                      <option value="Pays-Bas">🇳🇱 Pays-Bas</option>
                      <option value="Autre">🌍 Autre</option>
                    </select>
                  </div>
                  <div className="auth-field" style={{ flex: 1 }}>
                    <label className="auth-label">Ville</label>
                    <input
                      className="auth-input"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Douala, Bruxelles..."
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
                    disabled={loading || uploadingAvatar}
                    style={{ flex: 2 }}
                  >
                    {loading
                      ? (uploadingAvatar ? "Upload photo…" : "Création…")
                      : "Créer mon compte 🎉"}
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
                    Votre compte <strong>{email}</strong> a été créé avec succès.
                  </div>
                </div>
                {push.state === "subscribed" && (
                  <div className="auth-success">
                    🔔 Notifications activées — vous serez tenu informé.
                  </div>
                )}
                {push.state === "denied" && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                    Notifications désactivées. Tu peux les réactiver dans Paramètres &gt; Notifications.
                  </div>
                )}
                <button
                  onClick={() => router.push("/dashboard")}
                  className="auth-btn auth-btn-gold"
                >
                  Accéder à mon espace →
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
