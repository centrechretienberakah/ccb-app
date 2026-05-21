"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  GROUPS_THEME as T, GROUPS_FONTS as F,
  GROUP_CATEGORIES, getGroupCategoryDef,
  canCreateGroup, formatChatTime,
  notifyGroupsStaff,
} from "@/lib/groups/theme";

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
  last_message_content: string | null;
  last_message_attachment_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  muted_until: string | null;
}

interface Props {
  initialGroups: GroupLite[];
  currentUserId: string;
  userRole: string | null;
}

type Filter = "all" | "mine" | "public" | "discover";

export default function GroupsListClient({ initialGroups, currentUserId, userRole }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupLite[]>(initialGroups);
  const [filter, setFilter] = useState<Filter>("mine");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const canCreate = canCreateGroup(userRole);

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [category, setCategory] = useState<string>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const filtered = useMemo(() => {
    let out = groups;
    if (filter === "mine")     out = out.filter((g) => g.is_member);
    else if (filter === "public")   out = out.filter((g) => g.type === "public");
    else if (filter === "discover") out = out.filter((g) => !g.is_member && g.type === "public");
    if (search.trim()) {
      const q = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      out = out.filter((g) => {
        const t = `${g.name} ${g.description ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return t.includes(q);
      });
    }
    // Pour "mine" : tri par dernier message décroissant, puis non lus en haut
    if (filter === "mine") {
      return [...out].sort((a, b) => {
        if ((a.unread_count > 0) !== (b.unread_count > 0)) return a.unread_count > 0 ? -1 : 1;
        const tA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tB - tA;
      });
    }
    return out;
  }, [groups, filter, search]);

  async function createGroup() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    if (!canCreate) { setError("Permissions insuffisantes."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase.from("groups").insert({
      name: name.trim(),
      description: description.trim() || null,
      type, category,
      created_by: currentUserId,
    }).select("id, name, description, cover_url, type, category, created_by, created_at").single();
    if (e) {
      setSaving(false);
      // RLS-friendly error
      if (/policy|permission|denied|row.*level/i.test(e.message)) {
        setError("Permission refusée. Seuls les owner/admin/leader/moderator peuvent créer un groupe.");
      } else {
        setError(e.message);
      }
      return;
    }
    const newGroup = data as Omit<GroupLite, "member_count" | "is_member" | "my_role" | "unread_count" | "muted_until" | "last_message_content" | "last_message_attachment_type" | "last_message_at">;

    // Le trigger SQL groups_auto_owner_membership() crée la ligne owner.
    // On le fait quand même en best-effort si la migration n'est pas encore exécutée.
    try {
      await supabase.from("group_members").upsert({
        group_id: newGroup.id, user_id: currentUserId, role: "owner",
      }, { onConflict: "group_id,user_id" });
    } catch { /* trigger a déjà fait le boulot */ }

    setGroups((prev) => [{
      ...newGroup,
      member_count: 1,
      is_member: true,
      my_role: "owner",
      last_message_content: null,
      last_message_attachment_type: null,
      last_message_at: null,
      unread_count: 0,
      muted_until: null,
    }, ...prev]);

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
        .ccb-grp-row { transition: background 120ms ease; }
        .ccb-grp-row:hover { background: ${T.surface2}; }
        .ccb-grp-row:active { background: ${T.violetSoft}; }
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
            Cellules, ministères, intercession — collabore en équipe.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 48px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <Link href="/community" style={backLink}>← Communauté</Link>
          <div style={{ flex: 1 }} />
          {canCreate ? (
            <>
              <Link href="/community/groups/admin" style={{
                padding: "6px 12px", background: T.violetSoft, color: T.violet,
                border: `1px solid ${T.violet}`,
                borderRadius: 999, fontSize: 11, fontWeight: 700,
                textDecoration: "none", whiteSpace: "nowrap",
              }}>⚙️ Dashboard admin</Link>
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>
                ➕ Créer un groupe
              </button>
            </>
          ) : (
            <span
              title="Seuls les leader/admin/owner peuvent créer un groupe."
              style={{
                fontSize: 11, color: T.textMuted, fontStyle: "italic",
                padding: "6px 12px", background: T.card,
                border: `1px solid ${T.border}`, borderRadius: 999,
              }}>
              🔒 Création réservée aux leaders
            </span>
          )}
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
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", overflowX: "auto" }}>
          <button onClick={() => setFilter("mine")}     style={chip(filter === "mine")}>💬 Mes groupes</button>
          <button onClick={() => setFilter("all")}      style={chip(filter === "all")}>📚 Tous</button>
          <button onClick={() => setFilter("public")}   style={chip(filter === "public")}>🌍 Publics</button>
          <button onClick={() => setFilter("discover")} style={chip(filter === "discover")}>✨ Découvrir</button>
        </div>

        {/* Liste WhatsApp-style */}
        {filtered.length === 0 ? (
          <EmptyState
            isMine={filter === "mine"}
            canCreate={canCreate}
            onCreate={() => setShowCreate(true)}
            totalGroups={groups.length}
          />
        ) : (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: T.shadowSoft,
          }}>
            {filtered.map((g, i) => (
              <GroupRow
                key={g.id} group={g}
                onJoin={joinGroup}
                isLast={i === filtered.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal créer */}
      {showCreate && canCreate && (
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
              <label style={lbl}>NOM *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex. Intercesseurs CCB, Équipe Louange…"
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

            <div style={{
              padding: "10px 12px", background: T.violetSoft,
              border: `1px solid ${T.violet}`, borderRadius: 10,
              fontSize: 11.5, color: T.violetDark, lineHeight: 1.5, marginBottom: 10,
            }}>
              💡 Le groupe inclura automatiquement <strong>CCB MEET</strong>
              (visio + audio + partage d&apos;écran) accessible via le bouton
              🎥 dans chaque conversation.
            </div>

            {error && <div style={{ color: "#C24B7A", fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setShowCreate(false)} style={btnGhost}>Annuler</button>
              <button onClick={createGroup} disabled={saving || !name.trim()} style={{
                ...btnPrimary,
                opacity: !name.trim() ? 0.5 : 1,
                cursor: saving || !name.trim() ? "not-allowed" : "pointer",
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

// ─── Group row (WhatsApp-style) ────────────────────────────────────
function GroupRow({ group: g, onJoin, isLast }: {
  group: GroupLite; onJoin: (id: string) => void; isLast: boolean;
}) {
  const catDef = getGroupCategoryDef(g.category);
  const isMuted = !!(g.muted_until && new Date(g.muted_until).getTime() > Date.now());
  const hasUnread = g.unread_count > 0;

  // Aperçu du dernier message
  let preview = g.last_message_content?.trim() || "";
  if (!preview && g.last_message_attachment_type) {
    switch (g.last_message_attachment_type) {
      case "image": preview = "📷 Photo"; break;
      case "pdf":   preview = "📄 PDF"; break;
      case "video": preview = "🎬 Vidéo"; break;
      case "audio": preview = "🎵 Audio"; break;
      default:      preview = "📎 Pièce jointe";
    }
  }
  if (!preview) preview = g.description?.trim() || `${catDef.emoji} ${catDef.label}`;

  return (
    <div className="ccb-grp-row" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? "none" : `1px solid ${T.borderSoft}`,
    }}>
      {/* Avatar */}
      <Link href={`/community/groups/${g.id}`} style={{
        flex: "0 0 48px", width: 48, height: 48, borderRadius: 999,
        background: g.cover_url
          ? `url(${g.cover_url}) center/cover`
          : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: F.title, fontSize: 18, fontWeight: 800,
        textDecoration: "none", textTransform: "uppercase",
        boxShadow: hasUnread ? `0 0 0 2px ${T.gold}` : "none",
      }}>
        {!g.cover_url && (g.name?.[0] ?? "?")}
      </Link>

      {/* Texte */}
      <Link href={`/community/groups/${g.id}`} style={{
        flex: 1, minWidth: 0, textDecoration: "none", color: "inherit",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div style={{
            fontSize: 14.5, fontWeight: hasUnread ? 800 : 600, color: T.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            minWidth: 0,
          }}>
            {g.name}
            {g.type === "private" && (
              <span style={{ marginLeft: 6, color: T.textMuted, fontSize: 11 }}>🔒</span>
            )}
            {isMuted && (
              <span style={{ marginLeft: 4, color: T.textMuted, fontSize: 11 }}>🔕</span>
            )}
          </div>
          <span style={{
            fontSize: 11, color: hasUnread ? T.violet : T.textMuted,
            fontWeight: hasUnread ? 700 : 500, whiteSpace: "nowrap",
          }}>
            {formatChatTime(g.last_message_at)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 12.5, color: hasUnread ? T.text : T.textMuted,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontWeight: hasUnread ? 600 : 400,
          }}>
            {preview}
          </span>
          {hasUnread && !isMuted && (
            <span style={{
              flex: "0 0 auto",
              minWidth: 20, height: 20, padding: "0 6px",
              borderRadius: 999,
              background: T.violet, color: "#fff",
              fontSize: 11, fontWeight: 800,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              {g.unread_count > 99 ? "99+" : g.unread_count}
            </span>
          )}
          {hasUnread && isMuted && (
            <span style={{
              flex: "0 0 auto",
              fontSize: 11, color: T.textMuted, fontWeight: 700,
            }}>
              {g.unread_count > 99 ? "99+" : g.unread_count}
            </span>
          )}
        </div>
      </Link>

      {/* CTA contextuel */}
      {!g.is_member ? (
        g.type === "public" ? (
          <button onClick={() => onJoin(g.id)} style={{
            flex: "0 0 auto", padding: "6px 12px",
            background: T.violet, color: "#fff", border: "none",
            borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            cursor: "pointer", fontFamily: F.body,
          }}>
            ＋ Rejoindre
          </button>
        ) : (
          <span style={{
            flex: "0 0 auto", padding: "5px 10px",
            background: T.surface2, color: T.textMuted,
            borderRadius: 999, fontSize: 11, fontStyle: "italic",
          }}>🔒 Privé</span>
        )
      ) : null}
    </div>
  );
}

function EmptyState({ isMine, canCreate, onCreate, totalGroups }: {
  isMine: boolean; canCreate: boolean; onCreate: () => void; totalGroups: number;
}) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "60px 20px", textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>{isMine ? "💬" : "🧑‍🤝‍🧑"}</div>
      <div style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>
        {isMine
          ? "Tu n'es membre d'aucun groupe pour l'instant"
          : (totalGroups === 0 ? "Aucun groupe pour l'instant" : "Aucun groupe ne correspond")}
      </div>
      <div style={{ color: T.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        {isMine ? "Rejoins-en un (onglet ✨ Découvrir) ou crée le tien." : ""}
      </div>
      {canCreate && (
        <button onClick={onCreate} style={btnPrimary}>➕ Créer un groupe</button>
      )}
    </div>
  );
}

// ─── styles partagés ─────────────────────────────────────────────────
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
const backLink: React.CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "6px 12px",
  color: T.violet, fontSize: 12, fontWeight: 700,
  textDecoration: "none", fontFamily: F.body,
};
function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
    whiteSpace: "nowrap",
  };
}
