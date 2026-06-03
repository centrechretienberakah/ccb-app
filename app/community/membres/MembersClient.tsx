"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { getRank, type MemberStats } from "@/lib/community/gamification";
import { toggleFollow } from "@/lib/social/follows";
import { useOnlineUsers } from "@/lib/presence";

interface MemberLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  milestones: string[];
  stats: MemberStats;
  xp: number;
  role: string | null;
  followers: number;
  following: number;
  isFollowing: boolean;
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

const FILTERS = [
  { key: "all",       label: "Tous" },
  { key: "disciples", label: "Disciples" },
  { key: "leaders",   label: "Leaders" },
  { key: "admins",    label: "Admins" },
  { key: "premium",   label: "Premium" },
  { key: "new",       label: "Nouveaux" },
  { key: "active",    label: "Les plus actifs" },
  { key: "followed",  label: "Les plus suivis" },
] as const;

const isAdminRole = (r: string | null) => r === "owner" || r === "admin";
const isLeaderRole = (r: string | null) => r === "leader" || r === "moderator";
const isPremium = (r: string | null) => r === "premium_member";

function handleOf(name: string | null): string {
  const base = (name || "membre").trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return "@" + (base || "membre");
}
function isNew(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 30 * 24 * 60 * 60 * 1000;
}
function joinDateShort(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

export default function MembersClient({ members: initialMembers, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const online = useOnlineUsers();
  const [members, setMembers] = useState<MemberLite[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  // Admin modal
  const [adminModal, setAdminModal] = useState<MemberLite | null>(null);
  const [modalCellGroup, setModalCellGroup] = useState("");
  const [modalMilestones, setModalMilestones] = useState<string[]>([]);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const onlineCount = useMemo(
    () => members.filter((m) => online.has(m.user_id)).length, [members, online]);
  const adminsCount = useMemo(() => members.filter((m) => isAdminRole(m.role)).length, [members]);
  const leadersCount = useMemo(() => members.filter((m) => isLeaderRole(m.role)).length, [members]);
  const premiumCount = useMemo(() => members.filter((m) => isPremium(m.role)).length, [members]);

  const filtered = useMemo(() => {
    let list = members.filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (m.display_name || "").toLowerCase().includes(q)
        || handleOf(m.display_name).includes(q)
        || (m.country || "").toLowerCase().includes(q)
        || (m.cell_group || "").toLowerCase().includes(q);
    });
    switch (filter) {
      case "disciples": list = list.filter((m) => !isAdminRole(m.role) && !isLeaderRole(m.role)); break;
      case "leaders":   list = list.filter((m) => isLeaderRole(m.role)); break;
      case "admins":    list = list.filter((m) => isAdminRole(m.role)); break;
      case "premium":   list = list.filter((m) => isPremium(m.role)); break;
      case "new":       list = list.filter((m) => isNew(m.created_at)); break;
      case "active":    list = [...list].sort((a, b) => b.xp - a.xp); break;
      case "followed":  list = [...list].sort((a, b) => b.followers - a.followers); break;
    }
    return list;
  }, [members, search, filter]);

  function openAdminModal(member: MemberLite) {
    setAdminModal(member);
    setModalCellGroup(member.cell_group || "");
    setModalMilestones(member.milestones || []);
    setSaveMsg("");
  }
  function toggleModalMilestone(key: string) {
    setModalMilestones((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }
  async function saveAdminChanges() {
    if (!adminModal) return;
    setSavingAdmin(true); setSaveMsg("");
    try {
      const supabase = createClient();
      await supabase.from("user_profiles").update({ cell_group: modalCellGroup || null }).eq("user_id", adminModal.user_id);
      await supabase.from("spiritual_milestones").delete().eq("user_id", adminModal.user_id);
      if (modalMilestones.length > 0) {
        await supabase.from("spiritual_milestones").insert(modalMilestones.map((m) => ({ user_id: adminModal.user_id, milestone: m })));
      }
      setMembers((prev) => prev.map((m) => m.user_id === adminModal.user_id ? { ...m, cell_group: modalCellGroup || null, milestones: [...modalMilestones] } : m));
      setSaveMsg("✅ Sauvegardé");
      setTimeout(() => setAdminModal(null), 900);
    } catch {
      setSaveMsg("❌ Erreur lors de la sauvegarde");
    } finally {
      setSavingAdmin(false);
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 70 }}>
      <style>{`
        @keyframes ccb-mb-in { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform: translateY(0);} }
        .ccb-mb-card { animation: ccb-mb-in .4s ease both; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .ccb-mb-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(90,44,160,0.10); border-color: ${T.violet}55; }
        .ccb-mb-stats::-webkit-scrollbar, .ccb-mb-chips::-webkit-scrollbar { display:none; }
        .ccb-mb-grid { display:grid; grid-template-columns: 1fr; gap: 8px; }
        @media (min-width: 700px){ .ccb-mb-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }
        @media (min-width: 1100px){ .ccb-mb-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      {/* Header compact (non-sticky : la nav persistante est CommunityTabs au-dessus) */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Link href="/community" style={{
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "5px 10px", color: T.violet, fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>←</Link>
            <h1 style={{ fontFamily: F.title, fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>
              👥 Membres <span style={{ color: T.textMuted, fontWeight: 500, fontSize: 14 }}>· {members.length}</span>
            </h1>
            {isAdmin && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.violet, background: T.violetSoft, border: `1px solid ${T.violet}`, borderRadius: 999, padding: "3px 9px" }}>🛡️ Admin</span>
            )}
          </div>

          {/* Badges stats */}
          <div className="ccb-mb-stats" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 10 }}>
            <StatBadge icon="👥" label="Membres" value={members.length} />
            <StatBadge icon="👑" label="Admins" value={adminsCount} />
            <StatBadge icon="⭐" label="Leaders" value={leadersCount} />
            <StatBadge icon="🟢" label="En ligne" value={onlineCount} accent="#2E9B47" />
            <StatBadge icon="💎" label="Premium" value={premiumCount} accent={T.gold} />
          </div>

          {/* Recherche compacte */}
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un membre…"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 999, color: T.text, fontSize: 13.5, fontFamily: F.body, outline: "none" }} />

          {/* Filtres chips */}
          <div className="ccb-mb-chips" style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 9, paddingBottom: 2 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 999,
                  background: active ? T.violet : T.bg,
                  border: `1px solid ${active ? T.violet : T.border}`,
                  color: active ? "#fff" : T.textMuted,
                  fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
                }}>{f.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Liste */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 14px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 18px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, color: T.textMuted, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔎</div>
            {members.length === 0 ? "Aucun profil public." : "Aucun membre ne correspond."}
          </div>
        ) : (
          <div className="ccb-mb-grid">
            {filtered.map((m) => (
              <MemberCard key={m.user_id} m={m} isMe={m.user_id === currentUserId}
                isAdmin={isAdmin} isOnline={online.has(m.user_id)} router={router}
                onAdminEdit={() => openAdminModal(m)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal Admin (inchangé fonctionnellement) */}
      {adminModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdminModal(null); }}>
          <div style={{ background: T.card, borderTop: `3px solid ${T.violet}`, borderRadius: "20px 20px 0 0", padding: "20px 18px 32px", width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: F.title, fontSize: 15, fontWeight: 700, color: T.violet }}>🛡️ Édition membre</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{adminModal.display_name || "Membre"}</div>
              </div>
              <button onClick={() => setAdminModal(null)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 11px", color: T.textMuted, fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.violet, marginBottom: 6, letterSpacing: 0.5 }}>GROUPE DE CELLULE</div>
              <input value={modalCellGroup} onChange={(e) => setModalCellGroup(e.target.value)} placeholder="Ex : Cellule Alpha…"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, fontFamily: F.body, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.violet, marginBottom: 8, letterSpacing: 0.5 }}>JALONS SPIRITUELS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {MILESTONE_DEFS.map((mm) => {
                  const active = modalMilestones.includes(mm.key);
                  return (
                    <button key={mm.key} onClick={() => toggleModalMilestone(mm.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: active ? T.violetSoft : T.bg, border: `1px solid ${active ? T.violet : T.borderSoft}`, borderRadius: 10, color: active ? T.violet : T.textSoft, fontSize: 13, cursor: "pointer", textAlign: "left", width: "100%", fontFamily: F.body }}>
                      <span style={{ fontSize: 17 }}>{mm.icon}</span>
                      <span style={{ flex: 1, fontWeight: active ? 700 : 500 }}>{mm.label}</span>
                      {active && <span style={{ color: T.violet }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {saveMsg && <div style={{ textAlign: "center", fontSize: 13, color: saveMsg.startsWith("✅") ? "#2E9B47" : "#C24B7A", marginBottom: 12 }}>{saveMsg}</div>}
            <button onClick={saveAdminChanges} disabled={savingAdmin} style={{ width: "100%", padding: 13, background: savingAdmin ? T.surface2 : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: savingAdmin ? "wait" : "pointer", fontFamily: F.body }}>
              {savingAdmin ? "Sauvegarde…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Carte membre compacte ───────────────────────── */
function MemberCard({ m, isMe, isAdmin, isOnline, router, onAdminEdit }: {
  m: MemberLite; isMe: boolean; isAdmin: boolean; isOnline: boolean;
  router: ReturnType<typeof useRouter>; onAdminEdit: () => void;
}) {
  const rank = getRank(m.xp);
  const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [following, setFollowing] = useState(m.isFollowing);
  const [followers, setFollowers] = useState(m.followers);
  const [busy, setBusy] = useState(false);

  const presence = isOnline
    ? { dot: "🟢", label: "En ligne", color: "#2E9B47" }
    : (m.last_seen_at && Date.now() - new Date(m.last_seen_at).getTime() < 86400000
        ? { dot: "🟡", label: "Actif aujourd'hui", color: "#B8860B" }
        : { dot: "⚫", label: "Hors ligne", color: T.textMuted });

  async function onFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); setFollowers((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleFollow(m.user_id);
    if (res === null) { setFollowing(!next); setFollowers((c) => Math.max(0, c + (next ? -1 : 1))); }
    else setFollowing(res);
    setBusy(false);
  }

  async function openConv(e: React.MouseEvent, mode?: "audio" | "video") {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const sb = createClient();
      const { data, error } = await sb.rpc("get_or_create_dm", { p_other: m.user_id });
      if (!error && typeof data === "string") {
        router.push(mode ? `/community/messages/${data}/call${mode === "audio" ? "?mode=audio" : ""}` : `/community/messages/${data}`);
        return;
      }
    } catch { /* noop */ }
    setBusy(false);
  }

  function openProfile() {
    router.push(isMe ? "/profile" : `/community/profil/${m.user_id}`);
  }

  return (
    <div className="ccb-mb-card" onClick={openProfile} style={{
      background: T.card, border: `1px solid ${isMe ? T.violet : T.border}`,
      borderRadius: 14, padding: "11px 12px", cursor: "pointer", position: "relative",
    }}>
      <div style={{ display: "flex", gap: 11 }}>
        {/* Avatar + présence */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {m.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatar_url} alt={m.display_name || ""} style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>{initials}</div>
          )}
          {isOnline && <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "#2E9B47", border: `2.5px solid ${T.card}` }} />}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: F.title, fontSize: 14.5, fontWeight: 700, color: T.text }}>{m.display_name || "Membre"}</span>
            {isMe && <span style={{ background: T.violet, color: "#fff", fontSize: 8.5, fontWeight: 700, padding: "1px 6px", borderRadius: 999 }}>VOUS</span>}
            {isAdminRole(m.role) && <span style={{ fontSize: 11 }} title="Admin">👑</span>}
            {isPremium(m.role) && <span style={{ fontSize: 11 }} title="Premium">💎</span>}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{handleOf(m.display_name)}</div>

          {/* Rang + XP */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11, color: rank.color, fontWeight: 700 }}>
            <span>{rank.emoji}</span><span>{rank.label}</span>
            <span style={{ color: T.textMuted, fontWeight: 500 }}>· {m.xp} XP</span>
          </div>

          {/* Présence + pays + abonnés */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 9px", marginTop: 4, fontSize: 10.5, color: T.textMuted }}>
            <span style={{ color: presence.color, fontWeight: 600 }}>{presence.dot} {presence.label}</span>
            {m.country && <span>📍 {m.country}</span>}
            {m.created_at && <span>📅 {joinDateShort(m.created_at)}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 11, color: T.textSoft }}>
            <span><strong style={{ color: T.text }}>{followers}</strong> abonnés</span>
            <span><strong style={{ color: T.text }}>{m.following}</strong> abonnements</span>
          </div>

          {/* Bio 2 lignes */}
          {m.bio && (
            <div style={{ fontSize: 11.5, color: T.textSoft, marginTop: 5, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {m.bio}
            </div>
          )}
        </div>

        {isAdmin && !isMe && (
          <button onClick={(e) => { e.stopPropagation(); onAdminEdit(); }} title="Éditer" style={{ background: T.violetSoft, border: `1px solid ${T.violet}66`, borderRadius: 8, padding: "4px 8px", color: T.violet, fontSize: 12, cursor: "pointer", flexShrink: 0, alignSelf: "flex-start" }}>✏️</button>
        )}
      </div>

      {/* Actions */}
      {!isMe && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onFollow} disabled={busy} style={{
            flex: 1.4, padding: "8px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: F.body,
            background: following ? T.bg : T.gold, color: following ? T.text : T.black,
            border: following ? `1px solid ${T.border}` : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>{following ? "✓ Abonné" : "➕ Suivre"}</button>
          <button onClick={(e) => openConv(e)} disabled={busy} title="Message" style={actBtn}>💬</button>
          <button onClick={(e) => openConv(e, "audio")} disabled={busy} title="Appel audio" style={actBtn}>📞</button>
          <button onClick={(e) => openConv(e, "video")} disabled={busy} title="Appel vidéo" style={actBtn}>📹</button>
        </div>
      )}
    </div>
  );
}

function StatBadge({ icon, label, value, accent }: { icon: string; label: string; value: number; accent?: string }) {
  return (
    <div style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "7px 12px",
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 15, color: accent ?? T.violet }}>{value}</div>
        <div style={{ fontSize: 9.5, color: T.textMuted, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

const actBtn: React.CSSProperties = {
  flex: 1, padding: "8px 0", borderRadius: 999, fontSize: 15, cursor: "pointer",
  background: T.bg, border: `1px solid ${T.border}`, color: T.text,
  display: "flex", alignItems: "center", justifyContent: "center",
};
