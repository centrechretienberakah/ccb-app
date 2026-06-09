"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F, getPostKindDef } from "@/lib/community/theme";
import { getRank, progressToNextRank, computeBadges, type MemberStats } from "@/lib/community/gamification";
import { getFollowStats, toggleFollow } from "@/lib/social/follows";
import { useOnlineUsers } from "@/lib/presence";
import AdminMemberPanel from "./AdminMemberPanel";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  last_seen_at: string | null;
}
interface RecentPost { id: string; content: string; post_kind: string | null; created_at: string; }
interface Props {
  profile: Profile;
  stats: MemberStats;
  xp: number;
  milestones: string[];
  recentPosts: RecentPost[];
  isMe: boolean;
  role: string | null;
  viewerIsAdmin?: boolean;
}

const MILESTONE_DEF: Record<string, { label: string; icon: string }> = {
  baptism_water: { label: "Baptême d'eau", icon: "💧" },
  baptism_spirit: { label: "Baptême du Saint-Esprit", icon: "🔥" },
  cell_member: { label: "Membre de cellule", icon: "👥" },
  school_of_faith: { label: "École de la foi", icon: "📖" },
  leadership_track: { label: "Parcours leadership", icon: "⭐" },
  missions: { label: "Missions", icon: "🌍" },
};

const ROLE_BADGE: Record<string, { label: string; emoji: string }> = {
  owner: { label: "Fondateur", emoji: "👑" },
  admin: { label: "Admin", emoji: "🛡️" },
  leader: { label: "Leader", emoji: "⭐" },
  moderator: { label: "Modérateur", emoji: "🛡️" },
  premium_member: { label: "Premium", emoji: "💎" },
};

function handleOf(name: string | null): string {
  const base = (name || "membre").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
  return "@" + (base || "membre");
}
function joinDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

type TabKey = "publications" | "prieres" | "groupes" | "activite" | "realisations" | "admin";
const BASE_TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "publications", label: "Publications", emoji: "📝" },
  { key: "prieres",      label: "Prières",      emoji: "🙏" },
  { key: "groupes",      label: "Groupes",      emoji: "👥" },
  { key: "activite",     label: "Activité",     emoji: "📚" },
  { key: "realisations", label: "Réalisations", emoji: "🏆" },
];
const ADMIN_TAB = { key: "admin" as TabKey, label: "Administration", emoji: "👑" };

