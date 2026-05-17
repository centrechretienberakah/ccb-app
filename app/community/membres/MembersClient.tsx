"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { RANKS, getRank, computeBadges, type MemberStats } from "@/lib/community/gamification";

interface MemberLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  milestones: string[];
  stats: MemberStats;
  xp: number;
}

interface Props {
  members: MemberLite[];
  currentUserId: string;
  isAdmin: boolean;
}

const MILESTONE_DEFS = [
  { key: "baptism_water",    label: "Baptême d'eau",           icon: "💧" },
  { key: "baptism_spirit",   label: "Baptême du Saint-Esprit", icon: "🔥" },
  { key: "cell_member",      label: "Membre de cellule",       icon: "👥" },
  { key: "school_of_faith",  label: "École de la foi",         icon: "📖" },
  { key: "leadership_track", label: "Parcours leadership",     icon: "⭐" },
  { key: "missions",         label: "Missions",                icon: "🌍" },
];

export default function MembersClient({ members: initialMembers, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberLite[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("");
  const [cellFilter, setCellFilter] = useState<string>("");

  // Modal admin
  const [adminModal, setAdminModal] = useState<MemberLite | null>(null);
  const [modalCellGroup, setModalCellGroup] = useState("");
  const [modalMilestones, setModalMilestones] = useState<string[]>([]);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const cellGroups = useMemo(
    () => [...new Set(members.map((m) => m.cell_group).filter(Boolean) as string[])].sort(),
    [members],
  );

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (m.display_name || "").toLowerCase();
        const cell = (m.cell_group || "").toLowerCase();
        if (!name.includes(q) && !cell.includes(q)) return false;
      }
      if (rankFilter) {
        const r = getRank(m.xp);
        if (r.id !== rankFilter) return false;
      }
      if (cellFilter && m.cell_group !== cellFilter) return false;
      return true;
    });
  }, [members, search, rankFilter, cellFilter]);

  function openAdminModal(member: MemberLite) {
    setAdminModal(member);
    setModalCellGroup(member.cell_group || "");
    setModalMilestones(member.milestones || []);
    setSaveMsg("");
  }

  function toggleModalMilestone(key: string) {
    setModalMilestones((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function saveAdminChanges() {
    if (!adminModal) return;
    setSavingAdmin(true); setSaveMsg("");
    try {
      const supabase = createClient();
      await supabase.from("user_profiles")
        .update({ cell_group: modalCellGroup || null })
        .eq("user_id", adminModal.user_id);
      await supabase.from("spiritual_milestones").delete().eq("user_id", adminModal.user_id);
      if (modalMilestones.length > 0) {
        await supabase.from("spiritual_milestones")
          .insert(modalMilestones.map((m) => ({ user_id: adminModal.user_id, milestone: m })));
      }
      // MAJ local
      setMembers((prev) => prev.map((m) =>
        m.user_id === adminModal.user_id
          ? { ...m, cell_group: modalCellGroup || null, milestones: [...modalMilestones] }
          : m,
      ));
      setSaveMsg("✅ Sauvegardé");
      setTimeout(() => setAdminModal(null), 900);
    } catch {
      setSaveMsg("❌ Erreur lors de la sauvegarde");
    } finally {
      setSavingAdmin(false);
    }
  }

  function handleCardClick(m: MemberLite) {
    const isMe = m.user_id === currentUserId;
    if (isMe) router.push("/profile");
    else router.push(`/community/profil/${m.user_id}`);
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/community" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Communauté</Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>👥</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Membres de la communauté
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            {members.length} disciples — classement par engagement spirituel
          </p>
          {isAdmin && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 10, padding: "5px 12px",
              background: T.violetSoft, color: T.violet,
              border: `1px solid ${T.violet}`,
              borderRadius: 999, fontSize: 11, fontWeight: 700,
            }}>
              🛡️ Mode admin — ✏️ sur une carte pour éditer cellule/jalons
            </div>
          )}
        </div>

        {/* Recherche + filtres */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un membre…"
            style={{
              width: "100%", padding: "12px 14px",
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 14,
              fontFamily: F.body, outline: "none", boxSizing: "border-box",
            }}
          />
          {/* Filtre rang */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setRankFilter("")} style={chipStyle(rankFilter === "")}>
              📚 Tous rangs
            </button>
            {RANKS.map((r) => (
              <button key={r.id} onClick={() => setRankFilter(rankFilter === r.id ? "" : r.id)}
                style={chipStyle(rankFilter === r.id, r.color)}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          {/* Filtre cellules */}
          {cellGroups.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setCellFilter("")} style={chipStyle(cellFilter === "", T.gold)}>
                👥 Toutes cellules
              </button>
              {cellGroups.map((g) => (
                <button key={g} onClick={() => setCellFilter(cellFilter === g ? "" : g)}
                  style={chipStyle(cellFilter === g, T.gold)}>
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🔎</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              {members.length === 0 ? "Aucun profil public. Créez le vôtre !" : "Aucun membre ne correspond."}
            </div>
            {members.length === 0 && (
              <a href="/profile" style={{
                display: "inline-block", marginTop: 16,
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                color: "#1F1A33", fontWeight: 700,
                borderRadius: 10, padding: "10px 22px",
                textDecoration: "none", fontSize: 13,
              }}>Créer mon profil</a>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((m, i) => {
              const rank = getRank(m.xp);
              const isMe = m.user_id === currentUserId;
              const badges = computeBadges(m.stats).filter((b) => b.achieved);
              const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={m.user_id}
                  onClick={() => handleCardClick(m)}
                  style={{
                    background: T.card,
                    border: `1px solid ${isMe ? T.violet : T.border}`,
                    borderRadius: 14, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                    position: "relative", cursor: "pointer",
                  }}>
                  {/* Position */}
                  <div style={{
                    width: 26, textAlign: "center", fontFamily: F.title,
                    fontWeight: 700, fontSize: 14,
                    color: i < 3 ? T.gold : T.textMuted,
                  }}>
                    {i + 1}
                  </div>

                  {/* Avatar */}
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt={m.display_name || ""}
                      style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 17, fontWeight: 700, color: "#fff",
                    }}>{initials}</div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700, color: T.text }}>
                        {m.display_name || "Membre"}
                      </span>
                      {isMe && (
                        <span style={{
                          background: T.violet, color: "#fff",
                          fontSize: 9, fontWeight: 700, padding: "1px 6px",
                          borderRadius: 999,
                        }}>VOUS</span>
                      )}
                      {m.cell_group && (
                        <span style={{
                          background: T.violetSoft, color: T.violet,
                          fontSize: 9, fontWeight: 700, padding: "1px 8px",
                          borderRadius: 999, border: `1px solid ${T.violet}33`,
                        }}>👥 {m.cell_group}</span>
                      )}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6, marginTop: 3,
                      fontSize: 11, color: rank.color, fontWeight: 700,
                    }}>
                      <span>{rank.emoji}</span>
                      <span>{rank.label}</span>
                      <span style={{ color: T.textMuted, fontWeight: 500 }}>· {m.xp} XP</span>
                    </div>
                    {(badges.length > 0 || m.milestones.length > 0) && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
                        {badges.slice(0, 6).map((b) => (
                          <span key={b.id} title={b.label} style={{ fontSize: 13 }}>{b.emoji}</span>
                        ))}
                        {m.milestones.length > 0 && badges.length > 0 && (
                          <span style={{ color: T.textMuted, fontSize: 10, margin: "0 4px" }}>·</span>
                        )}
                        {m.milestones.map((mk) => {
                          const def = MILESTONE_DEFS.find((d) => d.key === mk);
                          return def ? (
                            <span key={mk} title={def.label} style={{ fontSize: 13 }}>{def.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action edit admin */}
                  {isAdmin && !isMe && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdminModal(m); }}
                      title="Éditer cellule + jalons"
                      style={{
                        background: T.violetSoft, border: `1px solid ${T.violet}66`,
                        borderRadius: 8, padding: "6px 9px",
                        color: T.violet, fontSize: 13, cursor: "pointer", flexShrink: 0,
                      }}>
                      ✏️
                    </button>
                  )}

                  <div style={{ color: T.violet, fontSize: 16, flexShrink: 0 }}>→</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Admin */}
      {adminModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdminModal(null); }}
        >
          <div style={{
            background: T.card, borderTop: `3px solid ${T.violet}`,
            borderRadius: "20px 20px 0 0", padding: "20px 18px 32px",
            width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 18,
            }}>
              <div>
                <div style={{ fontFamily: F.title, fontSize: 15, fontWeight: 700, color: T.violet }}>
                  🛡️ Édition membre
                </div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {adminModal.display_name || "Membre"}
                </div>
              </div>
              <button onClick={() => setAdminModal(null)} style={{
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "5px 11px",
                color: T.textMuted, fontSize: 14, cursor: "pointer",
              }}>✕</button>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.violet,
                marginBottom: 6, letterSpacing: 0.5,
              }}>
                GROUPE DE CELLULE
              </div>
              <input
                value={modalCellGroup}
                onChange={(e) => setModalCellGroup(e.target.value)}
                placeholder="Ex : Cellule Alpha…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 14px",
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 10, color: T.text, fontSize: 13,
                  fontFamily: F.body, outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: T.violet,
                marginBottom: 8, letterSpacing: 0.5,
              }}>
                JALONS SPIRITUELS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {MILESTONE_DEFS.map((m) => {
                  const active = modalMilestones.includes(m.key);
                  return (
                    <button key={m.key} onClick={() => toggleModalMilestone(m.key)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px",
                      background: active ? T.violetSoft : T.bg,
                      border: `1px solid ${active ? T.violet : T.borderSoft}`,
                      borderRadius: 10,
                      color: active ? T.violet : T.textSoft,
                      fontSize: 13, cursor: "pointer",
                      textAlign: "left", width: "100%", fontFamily: F.body,
                    }}>
                      <span style={{ fontSize: 17 }}>{m.icon}</span>
                      <span style={{ flex: 1, fontWeight: active ? 700 : 500 }}>{m.label}</span>
                      {active && <span style={{ color: T.violet }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {saveMsg && (
              <div style={{
                textAlign: "center", fontSize: 13,
                color: saveMsg.startsWith("✅") ? "#2E9B47" : "#C24B7A",
                marginBottom: 12,
              }}>{saveMsg}</div>
            )}

            <button onClick={saveAdminChanges} disabled={savingAdmin} style={{
              width: "100%", padding: 13,
              background: savingAdmin ? T.surface2 : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: savingAdmin ? "wait" : "pointer", fontFamily: F.body,
            }}>
              {savingAdmin ? "Sauvegarde…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean, color?: string): React.CSSProperties {
  const c = color ?? T.violet;
  return {
    padding: "6px 12px",
    background: active ? `${c}1f` : T.card,
    border: `1px solid ${active ? c : T.border}`,
    color: active ? c : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
  };
}
