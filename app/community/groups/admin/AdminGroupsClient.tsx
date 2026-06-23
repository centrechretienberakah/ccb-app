"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GROUPS_THEME as T, GROUPS_FONTS as F,
  GROUP_CATEGORIES, getGroupCategoryDef,
  formatChatTime,
} from "@/lib/groups/theme";

export interface GroupStat {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
  created_at: string;
  is_archived: boolean;
  archived_at: string | null;
  member_count: number;
  total_messages: number;
  messages_7d: number;
  messages_30d: number;
  last_activity_at: string | null;
}

export interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ActivityDay {
  day: string;
  new_groups: number;
  messages: number;
  new_members: number;
}

export interface GlobalKpis {
  total_groups: number;
  archived_groups: number;
  total_members: number;
  messages_7d: number;
  messages_30d: number;
  active_categories: number;
}

interface Props {
  kpis: GlobalKpis;
  groups: GroupStat[];
  activity: ActivityDay[];
  profiles: ProfileLite[];
  sqlReady: boolean;
  currentUserId: string;
}

type FilterMode = "all" | "active" | "inactive" | "archived" | "private";
type SortMode = "activity" | "members" | "messages_7d" | "name" | "created";

export default function AdminGroupsClient({
  kpis: initialKpis, groups: initialGroups, activity, profiles, sqlReady,
}: Props) {
  const [groups, setGroups] = useState<GroupStat[]>(initialGroups);
  const [kpis, setKpis] = useState<GlobalKpis>(initialKpis);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("activity");
  const [toast, setToast] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    const inactiveCutoff = Date.now() - 30 * 24 * 3600 * 1000;
    let out = groups.filter((g) => {
      if (filter === "archived") return g.is_archived;
      if (g.is_archived) return false; // hide archived from non-archived filters
      if (filter === "private")  return g.type === "private";
      if (filter === "active")   return g.messages_7d > 0;
      if (filter === "inactive") {
        const lastT = g.last_activity_at ? new Date(g.last_activity_at).getTime() : new Date(g.created_at).getTime();
        return lastT < inactiveCutoff;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "activity") {
        const tA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tB - tA;
      }
      if (sort === "members") return b.member_count - a.member_count;
      if (sort === "messages_7d") return b.messages_7d - a.messages_7d;
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return out;
  }, [groups, filter, sort]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function setBusy(id: string, b: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (b) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function setArchived(g: GroupStat, archived: boolean) {
    if (busyIds.has(g.id)) return;
    const label = archived ? "archiver" : "restaurer";
    if (!confirm(`Voulez-vous ${label} le groupe "${g.name}" ?`)) return;
    setBusy(g.id, true);
    const supabase = createClient();
    const { error } = await supabase.rpc("groups_admin_set_archived", {
      p_group_id: g.id, p_archived: archived,
    });
    setBusy(g.id, false);
    if (error) { flash("Erreur : " + error.message); return; }
    setGroups((arr) => arr.map((x) => x.id === g.id
      ? { ...x, is_archived: archived, archived_at: archived ? new Date().toISOString() : null }
      : x
    ));
    setKpis((k) => ({
      ...k,
      total_groups: archived ? k.total_groups - 1 : k.total_groups + 1,
      archived_groups: archived ? k.archived_groups + 1 : k.archived_groups - 1,
    }));
    flash(archived ? "📦 Groupe archivé" : "✓ Groupe restauré");
  }

  async function deleteGroup(g: GroupStat) {
    if (busyIds.has(g.id)) return;
    if (!confirm(`⚠️ SUPPRIMER DÉFINITIVEMENT "${g.name}" ?\n\nCette action est irréversible. Tous les messages, fichiers, membres seront perdus.\n\nTape OK pour confirmer.`)) return;
    setBusy(g.id, true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("groups").delete().eq("id", g.id).select("id");
    setBusy(g.id, false);
    if (error) { flash("Erreur : " + error.message); return; }
    if (!data || data.length === 0) {
      flash("⚠️ Suppression refusée par RLS. Tu n'es peut-être pas owner du groupe.");
      return;
    }
    setGroups((arr) => arr.filter((x) => x.id !== g.id));
    flash("🗑️ Groupe supprimé");
  }

  const maxActivity = Math.max(1, ...activity.map((d) => Math.max(d.messages, d.new_groups, d.new_members)));

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

      <header style={{
        padding: "24px 24px 12px", maxWidth: 1400, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
            <Link href="/community" style={{ color: T.textMuted, textDecoration: "none" }}>👥 Communauté</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <Link href="/community/groups" style={{ color: T.textMuted, textDecoration: "none" }}>Groupes</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>Admin</span>
          </div>
          <h1 style={{ fontFamily: F.title, fontSize: 28, margin: 0, fontWeight: 800, color: T.text }}>
            ⚙️ Dashboard groupes
          </h1>
          <p style={{ color: T.textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Vue d&apos;ensemble · modération · archives
          </p>
        </div>
        <Link href="/community/groups" style={{
          padding: "8px 14px", background: T.card,
          border: `1px solid ${T.border}`, color: T.text,
          borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>← Liste publique</Link>
      </header>

      {!sqlReady && (
        <div style={{
          maxWidth: 900, margin: "0 auto 14px", padding: 16,
          background: T.card, border: `1px dashed ${T.textMuted}`, borderRadius: 12,
          color: T.textSoft, fontSize: 13, lineHeight: 1.5,
        }}>
          ⚠️ Le SQL <code>supabase/groups_refonte_phase3_v41.sql</code> n&apos;est pas encore exécuté.
          Les compteurs activité/messages sont à zéro tant que la vue <code>groups_admin_stats</code> n&apos;existe pas.
        </div>
      )}

      {/* KPI cards */}
      <section style={{
        maxWidth: 1400, margin: "0 auto", padding: "0 24px 22px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14,
      }}>
        <Kpi icon="👥" label="Groupes actifs"      value={kpis.total_groups} accent={T.violet} />
        <Kpi icon="📦" label="Archivés"            value={kpis.archived_groups} />
        <Kpi icon="🧑‍🤝‍🧑" label="Total membres" value={kpis.total_members} />
        <Kpi icon="💬" label="Messages 7j"         value={kpis.messages_7d} accent={T.gold} />
        <Kpi icon="📊" label="Messages 30j"        value={kpis.messages_30d} />
        <Kpi icon="🏷️" label="Catégories actives"  value={kpis.active_categories} />
      </section>

      {/* Activity chart */}
      {activity.length > 0 && (
        <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px" }}>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>📈 Activité 30 derniers jours</h2>
          <div style={{ padding: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 12, color: T.textMuted, fontSize: 12, flexWrap: "wrap" }}>
              <LegendDot color={T.violet} label="Messages" />
              <LegendDot color={T.gold}   label="Nouveaux membres" />
              <LegendDot color="#2E9B47"  label="Nouveaux groupes" />
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${activity.length}, minmax(0, 1fr))`,
              gap: 2,
              height: 140,
              alignItems: "end",
            }}>
              {activity.map((d) => (
                <div key={d.day}
                  title={`${d.day} — 💬 ${d.messages} · 🧑‍🤝‍🧑 ${d.new_members} · ➕ ${d.new_groups}`}
                  style={{
                    display: "flex", flexDirection: "column-reverse",
                    gap: 1, height: "100%",
                  }}>
                  <div style={{ height: `${(d.messages / maxActivity) * 100}%`, background: T.violet, minHeight: d.messages > 0 ? 1 : 0, borderRadius: "2px 2px 0 0" }} />
                  <div style={{ height: `${(d.new_members / maxActivity) * 100}%`, background: T.gold, minHeight: d.new_members > 0 ? 1 : 0 }} />
                  <div style={{ height: `${(d.new_groups / maxActivity) * 100}%`, background: "#2E9B47", minHeight: d.new_groups > 0 ? 1 : 0 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 12px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {([
            ["all", "📚 Tous"],
            ["active", "🔥 Actifs (7j)"],
            ["inactive", "💤 Inactifs (30j+)"],
            ["private", "🔒 Privés"],
            ["archived", "📦 Archivés"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id as FilterMode)} style={chip(filter === id)}>
              {label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} style={{
            padding: "7px 12px",
            background: T.card, color: T.text, border: `1px solid ${T.border}`,
            borderRadius: 999, fontSize: 12.5, cursor: "pointer",
          }}>
            <option value="activity">📈 Activité récente</option>
            <option value="messages_7d">💬 Messages 7j</option>
            <option value="members">👥 Membres</option>
            <option value="created">🆕 Création</option>
            <option value="name">🔤 Nom (A→Z)</option>
          </select>
        </div>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "10px 0 0" }}>
          {filtered.length} groupe{filtered.length > 1 ? "s" : ""}
        </p>
      </section>

      {/* Groups list */}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 80px" }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "50px 24px", textAlign: "center",
            background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🧑‍🤝‍🧑</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucun groupe ne correspond à ces filtres.
            </div>
          </div>
        ) : (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden",
          }}>
            {filtered.map((g, i) => (
              <GroupRow key={g.id}
                group={g}
                creator={profileMap.get(g.created_by) ?? null}
                isLast={i === filtered.length - 1}
                busy={busyIds.has(g.id)}
                onArchive={() => setArchived(g, true)}
                onRestore={() => setArchived(g, false)}
                onDelete={() => deleteGroup(g)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────
function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      padding: 14, background: T.card,
      border: `1px solid ${accent ?? T.border}`,
      borderRadius: 12, boxShadow: T.shadowSoft,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: F.title, fontSize: 24, fontWeight: 800,
        color: accent ?? T.text, fontVariantNumeric: "tabular-nums",
      }}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}
    </span>
  );
}

function GroupRow({ group: g, creator, isLast, busy, onArchive, onRestore, onDelete }: {
  group: GroupStat;
  creator: ProfileLite | null;
  isLast: boolean;
  busy: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const catDef = getGroupCategoryDef(g.category);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 12, alignItems: "center",
      padding: "12px 14px",
      borderBottom: isLast ? "none" : `1px solid ${T.borderSoft}`,
      background: g.is_archived ? T.surface2 : "transparent",
    }}>
      {/* Avatar */}
      <Link href={`/community/groups/${g.id}`} style={{
        width: 44, height: 44, borderRadius: 10,
        background: g.cover_url
          ? `url(${g.cover_url}) center/cover`
          : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: F.title, fontSize: 17, fontWeight: 800,
        textDecoration: "none", textTransform: "uppercase",
      }}>{!g.cover_url && (g.name?.[0] ?? "?")}</Link>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <Link href={`/community/groups/${g.id}`} style={{
            fontWeight: 700, fontSize: 14.5, color: T.text,
            textDecoration: "none",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360,
          }}>{g.name}</Link>
          <Tag color={g.type === "public" ? T.violet : T.gold}>
            {g.type === "public" ? "🌍 Public" : "🔒 Privé"}
          </Tag>
          <Tag color={T.textMuted}>{catDef.emoji} {catDef.label}</Tag>
          {g.is_archived && <Tag color="#857C95" dark>📦 ARCHIVÉ</Tag>}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>👥 {g.member_count}</span>
          <span>💬 7j : {g.messages_7d}</span>
          <span>💬 30j : {g.messages_30d}</span>
          <span>📊 total : {g.total_messages}</span>
          {g.last_activity_at ? (
            <span>⏱️ dernière : {formatChatTime(g.last_activity_at)}</span>
          ) : (
            <span style={{ color: "#a0a0a0" }}>💤 jamais</span>
          )}
          {creator?.display_name ? (
            <span>👤 par {creator.display_name}</span>
          ) : null}
        </div>
      </div>

      <Link href={`/community/groups/${g.id}`} style={{
        padding: "6px 12px", background: T.violetSoft, color: T.gold,
        border: `1px solid ${T.violet}`,
        borderRadius: 999, fontSize: 11.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
      }}>↗ Ouvrir</Link>

      <div style={{ display: "flex", gap: 4 }}>
        {g.is_archived ? (
          <button onClick={onRestore} disabled={busy} title="Restaurer" style={iconBtn(T.violet)}>♻️</button>
        ) : (
          <button onClick={onArchive} disabled={busy} title="Archiver" style={iconBtn(T.textMuted)}>📦</button>
        )}
        <button onClick={onDelete} disabled={busy} title="Supprimer définitivement" style={iconBtn("#C24B7A")}>🗑️</button>
      </div>
    </div>
  );
}

function Tag({ children, color, dark = false }: { children: React.ReactNode; color: string; dark?: boolean }) {
  return (
    <span style={{
      padding: "1.5px 7px", borderRadius: 4,
      background: dark ? color : `${color}22`,
      color: dark ? "#fff" : color,
      border: `1px solid ${color}55`,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
    }}>{children}</span>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: 8,
    background: T.card, border: `1px solid ${T.border}`,
    color, cursor: "pointer", fontSize: 13,
  };
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11.5, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
  };
}

void GROUP_CATEGORIES; // ESLint: keep import for potential future use