export default function ProfileClient({ profile, stats, xp, milestones, recentPosts, isMe, role, viewerIsAdmin = false }: Props) {
  const router = useRouter();
  const online = useOnlineUsers();
  const rank = getRank(xp);
  const tabs = viewerIsAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const progress = progressToNextRank(xp);
  const badges = computeBadges(stats);
  const initials = (profile.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const isOnline = online.has(profile.user_id);
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const roleBadge = role ? ROLE_BADGE[role] : null;
  const premium = role === "premium_member";

  const [tab, setTab] = useState<TabKey>("publications");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFollowStats(profile.user_id).then((s) => {
      if (cancelled) return;
      setFollowers(s.followers); setFollowing(s.following); setIsFollowing(s.isFollowing);
    });
    return () => { cancelled = true; };
  }, [profile.user_id]);

  async function onFollow() {
    if (busy) return;
    setBusy(true);
    const next = !isFollowing;
    setIsFollowing(next); setFollowers((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleFollow(profile.user_id);
    if (res === null) { setIsFollowing(!next); setFollowers((c) => Math.max(0, c + (next ? -1 : 1))); }
    else setIsFollowing(res);
    setBusy(false);
  }
  async function openConv(mode?: "audio" | "video") {
    if (busy) return; setBusy(true);
    try {
      const sb = createClient();
      const { data, error } = await sb.rpc("get_or_create_dm", { p_other: profile.user_id });
      if (!error && typeof data === "string") {
        router.push(mode ? `/community/messages/${data}/call${mode === "audio" ? "?mode=audio" : ""}` : `/community/messages/${data}`);
        return;
      }
    } catch { /* noop */ }
    setBusy(false);
  }

  const presence = isOnline
    ? { dot: "🟢", label: "En ligne", color: "#2E9B47" }
    : (profile.last_seen_at && Date.now() - new Date(profile.last_seen_at).getTime() < 86400000
        ? { dot: "🟡", label: "Actif récemment", color: "#B8860B" }
        : { dot: "⚫", label: "Hors ligne", color: T.textMuted });

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 70 }}>
      <style>{`
        @keyframes ccb-pf-in { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
        .ccb-pf-tab { animation: ccb-pf-in .35s ease both; }
        .ccb-pf-tabs::-webkit-scrollbar, .ccb-pf-stats::-webkit-scrollbar { display:none; }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 14px" }}>
        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link href="/community/membres" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 11px", color: T.violet, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>← Membres</Link>
          {isMe && <Link href="/profile" style={{ background: T.violet, border: "none", borderRadius: 8, padding: "5px 11px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>✏️ Modifier</Link>}
        </div>

        {/* ─── Section 1 : Header compact premium ─── */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px", marginBottom: 10, boxShadow: T.shadowSoft }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {profile.avatar_url ? (
                <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.display_name || ""} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.gold}` }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", border: `2px solid ${T.gold}` }}>{initials}</div>
              )}
              {isOnline && <span style={{ position: "absolute", bottom: 2, right: 2, width: 15, height: 15, borderRadius: "50%", background: "#2E9B47", border: `3px solid ${T.card}` }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: F.title, fontSize: 20, fontWeight: 700, margin: 0, color: T.text }}>{profile.display_name || "Membre"}</h1>
                {roleBadge && <span style={{ fontSize: 11, fontWeight: 700, color: T.violet, background: T.violetSoft, border: `1px solid ${T.violet}55`, borderRadius: 999, padding: "2px 8px" }}>{roleBadge.emoji} {roleBadge.label}</span>}
                {premium && !roleBadge && <span style={{ fontSize: 11 }}>💎</span>}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{handleOf(profile.display_name)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 6, fontSize: 11.5, color: T.textMuted }}>
                <span style={{ color: presence.color, fontWeight: 600 }}>{presence.dot} {presence.label}</span>
                {location && <span>📍 {location}</span>}
                {profile.created_at && <span>📅 Depuis {joinDate(profile.created_at)}</span>}
              </div>
            </div>
          </div>

          {/* Rang + XP + progression */}
          <div style={{ marginTop: 14, background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: rank.color }}>
                <span style={{ fontSize: 18 }}>{rank.emoji}</span> {rank.label}
                <span style={{ color: T.textMuted, fontWeight: 600, fontSize: 12 }}>· {xp} XP</span>
              </span>
              {progress.next && (
                <span style={{ fontSize: 11, color: T.textMuted }}>{progress.toGo} XP → {progress.next.emoji} {progress.next.label}</span>
              )}
            </div>
            <div style={{ height: 7, background: T.surface2, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(progress.pct * 100)}%`, background: `linear-gradient(90deg, ${T.violet}, ${T.gold})`, borderRadius: 999, transition: "width .5s" }} />
            </div>
          </div>
        </div>

        {/* ─── Section 2 : Stats sociales cliquables ─── */}
        <div className="ccb-pf-stats" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 10 }}>
          <SocialStat label="Abonnés" value={followers} href={`/community/profil/${profile.user_id}/abonnes`} />
          <SocialStat label="Abonnements" value={following} href={`/community/profil/${profile.user_id}/abonnements`} />
          <SocialStat label="Publications" value={stats.posts} onClick={() => setTab("publications")} />
          <SocialStat label="Prières" value={stats.prayersPosted} onClick={() => setTab("prieres")} />
          <SocialStat label="Témoignages" value={stats.testimonies} />
          <SocialStat label="Likes reçus" value={stats.likesReceived} />
        </div>

        {/* ─── Section 3 : Actions rapides ─── */}
        {!isMe && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button onClick={onFollow} disabled={busy} style={{
              flex: 1.5, padding: "10px", borderRadius: 999, fontWeight: 800, fontSize: 13, fontFamily: F.body,
              cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: isFollowing ? T.card : T.gold, color: isFollowing ? T.text : T.black,
              border: isFollowing ? `1px solid ${T.border}` : "none",
            }}>{isFollowing ? "✓ Abonné" : "➕ Suivre"}</button>
            <button onClick={() => openConv()} disabled={busy} title="Message" style={actBtn}>💬</button>
            <button onClick={() => openConv("audio")} disabled={busy} title="Audio" style={actBtn}>📞</button>
            <button onClick={() => openConv("video")} disabled={busy} title="Vidéo" style={actBtn}>📹</button>
            <button onClick={() => openConv("video")} disabled={busy} title="Réunion CCB Meet" style={actBtn}>🎥</button>
          </div>
        )}

        {/* ─── Section 4 : À propos ─── */}
        {(profile.bio || profile.testimony || profile.cell_group) && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>À propos</div>
            {profile.bio && <p style={{ margin: "0 0 10px", fontSize: 13.5, color: T.textSoft, lineHeight: 1.6 }}>{profile.bio}</p>}
            {profile.cell_group && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.violetSoft, color: T.violet, border: `1px solid ${T.violet}33`, borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, marginBottom: profile.testimony ? 10 : 0 }}>👥 {profile.cell_group}</div>
            )}
            {profile.testimony && (
              <div style={{ borderLeft: `3px solid ${T.gold}`, paddingLeft: 10, marginTop: profile.cell_group ? 4 : 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>✨ Témoignage</div>
                <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.6, fontStyle: "italic" }}>« {profile.testimony} »</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Section 5 : Onglets Skool (sticky) ─── */}
        <div className="ccb-pf-tabs" style={{ display: "flex", gap: 4, overflowX: "auto", position: "sticky", top: 0, zIndex: 10, background: T.bg, padding: "6px 0", marginBottom: 10, borderBottom: `1px solid ${T.border}` }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            const isAdmin = t.key === "admin";
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flexShrink: 0, padding: "8px 13px", borderRadius: 999, fontFamily: F.body,
                fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
                background: active ? (isAdmin ? T.gold : T.violet) : "transparent",
                color: active ? (isAdmin ? T.black : "#fff") : (isAdmin ? T.goldDark : T.textMuted),
                border: `1px solid ${active ? (isAdmin ? T.gold : T.violet) : (isAdmin ? T.gold : T.border)}`,
              }}>{t.emoji} {t.label}</button>
            );
          })}
        </div>

        {/* Contenu des onglets */}
        <div className="ccb-pf-tab" key={tab}>
          {tab === "publications" && <PublicationsTab posts={recentPosts} />}
          {tab === "prieres" && <PrieresTab userId={profile.user_id} />}
          {tab === "groupes" && <GroupesTab userId={profile.user_id} />}
          {tab === "activite" && <ActiviteTab posts={recentPosts} stats={stats} />}
          {tab === "realisations" && <RealisationsTab badges={badges} milestones={milestones} rank={rank} />}
          {tab === "admin" && viewerIsAdmin && (
            <AdminMemberPanel
              userId={profile.user_id}
              displayName={profile.display_name}
              role={role}
              stats={stats}
              xp={xp}
              rankLabel={`${rank.emoji} ${rank.label}`}
              lastSeenAt={profile.last_seen_at}
              createdAt={profile.created_at}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Onglet Publications ───────── */
function PublicationsTab({ posts }: { posts: RecentPost[] }) {
  if (posts.length === 0) return <Empty icon="📝" text="Aucune publication." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {posts.map((p) => {
        const k = getPostKindDef(p.post_kind);
        return (
          <div key={p.id} style={{ background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11 }}>
              <span style={{ color: k.color, fontWeight: 700 }}>{k.emoji} {k.label}</span>
              <span style={{ color: T.textMuted }}>· {timeAgo(p.created_at)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: T.textSoft, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Onglet Prières (lazy) ───────── */
type PrayerRow = { id: string; content: string; created_at: string; is_answered: boolean };
function PrieresTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PrayerRow[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from("prayer_requests")
          .select("id, content, created_at, is_answered")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
        setRows((data ?? []) as PrayerRow[]);
      } catch { setRows([]); }
    })();
  }, [userId]);
  if (rows === null) return <Empty icon="⏳" text="Chargement…" />;
  if (rows.length === 0) return <Empty icon="🙏" text="Aucune demande de prière." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map((p) => (
        <div key={p.id} style={{ background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: 12, padding: "11px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: T.violet, fontWeight: 700 }}>🙏 Prière</span>
            <span style={{ color: T.textMuted }}>· {timeAgo(p.created_at)}</span>
            {p.is_answered && <span style={{ color: "#2E9B47", fontWeight: 700 }}>· ✅ Exaucée</span>}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: T.textSoft, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────── Onglet Groupes (lazy) ───────── */
function GroupesTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; role: string; joined_at: string }> | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data: gm } = await sb.from("group_members")
          .select("group_id, role, joined_at").eq("user_id", userId);
        const list = (gm ?? []) as Array<{ group_id: string; role: string; joined_at: string }>;
        if (list.length === 0) { setRows([]); return; }
        const { data: groups } = await sb.from("groups").select("id, name").in("id", list.map((g) => g.group_id));
        const nameMap: Record<string, string> = {};
        for (const g of (groups ?? []) as Array<{ id: string; name: string }>) nameMap[g.id] = g.name;
        setRows(list.map((g) => ({ id: g.group_id, name: nameMap[g.group_id] || "Groupe", role: g.role, joined_at: g.joined_at })));
      } catch { setRows([]); }
    })();
  }, [userId]);
  if (rows === null) return <Empty icon="⏳" text="Chargement…" />;
  if (rows.length === 0) return <Empty icon="👥" text="Aucun groupe." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((g) => (
        <Link key={g.id} href={`/community/groups/${g.id}`} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: 12, padding: "11px 14px", textDecoration: "none", color: T.text }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{g.role === "owner" ? "👑 Propriétaire" : g.role === "admin" ? "🛡️ Admin" : "Membre"} · depuis {new Date(g.joined_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</div>
          </div>
          <span style={{ color: T.violet }}>→</span>
        </Link>
      ))}
    </div>
  );
}

/* ───────── Onglet Activité ───────── */
function ActiviteTab({ posts, stats }: { posts: RecentPost[]; stats: MemberStats }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <MiniStat label="Publications" value={stats.posts} />
        <MiniStat label="Commentaires" value={stats.comments} />
        <MiniStat label="Prières" value={stats.prayersPosted} />
        <MiniStat label="Likes reçus" value={stats.likesReceived} />
      </div>
      {posts.length === 0 ? <Empty icon="📚" text="Aucune activité récente." /> : (
        <div style={{ position: "relative", paddingLeft: 18 }}>
          <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: T.border }} />
          {posts.map((p) => {
            const k = getPostKindDef(p.post_kind);
            return (
              <div key={p.id} style={{ position: "relative", marginBottom: 14 }}>
                <span style={{ position: "absolute", left: -17, top: 3, width: 10, height: 10, borderRadius: "50%", background: T.violet, border: `2px solid ${T.bg}` }} />
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>{k.emoji} {k.label} · {timeAgo(p.created_at)}</div>
                <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────── Onglet Réalisations ───────── */
function RealisationsTab({ badges, milestones, rank }: { badges: ReturnType<typeof computeBadges>; milestones: string[]; rank: ReturnType<typeof getRank> }) {
  return (
    <div>
      <div style={{ background: T.card, border: `1px solid ${T.gold}`, borderRadius: 14, padding: "14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 34 }}>{rank.emoji}</span>
        <div>
          <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 16, color: T.text }}>{rank.label}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>Rang spirituel actuel</div>
        </div>
      </div>

      {milestones.length > 0 && (
        <>
          <SubTitle>🌟 Jalons spirituels</SubTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {milestones.map((mk) => {
              const def = MILESTONE_DEF[mk]; if (!def) return null;
              return <span key={mk} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 999, padding: "6px 13px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSoft, fontWeight: 600 }}>{def.icon} {def.label}</span>;
            })}
          </div>
        </>
      )}

      <SubTitle>🏆 Badges</SubTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 9 }}>
        {badges.map((b) => (
          <div key={b.id} style={{ background: b.achieved ? T.card : "transparent", border: `1px solid ${b.achieved ? T.gold : T.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center", opacity: b.achieved ? 1 : 0.5 }}>
            <div style={{ fontSize: 26, marginBottom: 4, filter: b.achieved ? "none" : "grayscale(100%)" }}>{b.emoji}</div>
            <div style={{ fontFamily: F.title, fontSize: 12, fontWeight: 700, color: b.achieved ? T.text : T.textMuted, marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.35 }}>{b.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── helpers UI ───────── */
function SocialStat({ label, value, href, onClick }: { label: string; value: number; href?: string; onClick?: () => void }) {
  const inner = (
    <div style={{ flexShrink: 0, textAlign: "center", background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 14px", minWidth: 72, cursor: (href || onClick) ? "pointer" : "default" }}>
      <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 17, color: T.violet }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{label}</div>
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} style={{ background: "none", border: "none", padding: 0 }}>{inner}</button>;
  return inner;
}
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 18, color: T.text }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: F.title, fontSize: 12.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 9px" }}>{children}</h3>;
}
function Empty({ icon, text }: { icon: string; text: string }) {
  return <div style={{ textAlign: "center", padding: "36px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, color: T.textMuted, fontSize: 13.5 }}><div style={{ fontSize: 34, marginBottom: 8 }}>{icon}</div>{text}</div>;
}

const actBtn: React.CSSProperties = {
  flex: 1, padding: "10px 0", borderRadius: 999, fontSize: 16, cursor: "pointer",
  background: T.card, border: `1px solid ${T.border}`, color: T.text,
  display: "flex", alignItems: "center", justifyContent: "center",
};
