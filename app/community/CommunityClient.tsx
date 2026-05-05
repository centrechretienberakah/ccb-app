"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MILESTONES = [
  { key: "baptism_water", label: "Baptême d'eau", icon: "💧" },
  { key: "baptism_spirit", label: "Baptême du Saint-Esprit", icon: "🔥" },
  { key: "cell_member", label: "Membre de cellule", icon: "👥" },
  { key: "school_of_faith", label: "École de la foi", icon: "📖" },
  { key: "leadership_track", label: "Parcours leadership", icon: "⭐" },
  { key: "missions", label: "Missions", icon: "🌍" },
];

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
}

interface Props {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  memberMilestones: Record<string, string[]>;
}

export default function CommunityClient({ members, currentUserId, isAdmin, memberMilestones }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCell, setFilterCell] = useState("");

  // État modal admin
  const [adminModal, setAdminModal] = useState<Member | null>(null);
  const [modalCellGroup, setModalCellGroup] = useState("");
  const [modalMilestones, setModalMilestones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Groupes uniques pour le filtre
  const cellGroups = [...new Set(members.map((m) => m.cell_group).filter(Boolean))];

  const filtered = members.filter((m) => {
    const name = (m.display_name || "").toLowerCase();
    const cell = (m.cell_group || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || cell.includes(search.toLowerCase());
    const matchCell = !filterCell || m.cell_group === filterCell;
    return matchSearch && matchCell;
  });

  function openAdminModal(member: Member) {
    setAdminModal(member);
    setModalCellGroup(member.cell_group || "");
    setModalMilestones(memberMilestones[member.user_id] || []);
    setSaveMsg("");
  }

  function toggleModalMilestone(key: string) {
    setModalMilestones((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function saveAdminChanges() {
    if (!adminModal) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const supabase = createClient();

      // Mettre à jour le groupe de cellule
      await supabase
        .from("user_profiles")
        .update({ cell_group: modalCellGroup || null })
        .eq("user_id", adminModal.user_id);

      // Sync jalons : supprimer tous, ré-insérer les cochés
      await supabase
        .from("spiritual_milestones")
        .delete()
        .eq("user_id", adminModal.user_id);

      if (modalMilestones.length > 0) {
        await supabase
          .from("spiritual_milestones")
          .insert(modalMilestones.map((m) => ({ user_id: adminModal.user_id, milestone: m })));
      }

      setSaveMsg("✅ Sauvegardé");
      // Mettre à jour l'affichage local
      adminModal.cell_group = modalCellGroup || null;
      setTimeout(() => setAdminModal(null), 1200);
    } catch {
      setSaveMsg("❌ Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "rgba(10,10,10,0.96)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #1a1a1a", padding: "16px",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 10, padding: "8px 14px", color: "#d4af37",
            fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0
          }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#d4af37" }}>Communauté CCB</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {members.length} membre{members.length > 1 ? "s" : ""}
              {isAdmin && <span style={{ marginLeft: 8, color: "#a855f7", fontWeight: 600 }}>· Admin</span>}
            </div>
          </div>
          <a href="/profile" style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 10, padding: "8px 14px", color: "#888",
            fontSize: 13, cursor: "pointer", textDecoration: "none"
          }}>Mon profil</a>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* Bannière admin */}
        {isAdmin && (
          <div style={{
            background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 10
          }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7" }}>Mode Administrateur</div>
              <div style={{ fontSize: 12, color: "#888" }}>Cliquez sur un membre pour gérer son groupe et ses jalons</div>
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div style={{ marginBottom: 14 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un membre..."
            style={{
              width: "100%", background: "#111", border: "1px solid #222",
              borderRadius: 12, padding: "12px 16px", color: "#e8e0d0",
              fontSize: 14, boxSizing: "border-box"
            }}
          />
        </div>

        {/* Filtre groupes */}
        {cellGroups.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => setFilterCell("")}
              style={{
                background: !filterCell ? "#d4af37" : "#1a1a1a",
                border: `1px solid ${!filterCell ? "#d4af37" : "#333"}`,
                borderRadius: 20, padding: "6px 14px",
                color: !filterCell ? "#000" : "#888",
                fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >Tous</button>
            {cellGroups.map((g) => (
              <button
                key={g!}
                onClick={() => setFilterCell(g === filterCell ? "" : g!)}
                style={{
                  background: filterCell === g ? "rgba(212,175,55,0.2)" : "#1a1a1a",
                  border: `1px solid ${filterCell === g ? "#d4af37" : "#333"}`,
                  borderRadius: 20, padding: "6px 14px",
                  color: filterCell === g ? "#d4af37" : "#888",
                  fontSize: 12, cursor: "pointer"
                }}
              >{g}</button>
            ))}
          </div>
        )}

        {/* État vide */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <div style={{ color: "#888", fontSize: 15 }}>
              {members.length === 0
                ? "Aucun profil public pour l'instant. Crée le tien !"
                : "Aucun membre ne correspond à cette recherche."}
            </div>
            {members.length === 0 && (
              <a href="/profile" style={{
                display: "inline-block", marginTop: 20,
                background: "linear-gradient(135deg, #d4af37, #c9a227)",
                color: "#000", fontWeight: 700, borderRadius: 12,
                padding: "12px 24px", textDecoration: "none", fontSize: 14
              }}>Créer mon profil</a>
            )}
          </div>
        )}

        {/* Grille de membres */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((member) => {
            const isMe = member.user_id === currentUserId;
            const initials = (member.display_name || "?")
              .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const memberMilestoneList = memberMilestones[member.user_id] || [];
            return (
              <div
                key={member.user_id}
                onClick={() => {
                  if (isAdmin && !isMe) openAdminModal(member);
                  else if (isMe) router.push("/profile");
                }}
                style={{
                  background: "#111",
                  border: `1px solid ${isMe ? "#d4af37" : isAdmin ? "rgba(168,85,247,0.2)" : "#1a1a1a"}`,
                  borderRadius: 16, padding: 16,
                  cursor: (isMe || isAdmin) ? "pointer" : "default",
                  position: "relative",
                  transition: "border-color 0.2s"
                }}
              >
                {isMe && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: "#d4af37", color: "#000",
                    borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700
                  }}>MOI</div>
                )}
                {isAdmin && !isMe && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: "rgba(168,85,247,0.2)", color: "#a855f7",
                    borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700
                  }}>✏️ Gérer</div>
                )}
                {/* Avatar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" style={{
                      width: 64, height: 64, borderRadius: "50%",
                      objectFit: "cover", border: "2px solid #333"
                    }} />
                  ) : (
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "linear-gradient(135deg, #d4af37, #c9a227)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 700, color: "#000"
                    }}>{initials}</div>
                  )}
                </div>
                {/* Nom */}
                <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "#f0e8d0", marginBottom: 4 }}>
                  {member.display_name || "Membre"}
                </div>
                {/* Cellule */}
                {member.cell_group && (
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <span style={{
                      background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)",
                      borderRadius: 20, padding: "2px 10px", fontSize: 10, color: "#d4af37"
                    }}>👥 {member.cell_group}</span>
                  </div>
                )}
                {/* Bio courte */}
                {member.bio && (
                  <p style={{
                    fontSize: 12, color: "#777", textAlign: "center",
                    lineHeight: 1.5, margin: 0,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                  } as any}>{member.bio}</p>
                )}
                {/* Jalons (icônes) */}
                {memberMilestoneList.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {memberMilestoneList.map((mkey) => {
                      const def = MILESTONES.find((ml) => ml.key === mkey);
                      return def ? (
                        <span key={mkey} title={def.label} style={{ fontSize: 14 }}>{def.icon}</span>
                      ) : null;
                    })}
                  </div>
                )}
                {/* Témoignage badge */}
                {member.testimony && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: "#555" }}>✨ A un témoignage</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Admin */}
      {adminModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdminModal(null); }}
        >
          <div style={{
            background: "#111", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 40px", width: "100%", maxWidth: 520,
            border: "1px solid rgba(168,85,247,0.3)", borderBottom: "none",
            maxHeight: "85vh", overflowY: "auto"
          }}>
            {/* Titre modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#a855f7" }}>🛡️ Gestion membre</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  {adminModal.display_name || "Membre"}
                </div>
              </div>
              <button
                onClick={() => setAdminModal(null)}
                style={{
                  background: "#1a1a1a", border: "1px solid #333",
                  borderRadius: 10, padding: "6px 12px", color: "#888",
                  fontSize: 16, cursor: "pointer"
                }}
              >✕</button>
            </div>

            {/* Groupe de cellule */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a855f7", marginBottom: 8, letterSpacing: 0.5 }}>
                GROUPE DE CELLULE
              </div>
              <input
                value={modalCellGroup}
                onChange={(e) => setModalCellGroup(e.target.value)}
                placeholder="Ex : Cellule Alpha, Cellule Jeunes..."
                style={{
                  width: "100%", background: "#0a0a0a",
                  border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#e8e0d0", fontSize: 14, boxSizing: "border-box"
                }}
              />
            </div>

            {/* Jalons spirituels */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a855f7", marginBottom: 12, letterSpacing: 0.5 }}>
                JALONS SPIRITUELS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MILESTONES.map((m) => {
                  const active = modalMilestones.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleModalMilestone(m.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: active ? "rgba(168,85,247,0.12)" : "#0a0a0a",
                        border: `1px solid ${active ? "rgba(168,85,247,0.5)" : "#222"}`,
                        borderRadius: 10, padding: "10px 14px",
                        color: active ? "#c084fc" : "#777",
                        fontSize: 13, cursor: "pointer", textAlign: "left",
                        width: "100%", transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                      <span style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{m.label}</span>
                      {active && <span style={{ fontSize: 16, color: "#a855f7" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message de sauvegarde */}
            {saveMsg && (
              <div style={{
                textAlign: "center", fontSize: 13,
                color: saveMsg.startsWith("✅") ? "#4ade80" : "#f87171",
                marginBottom: 12
              }}>{saveMsg}</div>
            )}

            {/* Bouton sauvegarder */}
            <button
              onClick={saveAdminChanges}
              disabled={saving}
              style={{
                width: "100%", padding: "14px",
                background: saving ? "#333" : "linear-gradient(135deg, #a855f7, #7c3aed)",
                border: "none", borderRadius: 12,
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
