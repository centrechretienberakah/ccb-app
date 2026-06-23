"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  GROUPS_THEME as T, GROUPS_FONTS as F,
  GROUP_CATEGORIES, getGroupCategoryDef,
  canCreateGroup, formatChatTime,
  notifyGroupsStaff,
} from "@/lib/groups/theme";
import { notifyJoinRequest, notifyNewMember } from "@/lib/groups/notify";

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

type Filter = "all" | "mine" | "public" | "private";

export default function GroupsListClient({ initialGroups, currentUserId, userRole }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupLite[]>(initialGroups);
  const [filter, setFilter] = useState<Filter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<Map<string, "pending" | "rejected">>(new Map());
  const canCreate = canCreateGroup(userRole);

  // Charge les demandes pendantes du user pour les afficher comme "⏳ En attente"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      try {
        const { data } = await supabase
          .from("group_join_requests")
          .select("group_id, status")
          .eq("user_id", currentUserId)
          .in("status", ["pending", "rejected"]);
        if (cancelled || !data) return;
        const m = new Map<string, "pending" | "rejected">();
        for (const r of data as Array<{ group_id: string; status: "pending" | "rejected" }>) {
          m.set(r.group_id, r.status);
        }
        setJoinRequests(m);
      } catch { /* table v42 pas migrée */ }
    })();
    return () => { cancelled = true; };
  }, [currentUserId]);

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
    else if (filter === "public")  out = out.filter((g) => g.type === "public");
    else if (filter === "private") out = out.filter((g) => g.type === "private");
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
  }, [groups, filter]);

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
    const grp = groups.find((g) => g.id === groupId);
    setGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, is_member: true, my_role: "member", member_count: g.member_count + 1 }
        : g,
    ));
    flash("✅ Tu as rejoint le groupe !");

    // Notif aux admins du groupe
    if (grp) {
      const { data: { user } } = await supabase.auth.getUser();
      let displayName = user?.email?.split("@")[0] ?? "Un membre";
      try {
        const { data: prof } = await supabase
          .from("user_profiles").select("display_name").eq("user_id", currentUserId).maybeSingle();
        const p = prof as { display_name: string | null } | null;
        if (p?.display_name) displayName = p.display_name;
      } catch { /* noop */ }
      void notifyNewMember({
        groupId, groupName: grp.name, newMemberName: displayName,
      });
    }
  }

  async function requestJoin(groupId: string) {
    const supabase = createClient();
    const grp = groups.find((g) => g.id === groupId);
    const msg = prompt(
      `Demande à rejoindre « ${grp?.name ?? "ce groupe"} »\n\nAjoute un mot pour les admins (optionnel) :`,
      ""
    );
    if (msg === null) return; // cancelled

    const { error } = await supabase.rpc("groups_request_join", {
      p_group_id: groupId,
      p_message: msg.trim() || null,
    });
    if (error) { flash("Erreur : " + error.message); return; }

    setJoinRequests((prev) => {
      const next = new Map(prev);
      next.set(groupId, "pending");
      return next;
    });
    flash("📨 Demande envoyée — un admin va l'examiner.");

    // Notif aux admins
    if (grp) {
      const { data: { user } } = await supabase.auth.getUser();
      let applicantName = user?.email?.split("@")[0] ?? "Un membre";
      try {
        const { data: prof } = await supabase
          .from("user_profiles").select("display_name").eq("user_id", currentUserId).maybeSingle();
        const p = prof as { display_name: string | null } | null;
        if (p?.display_name) applicantName = p.display_name;
      } catch { /* noop */ }
      void notifyJoinRequest({
        groupId, groupName: grp.name, applicantName,
      });
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      <style>{`
        .ccb-grp-row { transition: background 120ms ease; }
        .ccb-grp-row:hover { background: ${T.surface2}; }
        .ccb-grp-row:active { background: ${T.violetSoft}; }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 48px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }} />
          {canCreate && (
            <>
              <Link href="/community/groups/admin" style={{
                padding: "6px 12px", background: T.violetSoft, color: T.gold,
                border: `1px solid ${T.violet}`,
                borderRadius: 999, fontSize: 11, fontWeight: 700,
                textDecoration: "none", whiteSpace: "nowrap",
              }}>⚙️ Dashboard admin</Link>
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>
                ➕ Créer un groupe
              </button>
            </>
          )}
        </div>

        {/* Filters — 4 chips alignés sur 1 ligne (équi-répartis) */}
        <style>{`
          .ccb-grp-filters {
            display: flex; gap: 6px; margin-bottom: 12px;
            flex-wrap: nowrap; overflow-x: auto;
            scrollbar-width: none;
          }
          .ccb-grp-filters::-webkit-scrollbar { display: none; }
          .ccb-grp-filters > button {
            flex: 1 1 0;
            min-width: 0;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          /* Sur mobile étroit, on raccourcit "Mes groupes" en "Mes" */
          .ccb-grp-filter-short { display: none; }
          @media (max-width: 480px) {
            .ccb-grp-filter-long  { display: none; }
            .ccb-grp-filter-short { display: inline; }
          }
        `}</style>
        <div className="ccb-grp-filters">
          <button onClick={() => setFilter("all")}     style={chip(filter === "all")}>📚 Tous</button>
          <button onClick={() => setFilter("public")}  style={chip(filter === "public")}>🌍 Publics</button>
          <button onClick={() => setFilter("private")} style={chip(filter === "private")}>🔒 Privés</button>
          <button onClick={() => setFilter("mine")}    style={chip(filter === "mine")}>
            💬{" "}
            <span className="ccb-grp-filter-long">Mes groupes</span>
            <span className="ccb-grp-filter-short">Mes</span>
          </button>
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
                onRequestJoin={requestJoin}
                requestStatus={joinRequests.get(g.id) ?? null}
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
              color: T.gold, marginBottom: 16,
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
              fontSize: 11.5, color: T.gold, lineHeight: 1.5, marginBottom: 10,
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
function GroupRow({ group: g, onJoin, onRequestJoin, requestStatus, isLast }: {
  group: GroupLite;
  onJoin: (id: string) => void;
  onRequestJoin: (id: string) => void;
  requestStatus: "pending" | "rejected" | null;
  isLast: boolean;
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
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206",
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
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", border: "none",
            borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            cursor: "pointer", fontFamily: F.body,
          }}>
            ＋ Rejoindre
          </button>
        ) : requestStatus === "pending" ? (
          <span style={{
            flex: "0 0 auto", padding: "5px 10px",
            background: "rgba(212,175,55,0.15)", color: T.goldDark,
            border: `1px solid ${T.gold}`,
            borderRadius: 999, fontSize: 11, fontWeight: 700,
          }}>⏳ En attente</span>
        ) : (
          <button onClick={() => onRequestJoin(g.id)} style={{
            flex: "0 0 auto", padding: "6px 12px",
            background: T.gold, color: "#000", border: "none",
            borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            cursor: "pointer", fontFamily: F.body,
          }}>
            📨 Demander
          </button>
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
        {isMine ? "Rejoins-en un (onglet 🌍 Publics) ou crée le tien." : ""}
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
function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 8px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
    whiteSpace: "nowrap", textAlign: "center",
  };
}
