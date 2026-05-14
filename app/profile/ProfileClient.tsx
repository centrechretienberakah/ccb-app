"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  user: any;
  profile: any;
  milestones: any[];
  stats: { chaptersRead: number; versesSaved: number; readingDates: string[] };
  isAdmin: boolean;
}

const MILESTONE_LIST = [
  { key: "baptism",      label: "Baptisé(e)",              icon: "💧" },
  { key: "consecration", label: "Consacré(e)",              icon: "🕊️" },
  { key: "cell_group",   label: "Engagé(e) en cellule",    icon: "👥" },
  { key: "ministry",     label: "Serviteur(e) actif(ve)",  icon: "🙌" },
];

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = [...new Set(dates.map((d) => d.split("T")[0]))].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const curr = new Date(unique[i - 1]).getTime();
    const prev = new Date(unique[i]).getTime();
    if ((curr - prev) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

export default function ProfileClient({ user, profile, milestones, stats, isAdmin }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(!profile);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    display_name: profile?.display_name || user.email?.split("@")[0] || "",
    bio: profile?.bio || "",
    testimony: profile?.testimony || "",
    cell_group: profile?.cell_group || "",
    is_public: profile?.is_public ?? true,
    avatar_url: profile?.avatar_url || "",
  });

  const [activeMilestones, setActiveMilestones] = useState<Set<string>>(
    new Set(milestones.map((m) => m.milestone))
  );

  const streak = computeStreak(stats.readingDates);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Photo max 2 MB"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: publicUrl + "?t=" + Date.now() }));
      showToast("Photo mise à jour ✅");
    } catch (err: any) {
      showToast("Erreur upload : " + (err?.message || "inconnu"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profileData: any = {
        user_id: user.id,
        display_name: form.display_name,
        bio: form.bio,
        testimony: form.testimony,
        is_public: form.is_public,
        avatar_url: form.avatar_url,
      };
      if (isAdmin) profileData.cell_group = form.cell_group;
      const { error } = await supabase.from("user_profiles").upsert(profileData, { onConflict: "user_id" });
      if (error) throw error;
      if (isAdmin) {
        const existing = new Set(milestones.map((m) => m.milestone));
        for (const key of Array.from(activeMilestones)) {
          if (!existing.has(key)) {
            await supabase.from("spiritual_milestones").upsert(
              { user_id: user.id, milestone: key }, { onConflict: "user_id,milestone" }
            );
          }
        }
        for (const key of Array.from(existing)) {
          if (!activeMilestones.has(key)) {
            await supabase.from("spiritual_milestones").delete().eq("user_id", user.id).eq("milestone", key);
          }
        }
      }
      showToast("Profil sauvegardé ✅");
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      showToast("Erreur : " + (err?.message || "inconnu"));
    } finally {
      setSaving(false);
    }
  }

  function toggleMilestone(key: string) {
    if (!isAdmin) return;
    setActiveMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const avatarSrc = form.avatar_url || null;
  const initials = (form.display_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: "var(--radius-md)", padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
    fontFamily: "var(--font-body)", outline: "none",
  };

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "var(--gold)", color: "#000", padding: "10px 24px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 700,
          zIndex: 9999, boxShadow: "var(--shadow-gold)", whiteSpace: "nowrap",
        }}>{toast}</div>
      )}

      {/* Badge admin */}
      {isAdmin && (
        <div style={{
          background: "var(--violet-pale)", borderBottom: "1px solid var(--border)",
          padding: "6px 16px", textAlign: "center",
          fontSize: 11, color: "var(--violet)", fontWeight: 700, letterSpacing: "0.1em",
        }}>
          🛡️ MODE ADMINISTRATEUR — Vous pouvez gérer les cellules et jalons
        </div>
      )}

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", overflowX: "auto" }}>
          <span style={{
            padding: "13px 16px",
            borderBottom: "2px solid var(--gold)",
            color: "var(--gold)",
            fontWeight: 700, fontSize: 13,
            whiteSpace: "nowrap", fontFamily: "var(--font-body)",
          }}>👤 Mon Profil</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, padding: "8px 16px", flexShrink: 0 }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "6px 14px",
                color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}>✏️ Modifier</button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", padding: "6px 14px",
                  color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                  fontFamily: "var(--font-body)",
                }}>Annuler</button>
                <button onClick={handleSave} disabled={saving} style={{
                  background: saving ? "var(--surface-2)" : "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                  border: "none", borderRadius: "var(--radius-md)", padding: "6px 16px",
                  color: saving ? "var(--text-muted)" : "#000",
                  fontSize: 12, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)",
                }}>{saving ? "Sauvegarde..." : "💾 Sauvegarder"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Avatar + nom */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" style={{
                width: 100, height: 100, borderRadius: "50%",
                objectFit: "cover", border: "3px solid var(--gold)",
              }} />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, fontWeight: 700, color: "#000",
              }}>{initials}</div>
            )}
            {editing && (
              <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} style={{
                position: "absolute", bottom: 0, right: 0,
                background: "var(--gold)", border: "2px solid var(--page-bg)",
                borderRadius: "50%", width: 32, height: 32,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 14,
              }}>
                {uploadingPhoto ? "⏳" : "📷"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
          </div>

          {editing ? (
            <input
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Ton prénom et nom"
              style={{ ...inputStyle, fontSize: 18, fontWeight: 700, textAlign: "center", maxWidth: 300 }}
            />
          ) : (
            <div style={{
              fontSize: 22, fontWeight: 700, color: "var(--text-primary)",
              fontFamily: "var(--font-title)",
            }}>
              {form.display_name || user.email}
            </div>
          )}

          {form.cell_group && !editing && (
            <div style={{
              marginTop: 8, background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-full)",
              padding: "4px 14px", fontSize: 12, color: "var(--gold)",
            }}>👥 {form.cell_group}</div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "🔥", value: streak,            label: "jours streak" },
            { icon: "📖", value: stats.chaptersRead, label: "chapitres lus" },
            { icon: "⭐", value: stats.versesSaved,  label: "versets sauvés" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "16px 10px",
              textAlign: "center", boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", fontWeight: 700,
            marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>À propos</div>
          {editing ? (
            <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Quelques mots sur toi..." rows={3}
              style={{ ...inputStyle, resize: "vertical" } as any}
            />
          ) : (
            <p style={{
              color: form.bio ? "var(--text-secondary)" : "var(--text-muted)",
              fontSize: 14, lineHeight: 1.7, margin: 0,
              fontStyle: form.bio ? "normal" : "italic",
            }}>
              {form.bio || "Aucune biographie renseignée."}
            </p>
          )}
        </div>

        {/* Groupe de cellule — ADMIN ONLY */}
        {isAdmin && editing && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid rgba(90,44,160,0.3)",
            borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11, color: "var(--violet-light)", fontWeight: 700,
              marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em",
            }}>🛡️ Groupe de cellule (Admin)</div>
            <input value={form.cell_group}
              onChange={(e) => setForm((f) => ({ ...f, cell_group: e.target.value }))}
              placeholder="Ex : Cellule Jeunes, Cellule Nord..."
              style={inputStyle}
            />
          </div>
        )}

        {/* Témoignage */}
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", fontWeight: 700,
            marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Mon Témoignage</div>
          {editing ? (
            <textarea value={form.testimony}
              onChange={(e) => setForm((f) => ({ ...f, testimony: e.target.value }))}
              placeholder="Partage ce que Dieu a fait dans ta vie..." rows={5}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 } as any}
            />
          ) : (
            <p style={{
              color: form.testimony ? "var(--text-secondary)" : "var(--text-muted)",
              fontSize: 14, lineHeight: 1.8, margin: 0, fontStyle: "italic",
              borderLeft: `3px solid ${form.testimony ? "var(--gold)" : "var(--border)"}`,
              paddingLeft: 14,
            }}>
              {form.testimony || "Aucun témoignage partagé encore."}
            </p>
          )}
        </div>

        {/* Jalons spirituels */}
        <div style={{
          background: "var(--card-bg)",
          border: `1px solid ${isAdmin ? "rgba(90,44,160,0.3)" : "var(--border)"}`,
          borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
              color: isAdmin ? "var(--violet-light)" : "var(--text-muted)",
            }}>
              {isAdmin ? "🛡️ Jalons Spirituels (Admin)" : "Jalons Spirituels"}
            </div>
            {!isAdmin && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
                Gérés par les administrateurs
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {MILESTONE_LIST.map((m) => {
              const active = activeMilestones.has(m.key);
              return (
                <button key={m.key}
                  onClick={() => isAdmin && editing && toggleMilestone(m.key)}
                  style={{
                    background: active ? "rgba(212,175,55,0.1)" : "var(--surface)",
                    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)", padding: "14px 12px", textAlign: "left",
                    cursor: isAdmin && editing ? "pointer" : "default",
                    display: "flex", alignItems: "center", gap: 10,
                    boxShadow: active ? "var(--shadow-gold)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--gold)" : "var(--text-muted)" }}>
                      {m.label}
                    </div>
                    {active && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>✓ Accompli</div>}
                  </div>
                </button>
              );
            })}
          </div>
          {isAdmin && editing && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
              Cliquez sur un jalon pour le cocher / décocher
            </p>
          )}
        </div>

        {/* Visibilité du profil */}
        {editing && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Profil visible par la communauté
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {form.is_public ? "Les autres membres peuvent voir ton profil" : "Ton profil est privé"}
                </div>
              </div>
              <button onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))} style={{
                background: form.is_public ? "var(--gold)" : "var(--surface-2)",
                border: "none", borderRadius: 20, width: 48, height: 26,
                cursor: "pointer", position: "relative", transition: "background 0.2s",
                flexShrink: 0,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 3, left: form.is_public ? 24 : 4,
                  transition: "left 0.2s",
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Lien Communauté */}
        <a href="/community" style={{
          display: "flex", background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20, textDecoration: "none",
          alignItems: "center", justifyContent: "space-between",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Voir la Communauté</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Découvre les autres membres CCB</div>
            </div>
          </div>
          <span style={{ color: "var(--gold)", fontSize: 18 }}>→</span>
        </a>
      </div>
    </div>
  );
}
