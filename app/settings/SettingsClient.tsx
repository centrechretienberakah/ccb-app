"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────
interface Profile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  city?: string;
  country?: string;
  is_public?: boolean;
}

// ─── Shared styles ────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--input-bg, var(--page-bg))",
  border: "1px solid var(--input-border, var(--border))",
  borderRadius: "var(--radius-md)", padding: "11px 14px",
  color: "var(--text-primary)", fontSize: 14,
  boxSizing: "border-box", fontFamily: "inherit",
  outline: "none",
};

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>{title}</h3>
      </div>
      <div style={{ padding: "16px 20px 20px" }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, label, sublabel }: { value: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sublabel}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{ width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: value ? "var(--gold)" : "var(--border)", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

// ─── SettingsClient ───────────────────────────────────────────
export default function SettingsClient({ userId, email, profile: initialProfile }: {
  userId: string;
  email: string;
  profile: Profile | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Compte ────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [country, setCountry] = useState(initialProfile?.country ?? "Cameroun");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Sécurité ──────────────────────────────────────────────
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Apparence ─────────────────────────────────────────────
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("ccb-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(saved === "dark" || (!saved && prefersDark));
  }, []);

  function applyTheme(dark: boolean) {
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("ccb-theme", dark ? "dark" : "light");
  }

  // ── Notifications prefs (local only — stored in localStorage) ──
  const [notifPrefs, setNotifPrefs] = useState({
    likes: true, comments: true, prayer_reply: true,
    new_post: true, system: true,
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ccb-notif-prefs");
      if (saved) setNotifPrefs(JSON.parse(saved));
    } catch {}
  }, []);

  function setNotifPref(key: keyof typeof notifPrefs, val: boolean) {
    const next = { ...notifPrefs, [key]: val };
    setNotifPrefs(next);
    localStorage.setItem("ccb-notif-prefs", JSON.stringify(next));
  }

  // ── Avatar upload ─────────────────────────────────────────
  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setProfileMsg({ ok: false, text: "Erreur upload : " + error.message }); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl + "?v=" + Date.now());
    setUploadingAvatar(false);
  }

  // ── Save profile ──────────────────────────────────────────
  async function saveProfile() {
    if (!displayName.trim()) { setProfileMsg({ ok: false, text: "Le nom d'affichage est requis." }); return; }
    setSavingProfile(true); setProfileMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: userId,
      display_name: displayName.trim(),
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      country: country.trim() || "Cameroun",
      avatar_url: avatarUrl || null,
    }, { onConflict: "user_id" });
    setSavingProfile(false);
    setProfileMsg(error
      ? { ok: false, text: error.message }
      : { ok: true, text: "✅ Profil mis à jour avec succès !" }
    );
    setTimeout(() => setProfileMsg(null), 4000);
  }

  // ── Change password ───────────────────────────────────────
  async function changePassword() {
    if (!newPwd) { setPwdMsg({ ok: false, text: "Entrez un nouveau mot de passe." }); return; }
    if (newPwd.length < 6) { setPwdMsg({ ok: false, text: "Au moins 6 caractères requis." }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: "Les mots de passe ne correspondent pas." }); return; }
    setSavingPwd(true); setPwdMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) { setPwdMsg({ ok: false, text: error.message }); return; }
    setPwdMsg({ ok: true, text: "✅ Mot de passe mis à jour !" });
    setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setPwdMsg(null), 4000);
  }

  // ── Sign out ──────────────────────────────────────────────
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ── Initials avatar fallback ──────────────────────────────
  const initials = (displayName || email).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <span style={{
            padding: "13px 16px",
            borderBottom: "2px solid var(--gold)",
            color: "var(--gold)",
            fontWeight: 700, fontSize: 13,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
          }}>⚙️ Paramètres</span>
          <span style={{
            marginLeft: "auto", padding: "13px 16px",
            fontSize: 12, color: "var(--text-muted)",
            fontFamily: "var(--font-body)", flexShrink: 0,
          }}>{email}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 32px" }}>

      {/* ── Section Compte ── */}
      <SectionCard title="Mon compte" icon="👤">
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName || "Avatar"} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--gold)" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#000", border: "3px solid var(--gold)" }}>
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--gold)", border: "2px solid var(--card-bg)", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✏️
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{displayName || "Pas encore de nom"}</div>
            <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", padding: 0, color: "var(--gold)", fontSize: 12, cursor: "pointer", marginTop: 4 }}>
              {uploadingAvatar ? "⏳ Chargement..." : "Changer la photo"}
            </button>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Nom d&apos;affichage *</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom ou pseudo" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Email</label>
            <input value={email} disabled style={{ ...inputStyle, color: "var(--text-muted)", cursor: "not-allowed", background: "var(--surface)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Ville</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Douala" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Pays</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Cameroun" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Quelques mots sur vous..." rows={3}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        {profileMsg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: profileMsg.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${profileMsg.ok ? "var(--success)" : "var(--error)"}`, fontSize: 13, color: profileMsg.ok ? "var(--success)" : "var(--error)" }}>
            {profileMsg.text}
          </div>
        )}

        <button onClick={saveProfile} disabled={savingProfile}
          style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", border: "none", borderRadius: "var(--radius-full)", padding: "12px", color: "#000", fontWeight: 700, fontSize: 14, cursor: savingProfile ? "not-allowed" : "pointer" }}>
          {savingProfile ? "Enregistrement..." : "💾 Enregistrer les modifications"}
        </button>
      </SectionCard>

      {/* ── Section Sécurité ── */}
      <SectionCard title="Sécurité" icon="🔒">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Confirmer le mot de passe</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>
          {/* Password strength indicator */}
          {newPwd && (
            <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3,4].map((i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: newPwd.length >= i * 3
                    ? (newPwd.length >= 10 ? "var(--success)" : newPwd.length >= 6 ? "var(--gold)" : "var(--error)")
                    : "var(--border)",
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
          )}
        </div>

        {pwdMsg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: pwdMsg.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${pwdMsg.ok ? "var(--success)" : "var(--error)"}`, fontSize: 13, color: pwdMsg.ok ? "var(--success)" : "var(--error)" }}>
            {pwdMsg.text}
          </div>
        )}

        <button onClick={changePassword} disabled={savingPwd || !newPwd}
          style={{ marginTop: 16, width: "100%", background: newPwd ? "var(--violet-dark)" : "var(--surface)", border: `1px solid ${newPwd ? "var(--violet-light)" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "12px", color: newPwd ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 14, cursor: (savingPwd || !newPwd) ? "not-allowed" : "pointer" }}>
          {savingPwd ? "Mise à jour..." : "🔑 Changer le mot de passe"}
        </button>
      </SectionCard>

      {/* ── Section Apparence ── */}
      <SectionCard title="Apparence" icon="🎨">
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Choisissez le thème de l&apos;application</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { dark: false, label: "☀️ Clair", desc: "Fond beige chaleureux" },
              { dark: true,  label: "🌙 Sombre", desc: "Fond nuit profond" },
            ].map((t) => (
              <button key={String(t.dark)} onClick={() => applyTheme(t.dark)}
                style={{
                  background: isDark === t.dark ? "rgba(212,175,55,0.12)" : "var(--surface)",
                  border: `2px solid ${isDark === t.dark ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)", padding: "14px 12px",
                  cursor: "pointer", textAlign: "center", transition: "all 0.15s ease",
                }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{t.label.split(" ")[0]}</div>
                <div style={{ fontSize: 13, fontWeight: isDark === t.dark ? 700 : 500, color: isDark === t.dark ? "var(--gold)" : "var(--text-secondary)" }}>
                  {t.label.split(" ").slice(1).join(" ")}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{t.desc}</div>
                {isDark === t.dark && <div style={{ marginTop: 6, fontSize: 10, color: "var(--gold)", fontWeight: 700 }}>✓ ACTIF</div>}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Section Notifications ── */}
      <SectionCard title="Notifications" icon="🔔">
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Choisissez quand être notifié
        </div>
        <Toggle value={notifPrefs.likes}        onChange={(v) => setNotifPref("likes", v)}        label="❤️ J'aime sur vos posts"        sublabel="Quelqu'un aime votre publication" />
        <Toggle value={notifPrefs.comments}     onChange={(v) => setNotifPref("comments", v)}     label="💬 Commentaires"                sublabel="Nouveau commentaire sur votre post" />
        <Toggle value={notifPrefs.prayer_reply} onChange={(v) => setNotifPref("prayer_reply", v)} label="🙏 Réponses à vos prières"      sublabel="Quelqu'un intercède pour vous" />
        <Toggle value={notifPrefs.new_post}     onChange={(v) => setNotifPref("new_post", v)}     label="📝 Nouvelles publications"       sublabel="Posts récents dans la communauté" />
        <div style={{ borderBottom: "none" }}>
          <Toggle value={notifPrefs.system}     onChange={(v) => setNotifPref("system", v)}       label="🔔 Annonces de l'église"        sublabel="Événements, messages importants" />
        </div>
      </SectionCard>

      {/* ── Section Compte / Danger ── */}
      <SectionCard title="Session" icon="🚪">
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Vous êtes connecté en tant que <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
          La déconnexion vous redirigera vers la page de connexion.
        </p>
        <button onClick={signOut}
          style={{ width: "100%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "var(--radius-full)", padding: "12px", color: "var(--error)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          🚪 Se déconnecter
        </button>
      </SectionCard>

      {/* App version */}
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
        Centre Chrétien Berakah · v1.0 · 2026
      </div>
      </div>
    </div>
  );
}
