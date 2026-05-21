"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

export interface SessionRow {
  id: string;
  group_id: string;
  room_name: string;
  mode: "audio" | "video";
  started_by: string;
  started_at: string;
  ended_at: string | null;
  total_seconds: number | null;
  participant_count_peak: number;
  participant_count_total: number;
  recording_url: string | null;
  is_active: boolean;
  active_count: number;
}

export interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ParticipantRow {
  session_id: string;
  user_id: string;
  joined_at: string;
  total_seconds: number | null;
}

interface Props {
  group: { id: string; name: string; type: "public" | "private" };
  sessions: SessionRow[];
  participants: ParticipantRow[];
  profiles: ProfileLite[];
  sqlReady: boolean;
}

type Filter = "all" | "active" | "audio" | "video";

function formatDuration(secs: number | null): string {
  if (!secs || secs <= 0) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (sameDay) return `Aujourd'hui · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (isYesterday) return `Hier · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryClient({ group, sessions, participants, profiles, sqlReady }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const participantsBySession = useMemo(() => {
    const m = new Map<string, ParticipantRow[]>();
    participants.forEach((p) => {
      if (!m.has(p.session_id)) m.set(p.session_id, []);
      m.get(p.session_id)!.push(p);
    });
    return m;
  }, [participants]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filter === "all") return true;
      if (filter === "active") return s.is_active;
      return s.mode === filter;
    });
  }, [sessions, filter]);

  const totals = useMemo(() => {
    const totalMin = sessions.reduce((acc, s) => acc + Math.floor((s.total_seconds ?? 0) / 60), 0);
    const audio = sessions.filter((s) => s.mode === "audio").length;
    const video = sessions.filter((s) => s.mode === "video").length;
    const uniqueParticipants = new Set(participants.map((p) => p.user_id)).size;
    return { totalSessions: sessions.length, totalMin, audio, video, uniqueParticipants };
  }, [sessions, participants]);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh",
      color: T.text, fontFamily: F.body, paddingBottom: 80,
    }}>
      {/* TopBar sticky */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: `linear-gradient(180deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff",
        boxShadow: "0 1px 0 rgba(0,0,0,0.18), 0 4px 18px rgba(90,44,160,0.18)",
      }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/community/groups/${group.id}`} aria-label="Retour"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "#fff", textDecoration: "none", fontSize: 18, flexShrink: 0,
            }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.title, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>
              📜 Historique des appels
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.82, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {group.name}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "14px 16px 32px" }}>
        {!sqlReady && (
          <div style={{
            padding: 14, marginBottom: 14,
            background: T.card, border: `1px dashed ${T.textMuted}`, borderRadius: 12,
            color: T.textSoft, fontSize: 12.5, lineHeight: 1.5,
          }}>
            ⚠️ Exécute <code>supabase/livekit_phase2_v43.sql</code> pour activer l&apos;historique des sessions.
          </div>
        )}

        {/* KPIs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10, marginBottom: 18,
        }}>
          <Kpi icon="📞" label="Sessions" value={totals.totalSessions} />
          <Kpi icon="⏱️" label="Temps total" value={`${totals.totalMin}m`} />
          <Kpi icon="👥" label="Participants" value={totals.uniqueParticipants} />
          <Kpi icon="🎥" label="Vidéo / Audio" value={`${totals.video} / ${totals.audio}`} />
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {([
            ["all", "📚 Toutes"],
            ["active", "🟢 En cours"],
            ["video", "🎥 Vidéo"],
            ["audio", "📞 Audio"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id as Filter)} style={{
              padding: "7px 13px",
              background: filter === id ? T.violetSoft : T.card,
              color: filter === id ? T.violet : T.textSoft,
              border: `1px solid ${filter === id ? T.violet : T.border}`,
              borderRadius: 999, fontSize: 12, fontWeight: filter === id ? 700 : 500,
              cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
            }}>{label}</button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{
            padding: "50px 24px", textAlign: "center",
            background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>📞</div>
            <div style={{ color: T.text, fontWeight: 700, marginBottom: 6 }}>
              Aucune session enregistrée
            </div>
            <div style={{ color: T.textMuted, fontSize: 12.5, marginBottom: 14 }}>
              Les appels apparaîtront ici dès qu&apos;ils auront été démarrés.
            </div>
            <Link href={`/community/groups/${group.id}`} style={{
              display: "inline-block", padding: "9px 18px",
              background: T.violet, color: "#fff",
              borderRadius: 999, fontSize: 12.5, fontWeight: 700,
              textDecoration: "none",
            }}>← Retour au groupe</Link>
          </div>
        ) : (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, overflow: "hidden",
          }}>
            {filtered.map((s, i) => {
              const starter = profileMap.get(s.started_by);
              const allParts = participantsBySession.get(s.id) ?? [];
              const sortedParts = [...allParts].sort((a, b) =>
                new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
              );
              return (
                <SessionRow key={s.id}
                  session={s}
                  starter={starter ?? null}
                  participants={sortedParts}
                  profileMap={profileMap}
                  isLast={i === filtered.length - 1}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div style={{
      padding: 14, background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12, boxShadow: T.shadowSoft,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.textMuted, fontSize: 11, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: F.title, fontSize: 22, fontWeight: 800,
        color: T.text, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}

function SessionRow({ session: s, starter, participants, profileMap, isLast }: {
  session: SessionRow;
  starter: ProfileLite | null;
  participants: ParticipantRow[];
  profileMap: Map<string, ProfileLite>;
  isLast: boolean;
}) {
  const dur = formatDuration(s.total_seconds);
  const modeEmoji = s.mode === "audio" ? "📞" : "🎥";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "48px 1fr auto",
      gap: 12, alignItems: "center",
      padding: "13px 14px",
      borderBottom: isLast ? "none" : `1px solid ${T.borderSoft}`,
      background: s.is_active ? "rgba(46,155,71,0.06)" : "transparent",
    }}>
      {/* Avatar mode */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: s.mode === "audio"
          ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`
          : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{modeEmoji}</div>

      {/* Détails */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>
            {s.mode === "audio" ? "Appel vocal" : "Réunion vidéo"}
          </div>
          {s.is_active && (
            <span style={{
              padding: "1.5px 7px", borderRadius: 4,
              background: "#2E9B47", color: "#fff",
              fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6,
              display: "inline-flex", alignItems: "center", gap: 3,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999, background: "#fff",
                animation: "ccb-pulse 1.4s ease-in-out infinite",
              }} />
              EN COURS · {s.active_count}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>📅 {formatDate(s.started_at)}</span>
          {!s.is_active && <span>⏱️ {dur}</span>}
          <span>👥 {s.participant_count_total} participant{s.participant_count_total > 1 ? "s" : ""}</span>
          {starter?.display_name ? <span>👤 par {starter.display_name}</span> : null}
        </div>
        {/* Avatars participants */}
        {participants.length > 0 && (
          <div style={{ display: "flex", marginTop: 6, gap: -4 }}>
            {participants.slice(0, 5).map((p, idx) => {
              const prof = profileMap.get(p.user_id);
              return (
                <div key={p.user_id} style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                  background: prof?.avatar_url
                    ? `url(${prof.avatar_url}) center/cover`
                    : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                  border: `2px solid ${T.card}`,
                  marginLeft: idx === 0 ? 0 : -8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 9, fontWeight: 800,
                  zIndex: 6 - idx,
                }}>
                  {!prof?.avatar_url && ((prof?.display_name || "?").charAt(0).toUpperCase())}
                </div>
              );
            })}
            {participants.length > 5 && (
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                background: T.surface2, color: T.textMuted,
                border: `2px solid ${T.card}`, marginLeft: -8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
              }}>+{participants.length - 5}</div>
            )}
          </div>
        )}
      </div>

      {/* CTA rejoindre si en cours */}
      {s.is_active && (
        <Link href={`/community/groups/${s.group_id}/meeting${s.mode === "audio" ? "?mode=audio" : ""}`}
          style={{
            padding: "8px 14px",
            background: T.gold, color: "#1F1A33",
            borderRadius: 999, fontSize: 11.5, fontWeight: 800,
            textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(212,175,55,0.4)",
          }}>Rejoindre</Link>
      )}
      <style>{`
        @keyframes ccb-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>
    </div>
  );
}
