"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F, GROUP_CATEGORIES, notifyGroupsStaff } from "@/lib/groups/theme";

interface GroupLite {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  my_role: "owner" | "admin" | "member" | null;
}

interface Props {
  initialGroups: GroupLite[];
  currentUserId: string;
}

export default function GroupsListClient({ initialGroups, currentUserId }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupLite[]>(initialGroups);
  const [filter, setFilter] = useState<"all" | "mine" | "public">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [category, setCategory] = useState<string>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const filtered = useMemo(() => {
    let out = groups;
    if (filter === "mine") out = out.filter((g) => g.is_member);
    else if (filter === "public") out = out.filter((g) => g.type === "public");
    if (search.trim()) {
      const q = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      out = out.filter((g) => {
        const t = `${g.name} ${g.description ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return t.includes(q);
      });
    }
    return out;
  }, [groups, filter, search]);

  async function createGroup() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase.from("groups").insert({
      name: name.trim(),
      description: description.trim() || null,
      type, category,
      created_by: currentUserId,
    }).select("id, name, description, cover_url, type, category, created_by, created_at").single();
    if (e) { setError(e.message); setSaving(false); return; }
    const newGroup = data as Omit<GroupLite, "member_count" | "is_member" | "my_role">;

    // Auto-join creator as owner
    await supabase.from("group_members").insert({
      group_id: newGroup.id, user_id: currentUserId, role: "owner",
    });

    setGroups((prev) => [{
      ...newGroup,
      member_count: 1,
      is_member: true,
      my_role: "owner",
    }, ...prev]);

    // Notif staff
    notifyGroupsStaff(
      `🧑‍🤝‍🧑 Nouveau groupe : ${newGroup.name}`,
      `${type === "public" ? "Public" : "Privé"} · ${description.slice(0, 100) || "Sans description"}`,
      `/community/groups/${newGroup.id}`,
    );

    setShowCreate(false);
    setName(""); setDescription(""); setType("public"); setCategory("general");
    setSaving(false);
    flash("✅ Groupe créé !");
    router.push(`/community/groups/${newGroup.id}`);
  }

  async function joinGroup(groupId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId, user_id: currentUserId, role: "member",
    });
    if (error) { flash("Erreur : " + error.message); return; }
    setGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, is_member: true, my_role: "member", member_count: g.member_count + 1 }
        : g,
    ));
    flash("✅ Tu as rejoint le groupe !");
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      <style>{`
        .ccb-grp-hero { padding: 22px 14px 18px; }
        .ccb-grp-title { font-size: clamp(1.3rem, 4.5vw, 1.7rem); }
        .ccb-grp-tagline { font-size: clamp(10px, 2.8vw, 12px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) {
          .ccb-grp-hero { padding: 32px 24px 28px; }
          .ccb-grp-title { font-size: 2rem; }
          .ccb-grp-tagline { font-size: 14px; white-space: normal; }
        }
        .ccb-grp-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .ccb-grp-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .ccb-grp-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      {/* Hero */}
      <div className="ccb-grp-hero" style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <h1 className="ccb-grp-title" style={{
            fontFamily: F.title, fontWeight: 700, margin: "0 0 4px",
            letterSpacing: "0.04em",
          }}>
            🧑‍🤝‍🧑 GROUPES
          </h1>
          <p className="ccb-grp-tagline" style={{
            margin: 0, opacity: 0.9, fontStyle: "italic",
            color: "#EDE7FA",
          }}>
            Cellules, ministères, intercession — rejoins ou crée ton groupe.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 14px 48px" }}>
        {/* Back + Create button */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <Link href="/community" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Communauté</Link>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            ➕ Créer un groupe
          </button>
        </div>

        {/* Search */}
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un groupe…"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px", marginBottom: 10,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 999, color: T.text, fontSize: 13,
            fontFamily: F.body, outline: "none",
          }}
        />

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {(["all", "mine", "public"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f === "all" ? "📚 Tous" : f === "mine" ? "👥 Mes groupes" : "🌍 Publics"}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "60px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🧑‍🤝‍🧑</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              {groups.length === 0 ? "Aucun groupe pour l'instant. Crée le premier !" : "Aucun groupe ne correspond."}
            </div>
          </div>
        ) : (
          <div className="ccb-grp-grid">
            {filtered.map((g) => {
              const catDef = GROUP_CATEGORIES.find((c) => c.id === g.category);
              return (
                <div key={g.id} style={{
                  background: T.card, border: `1px solid ${g.is_member ? T.violet : T.border}`,
                  borderRadius: 14, overflow: "hidden",
                  boxShadow: T.shadowSoft,
                  display: "flex", flexDirection: "column",
                }}>
                  <Link href={`/community/groups/${g.id}`} style={{
                    background: g.cover_url
                      ? `url(${g.cover_url}) center/cover`
                      : `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
                    height: 100, display: "flex", alignItems: "flex-end",
                    padding: 12, textDecoration: "none",
                    color: "#fff", position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      background: g.type === "public" ? "rgba(212,175,55,0.85)" : "rgba(94,42,160,0.85)",
                      color: g.type === "public" ? "#111" : "#fff",
                      borderRadius: 999, padding: "2px 9px",
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {g.type === "public" ? "🌍 Public" : "🔒 Privé"}
                    </div>
                    {catDef && (
                      <span style={{
                        background: "rgba(0,0,0,0.4)", padding: "2px 8px",
                        borderRadius: 999, fontSize: 10, fontWeight: 700,
                      }}>
                        {catDef.emoji} {catDef.label}
                      </span>
                    )}
                  </Link>

                  <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
                    <Link href={`/community/groups/${g.id}`} style={{
                      fontFamily: F.title, fontSize: 16, fontWeight: 700,
                      color: T.text, textDecoration: "none", marginBottom: 4,
                    }}>
                      {g.name}
                    </Link>
                    {g.description && (
                      <p style={{
                        margin: "0 0 10px", fontSize: 12, color: T.textMuted, lineHeight: 1.5,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                      }}>
                        {g.description}
                      </p>
                    )}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      marginTop: "auto", fontSize: 11, color: T.textMuted,
                    }}>
                      <span>👥 {g.member_count} membre{g.member_count > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {g.is_member ? (
                        <Link href={`/community/groups/${g.id}`} style={{
                          display: "block", textAlign: "center",
                          background: T.violetSoft, color: T.violet,
                          border: `1px solid ${T.violet}`,
                          borderRadius: 10, padding: "8px 14px",
                          fontWeight: 700, fontSize: 12, textDecoration: "none",
                          fontFamily: F.body,
                        }}>
                          ✓ Membre · Ouvrir
                        </Link>
                      ) : g.type === "public" ? (
                        <button onClick={() => joinGroup(g.id)} style={{
                          width: "100%",
                          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                          color: "#fff", border: "none",
                          borderRadius: 10, padding: "8px 14px",
                          fontWeight: 700, fontSize: 12, cursor: "pointer",
                          fontFamily: F.body,
                        }}>
                          + Rejoindre
                        </button>
                      ) : (
                        <div style={{
                          textAlign: "center", padding: "8px 14px",
                          background: T.surface2, borderRadius: 10,
                          fontSize: 11, color: T.textMuted, fontStyle: "italic",
                        }}>
                          🔒 Sur invitation
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal créer */}
      {showCreate && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
          }}>
          <div style={{
            background: T.card, borderRadius: 18, padding: 20,
            width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
            border: `1px solid ${T.border}`, boxShadow: T.shadowMd,
          }}>
            <div style={{
              fontFamily: F.title, fontSize: 17, fontWeight: 700,
              color: T.violet, marginBottom: 16,
            }}>
              ➕ Créer un groupe
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>NOM</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex. Cellule Béthel, Intercesseurs CCB…"
                maxLength={80}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>DESCRIPTION (optionnel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} placeholder="À quoi sert ce groupe ?"
                style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={lbl}>TYPE</label>
                <select value={type} onChange={(e) => setType(e.target.value as "public" | "private")}
                  style={inputStyle}>
                  <option value="public">🌍 Public — tout le monde peut rejoindre</option>
                  <option value="private">🔒 Privé — sur invitation</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={lbl}>CATÉGORIE</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle}>
                  {GROUP_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div style={{ color: "#C24B7A", fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setShowCreate(false)} style={btnGhost}>Annuler</button>
              <button onClick={createGroup} disabled={saving} style={{
                ...btnPrimary,
                opacity: !name.trim() ? 0.5 : 1,
                cursor: saving ? "wait" : "pointer",
              }}>
                {saving ? "Création…" : "Créer le groupe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted,
  marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase",
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px",
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 13, fontFamily: F.body, outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  border: "none", borderRadius: 10, padding: "8px 16px",
  color: "#fff", fontWeight: 700, fontSize: 13,
  cursor: "pointer", fontFamily: F.body,
};
const btnGhost: React.CSSProperties = {
  background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "8px 16px",
  color: T.textMuted, cursor: "pointer", fontSize: 12,
  fontFamily: F.body,
};
function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
  };
}
