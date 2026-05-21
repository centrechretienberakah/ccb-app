"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";
import { fetchUnmutedMembers } from "@/lib/groups/notify";

export interface ScheduledRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  mode: "audio" | "video";
  scheduled_at: string;
  duration_minutes: number;
  created_by: string;
  status: "scheduled" | "started" | "completed" | "cancelled";
  session_id: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  is_upcoming: boolean;
  is_now: boolean;
  seconds_until_start: number;
}

export interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  group: { id: string; name: string; type: "public" | "private" };
  initialScheduled: ScheduledRow[];
  profiles: ProfileLite[];
  currentUserId: string;
  myRole: "owner" | "admin" | "member" | null;
  isStaff: boolean;
  sqlReady: boolean;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Maintenant";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `dans ${d}j ${h}h`;
  if (h > 0) return `dans ${h}h ${m}m`;
  if (m > 0) return `dans ${m}m`;
  return "dans <1m";
}

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Aujourd'hui · ${time}`;
  if (isTomorrow) return `Demain · ${time}`;
  return d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export default function ScheduledClient({
  group, initialScheduled, profiles, currentUserId, myRole, isStaff, sqlReady,
}: Props) {
  const router = useRouter();
  const [scheduled, setScheduled] = useState<ScheduledRow[]>(initialScheduled);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [nowTick, setNowTick] = useState(0);

  // Refresh countdown chaque minute
  useEffect(() => {
    const itv = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(itv);
  }, []);

  void nowTick; // force re-render

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  // Calcule l'état dynamiquement (le serveur peut être un peu en retard)
  const enriched = useMemo(() => {
    const nowMs = Date.now();
    return scheduled.map((s) => {
      const startMs = new Date(s.scheduled_at).getTime();
      const endMs = startMs + s.duration_minutes * 60_000;
      const secondsUntilStart = Math.max(0, Math.floor((startMs - nowMs) / 1000));
      const is_now = s.status === "scheduled" && startMs <= nowMs + 5 * 60_000 && endMs > nowMs;
      const is_upcoming = s.status === "scheduled" && startMs > nowMs;
      return { ...s, seconds_until_start: secondsUntilStart, is_now, is_upcoming };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduled, nowTick]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2800); }

  const canCreate = isStaff || !!myRole; // tout membre peut créer
  const canCancel = (s: ScheduledRow) =>
    isStaff || s.created_by === currentUserId || myRole === "owner" || myRole === "admin";

  async function cancelMeeting(s: ScheduledRow) {
    if (!confirm(`Annuler la réunion « ${s.title} » ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("meet_scheduled_cancel", { p_id: s.id });
    if (error) { flash("Erreur : " + error.message); return; }
    setScheduled((arr) => arr.filter((x) => x.id !== s.id));
    flash("Réunion annulée");
  }

  function joinMeeting(s: ScheduledRow) {
    router.push(`/community/groups/${group.id}/meeting${s.mode === "audio" ? "?mode=audio" : ""}`);
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh",
      color: T.text, fontFamily: F.body, paddingBottom: 80,
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 22px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      {/* TopBar */}
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
              🗓️ Réunions programmées
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.82, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {group.name}
            </div>
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} style={{
              padding: "8px 14px",
              background: T.gold, color: "#1F1A33",
              border: "none", borderRadius: 999,
              fontWeight: 800, fontSize: 12, cursor: "pointer",
              fontFamily: F.body, whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(212,175,55,0.4)",
            }}>＋ Programmer</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "16px 16px 32px" }}>
        {!sqlReady && (
          <div style={{
            padding: 14, marginBottom: 14,
            background: T.card, border: `1px dashed ${T.textMuted}`, borderRadius: 12,
            color: T.textSoft, fontSize: 12.5, lineHeight: 1.5,
          }}>
            ⚠️ Exécute <code>supabase/livekit_phase3_v44.sql</code> pour activer les réunions programmées.
          </div>
        )}

        {enriched.length === 0 ? (
          <div style={{
            padding: "60px 24px", textAlign: "center",
            background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 50, marginBottom: 10 }}>🗓️</div>
            <div style={{ color: T.text, fontWeight: 700, marginBottom: 6, fontFamily: F.title, fontSize: 17 }}>
              Aucune réunion programmée
            </div>
            <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 18, maxWidth: 340, marginInline: "auto" }}>
              {canCreate
                ? "Programme une rencontre, un temps de prière ou une étude biblique pour ton groupe."
                : "Aucune réunion à venir pour le moment."}
            </div>
            {canCreate && (
              <button onClick={() => setShowCreate(true)} style={primaryBtn}>
                ＋ Programmer une réunion
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enriched.map((s) => (
              <ScheduledCard key={s.id}
                row={s}
                creator={profileMap.get(s.created_by) ?? null}
                canCancel={canCancel(s)}
                onJoin={() => joinMeeting(s)}
                onCancel={() => cancelMeeting(s)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMeetingModal
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowCreate(false)}
          onCreated={(newRow) => {
            setScheduled((arr) => [...arr, newRow].sort((a, b) =>
              new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            ));
            setShowCreate(false);
            flash("📅 Réunion programmée !");
          }}
        />
      )}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────
function ScheduledCard({ row: s, creator, canCancel, onJoin, onCancel }: {
  row: ScheduledRow & { is_now: boolean; is_upcoming: boolean; seconds_until_start: number };
  creator: ProfileLite | null;
  canCancel: boolean;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const modeEmoji = s.mode === "audio" ? "📞" : "🎥";
  const statusLabel =
    s.status === "started" ? "🟢 EN COURS" :
    s.status === "completed" ? "✓ Terminée" :
    s.is_now ? "🟢 MAINTENANT" :
    s.is_upcoming ? formatCountdown(s.seconds_until_start) :
    "Passée";
  const statusColor =
    s.status === "started" || s.is_now ? "#2E9B47" :
    s.status === "completed" ? T.textMuted :
    s.is_upcoming ? T.violet : T.textMuted;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "52px 1fr auto",
      gap: 14, alignItems: "center",
      padding: "14px 16px",
      background: T.card,
      border: `1px solid ${s.is_now ? T.gold : T.border}`,
      borderRadius: 14,
      boxShadow: s.is_now ? "0 6px 20px rgba(212,175,55,0.20)" : "0 1px 4px rgba(31,26,51,0.04)",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: s.mode === "audio"
          ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`
          : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{modeEmoji}</div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: F.title, fontWeight: 700, fontSize: 15.5,
          color: T.text, lineHeight: 1.2, marginBottom: 3,
        }}>{s.title}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>
          🗓️ {formatScheduledAt(s.scheduled_at)} · ⏱️ {s.duration_minutes}m
          {creator?.display_name ? <> · 👤 {creator.display_name}</> : null}
        </div>
        <span style={{
          display: "inline-block",
          padding: "2px 8px", borderRadius: 4,
          background: `${statusColor}22`, color: statusColor,
          border: `1px solid ${statusColor}55`,
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
        }}>{statusLabel}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {s.status === "scheduled" && s.is_now ? (
          <button onClick={onJoin} style={{
            padding: "8px 16px",
            background: T.gold, color: "#1F1A33",
            border: "none", borderRadius: 999,
            fontWeight: 800, fontSize: 11.5, cursor: "pointer",
            fontFamily: F.body, whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(212,175,55,0.45)",
          }}>Rejoindre</button>
        ) : s.status === "started" ? (
          <button onClick={onJoin} style={{
            padding: "8px 16px",
            background: "#2E9B47", color: "#fff",
            border: "none", borderRadius: 999,
            fontWeight: 800, fontSize: 11.5, cursor: "pointer",
            fontFamily: F.body, whiteSpace: "nowrap",
          }}>Rejoindre</button>
        ) : null}
        {canCancel && (s.status === "scheduled") && (
          <button onClick={onCancel} style={{
            padding: "5px 10px",
            background: "transparent", color: "#C24B7A",
            border: `1px solid rgba(194,75,122,0.4)`,
            borderRadius: 999, fontSize: 10.5, fontWeight: 700,
            cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
          }}>Annuler</button>
        )}
      </div>
    </div>
  );
}

// ─── Modal création ─────────────────────────────────────────────────
function CreateMeetingModal({ groupId, groupName, onClose, onCreated }: {
  groupId: string;
  groupName: string;
  onClose: () => void;
  onCreated: (row: ScheduledRow) => void;
}) {
  const router = useRouter();
  void router;

  // Default : aujourd'hui + 1h, arrondi au quart d'heure suivant
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return d;
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"audio" | "video">("video");
  const [dateStr, setDateStr] = useState(() => {
    const d = defaultDate;
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [timeStr, setTimeStr] = useState(() => {
    const d = defaultDate;
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy) return;
    if (!title.trim()) { setError("Le titre est obligatoire"); return; }
    const scheduled = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(scheduled.getTime())) { setError("Date / heure invalide"); return; }
    if (scheduled.getTime() < Date.now() - 60_000) { setError("La date doit être dans le futur"); return; }

    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("meet_scheduled_create", {
      p_group_id: groupId,
      p_title: title.trim(),
      p_description: description.trim() || null,
      p_mode: mode,
      p_scheduled_at: scheduled.toISOString(),
      p_duration_minutes: duration,
    });
    if (rpcErr) { setBusy(false); setError(rpcErr.message); return; }

    // Récupère la row complète
    const { data: row } = await supabase
      .from("meet_scheduled_with_stats")
      .select("id, group_id, title, description, mode, scheduled_at, duration_minutes, created_by, status, session_id, started_at, cancelled_at, is_upcoming, is_now, seconds_until_start")
      .eq("id", data as string)
      .maybeSingle();

    // Notif push aux membres non mutés du groupe
    if (row) {
      const newRow = row as ScheduledRow;
      try {
        const targets = await fetchUnmutedMembers(groupId);
        if (targets.length > 0) {
          await fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `🗓️ Nouvelle réunion programmée — ${groupName}`,
              body: `${newRow.title} · ${formatScheduledAt(newRow.scheduled_at)}`,
              url: `/community/groups/${groupId}/meeting/scheduled`,
              audience: "user_ids",
              userIds: targets,
            }),
          });
        }
      } catch { /* noop */ }
      onCreated(newRow);
    } else {
      onClose();
    }
    setBusy(false);
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, borderRadius: 18, padding: 20,
        width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto",
        border: `1px solid ${T.border}`, boxShadow: T.shadowMd,
      }}>
        <div style={{ fontFamily: F.title, fontSize: 18, fontWeight: 700, color: T.violet, marginBottom: 16 }}>
          🗓️ Programmer une réunion
        </div>

        <Field label="TITRE *">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="ex. Veillée de prière, Étude biblique…"
            maxLength={160} style={inputStyle} autoFocus />
        </Field>

        <Field label="DESCRIPTION (optionnel)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={2} placeholder="Sujet, intervenants, contexte…"
            style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="DATE *">
            <input type="date" value={dateStr} min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateStr(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="HEURE *">
            <input type="time" value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="MODE">
            <select value={mode} onChange={(e) => setMode(e.target.value as "audio" | "video")} style={inputStyle}>
              <option value="video">🎥 Réunion vidéo</option>
              <option value="audio">📞 Appel vocal</option>
            </select>
          </Field>
          <Field label="DURÉE">
            <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} style={inputStyle}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 heure</option>
              <option value={90}>1h30</option>
              <option value={120}>2 heures</option>
              <option value={180}>3 heures</option>
            </select>
          </Field>
        </div>

        {error && (
          <div style={{
            background: "rgba(194,75,122,0.10)", color: "#C24B7A",
            border: "1px solid rgba(194,75,122,0.3)", borderRadius: 10,
            padding: "8px 12px", fontSize: 12.5, marginBottom: 10,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={handleSubmit} disabled={busy || !title.trim()} style={{
            ...primaryBtn,
            opacity: busy || !title.trim() ? 0.6 : 1,
            cursor: busy || !title.trim() ? "not-allowed" : "pointer",
          }}>
            {busy ? "Création…" : "Programmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12, flex: 1 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: "uppercase", letterSpacing: 0.6,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px", fontSize: 14,
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontFamily: F.body, outline: "none",
};
const primaryBtn: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  color: "#fff", border: "none",
  borderRadius: 10, padding: "9px 18px",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
  fontFamily: F.body,
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: T.textMuted,
  border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "9px 14px",
  fontWeight: 600, fontSize: 13, cursor: "pointer",
  fontFamily: F.body,
};
