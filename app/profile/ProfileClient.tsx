"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  user: any;
  profile: any;
  milestones: any[];
  stats: { chaptersRead: number; versesSaved: number; readingDates: string[] };
}

const MILESTONE_LIST = [
  { key: "baptism", label: "Baptisé(e)", icon: "💧" },
  { key: "consecration", label: "Consacré(e)", icon: "🕊️" },
  { key: "cell_group", label: "Engagé(e) en cellule", icon: "👥" },
  { key: "ministry", label: "Serviteur(e) actif(ve)", icon: "🙌" },
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

export default function ProfileClient({ user, profile, milestones, stats }: Props) {
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

  const [activeMillestones, setActiveMilestones] = useState<Set<string>>(
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
    if (file.size > 2 * 1024 * 1024) {
      showToast("Photo max 2 MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
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
      const profileData = {
        user_id: user.id,
        display_name: form.display_name,
        bio: form.bio,
        testimony: form.testimony,
        cell_group: form.cell_group,
        is_public: form.is_public,
        avatar_url: form.avatar_url,
      };
      const { error } = await supabase
        .from("user_profiles")
        .upsert(profileData, { onConflict: "user_id" });
      if (error) throw error;

      // Synchroniser les jalons
      const existing = new Set(milestones.map((m) => m.milestone));
      for (const key of Array.from(activeMillestones)) {
        if (!existing.has(key)) {
          await supabase.from("spiritual_milestones").upsert(
            { user_id: user.id, milestone: key },
            { onConflict: "user_id,milestone" }
          );
        }
      }
      for (const key of Array.from(existing)) {
        if (!activeMillestones.has(key)) {
          await supabase
            .from("spiritual_milestones")
            .delete()
            .eq("user_id", user.id)
            .eq("milestone", key);
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
    setActiveMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const avatarSrc = form.avatar_url || null;
  const initials = (form.display_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", fontFamily: "'Inter', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#d4af37", color: "#000", padding: "10px 24px",
          borderRadius: 30, fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap"
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
        borderBottom: "1px solid #1a1a1a", padding: "16px",
        position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)"
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#d4af37" }}>Mon Profil</div>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{
                background: "#1a1a1a", border: "1px solid #333", borderRadius: 10,
                padding: "8px 16px", color: "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}>✏️ Modifier</button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} style={{
                  background: "#1a1a1a", border: "1px solid #333", borderRadius: 10,
                  padding: "8px 16px", color: "#888", fontSize: 13, cursor: "pointer"
                }}>Annuler</button>
                <button onClick={handleSave} disabled={saving} style={{
                  background: saving ? "#666" : "linear-gradient(135deg, #d4af37, #c9a227)",
                  border: "none", borderRadius: 10,
                  padding: "8px 20px", color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer"
                }}>{saving ? "Sauvegarde..." : "💾 Sauvegarder"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* Avatar + nom */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" style={{
                width: 100, height: 100, borderRadius: "50%",
                objectFit: "cover", border: "3px solid #d4af37"
              }} />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                background: "linear-gradient(135deg, #d4af37, #c9a227)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, fontWeight: 700, color: "#000"
              }}>{initials}</div>
            )}
            {editing && (
              <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} style={{
                position: "absolute", bottom: 0, right: 0,
                background: "#d4af37", border: "none", borderRadius: "50%",
                width: 32, height: 32, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
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
              style={{
                background: "#1a1a1a", border: "1px solid #333", borderRadius: 10,
                padding: "10px 16px", color: "#e8e0d0", fontSize: 18, fontWeight: 700,
                textAlign: "center", width: "100%", maxWidth: 300
              }}
            />
          ) : (
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f0e8d0" }}>
              {form.display_name || user.email}
            </div>
          )}
          {form.cell_group && !editing && (
            <div style={{
              marginTop: 6, background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20,
              padding: "4px 14px", fontSize: 12, color: "#d4af37"
            }}>👥 {form.cell_group}</div>
          )}
        </div>

        {/* Stats de croissance */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "🔥", value: streak, label: "jours streak" },
            { icon: "📖", value: stats.chaptersRead, label: "chapitres lus" },
            { icon: "⭐", value: stats.versesSaved, label: "versets sauvés" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "#111", border: "1px solid #222",
              borderRadius: 14, padding: "16px 10px", textAlign: "center"
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#d4af37" }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            À propos
          </div>
          {editing ? (
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Quelques mots sur toi..."
              rows={3}
              style={{
                width: "100%", background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 10, padding: "10px 14px", color: "#e8e0d0",
                fontSize: 14, resize: "vertical", boxSizing: "border-box"
              }}
            />
          ) : (
            <p style={{ color: form.bio ? "#ccc" : "#555", fontSize: 14, lineHeight: 1.7, margin: 0, fontStyle: form.bio ? "normal" : "italic" }}>
              {form.bio || "Aucune biographie renseignée."}
            </p>
          )}
        </div>

        {/* Groupe de cellule */}
        {editing && (
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Groupe de cellule
            </div>
            <input
              value={form.cell_group}
              onChange={(e) => setForm((f) => ({ ...f, cell_group: e.target.value }))}
              placeholder="Ex : Cellule Jeunes, Cellule Nord..."
              style={{
                width: "100%", background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 10, padding: "10px 14px", color: "#e8e0d0",
                fontSize: 14, boxSizing: "border-box"
              }}
            />
          </div>
        )}

        {/* Témoignage */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Mon Témoignage
          </div>
          {editing ? (
            <textarea
              value={form.testimony}
              onChange={(e) => setForm((f) => ({ ...f, testimony: e.target.value }))}
              placeholder="Partage ce que Dieu a fait dans ta vie..."
              rows={5}
              style={{
                width: "100%", background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 10, padding: "10px 14px", color: "#e8e0d0",
                fontSize: 14, resize: "vertical", lineHeight: 1.6, boxSizing: "border-box"
              }}
            />
          ) : (
            <p style={{
              color: form.testimony ? "#ddd" : "#555", fontSize: 14, lineHeight: 1.8, margin: 0,
              fontStyle: form.testimony ? "italic" : "italic",
              borderLeft: form.testimony ? "3px solid #d4af37" : "3px solid #222",
              paddingLeft: 14
            }}>
              {form.testimony || "Aucun témoignage partagé encore."}
            </p>
          )}
        </div>

        {/* Jalons spirituels */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
            Jalons Spirituels
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {MILESTONE_LIST.map((m) => {
              const active = activeMillestones.has(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => editing && toggleMilestone(m.key)}
                  style={{
                    background: active ? "rgba(212,175,55,0.15)" : "#0d0d0d",
                    border: `1px solid ${active ? "#d4af37" : "#222"}`,
                    borderRadius: 12, padding: "14px 12px", textAlign: "left",
                    cursor: editing ? "pointer" : "default",
                    display: "flex", alignItems: "center", gap: 10
                  }}
                >
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#d4af37" : "#777" }}>
                      {m.label}
                    </div>
                    {active && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>✓ Accompli</div>}
                  </div>
                </button>
              );
            })}
          </div>
          {editing && <p style={{ fontSize: 11, color: "#555", marginTop: 10, marginBottom: 0 }}>
            Clique sur un jalon pour le cocher / décocher
          </p>}
        </div>

        {/* Visibilité du profil */}
        {editing && (
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc" }}>Profil visible par la communauté</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {form.is_public ? "Les autres membres peuvent voir ton profil" : "Ton profil est privé"}
                </div>
              </div>
              <button
                onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
                style={{
                  background: form.is_public ? "#d4af37" : "#333",
                  border: "none", borderRadius: 20, width: 48, height: 26,
                  cursor: "pointer", position: "relative", transition: "background 0.2s"
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 3, left: form.is_public ? 24 : 4,
                  transition: "left 0.2s"
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Lien vers la communauté */}
        <a href="/community" style={{
          display: "block", background: "#111", border: "1px solid #1a1a1a",
          borderRadius: 16, padding: 20, textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc" }}>Voir la Communauté</div>
              <div style={{ fontSize: 12, color: "#555" }}>Découvre les autres membres CCB</div>
            </div>
          </div>
          <span style={{ color: "#d4af37", fontSize: 18 }}>→</span>
        </a>
      </div>
    </div>
  );
}
