"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { browserTimeZone, userTimeZone, zonedNaiveToUtcISO, formatInZone, tzCity, COMMON_TIMEZONES } from "@/lib/time/tz";

// ─── Types ────────────────────────────────────────────────────
export interface CCBEvent {
  id: string;
  title: string;
  description?: string;
  event_type: "culte" | "bootcamp" | "etude" | "louange" | "priere" | "special" | "autre";
  event_date: string;   // original column name in schema.sql
  end_date?: string;    // original column name in schema.sql
  timezone?: string;    // fuseau d'origine (ex. "Europe/Paris")
  location?: string;
  is_online: boolean;
  link_url?: string;
  stream_url?: string;
  image_url?: string;
  is_published: boolean;
  status?: string;
  created_by?: string;
  created_at: string;
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  culte:    { icon: "🙏", label: "Culte",          color: "var(--gold)" },
  bootcamp: { icon: "🎓", label: "Bootcamp",        color: "var(--gold)" },
  etude:    { icon: "📖", label: "Étude biblique",  color: "#60a5fa" },
  louange:  { icon: "🎵", label: "Louange",         color: "#f472b6" },
  priere:   { icon: "✨", label: "Prière",          color: "var(--gold)" },
  special:  { icon: "🎉", label: "Spécial",         color: "var(--success)" },
  autre:    { icon: "📅", label: "Événement",       color: "var(--text-secondary)" },
};

const MONTH_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAY_FR   = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

function formatDate(dateStr: string) {
  const tz = userTimeZone();
  const d = new Date(dateStr);
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "numeric", day: "numeric", weekday: "short",
  }).formatToParts(d)) parts[p.type] = p.value;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day:   Number(parts.day),
    month: MONTH_FR[Number(parts.month) - 1] ?? "",
    dow:   DAY_FR[dowMap[parts.weekday] ?? d.getDay()] ?? "",
    time:  formatInZone(dateStr, tz, { hour: "2-digit", minute: "2-digit" }),
    past:  d < new Date(),
  };
}

function formatDuration(start: string, end?: string) {
  if (!end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (diff < 60) return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? (diff % 60) + "min" : ""}`;
  return `${Math.floor(diff / 1440)} jour${Math.floor(diff / 1440) > 1 ? "s" : ""}`;
}

// ─── EventCard ─────────────────────────────────────────────────
function EventCard({ event, userRsvp, goingCount, maybeCount, currentUserId, onRsvp }: {
  event: CCBEvent;
  userRsvp?: string;
  goingCount: number;
  maybeCount: number;
  currentUserId: string;
  onRsvp: (eventId: string, status: string | null) => void;
}) {
  const meta = TYPE_META[event.event_type] ?? TYPE_META.autre;
  const date = formatDate(event.event_date);
  const duration = formatDuration(event.event_date, event.end_date);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showTz, setShowTz] = useState(false);
  const joinUrl = event.link_url || event.stream_url;

  async function handleRsvp(status: "going" | "maybe" | "not_going") {
    setRsvpLoading(true);
    const supabase = createClient();
    if (userRsvp === status) {
      await supabase.from("event_rsvp").delete().eq("event_id", event.id).eq("user_id", currentUserId);
      onRsvp(event.id, null);
    } else {
      await supabase.from("event_rsvp").upsert(
        { event_id: event.id, user_id: currentUserId, status },
        { onConflict: "event_id,user_id" }
      );
      onRsvp(event.id, status);
    }
    setRsvpLoading(false);
  }

  return (
    <div style={{
      background: "var(--card-bg)",
      border: `1px solid ${date.past ? "var(--border-subtle)" : "var(--border)"}`,
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      opacity: date.past ? 0.7 : 1,
    }}>
      {/* Top accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${meta.color}, var(--gold))` }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Header: date badge + info */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Date badge */}
          <div style={{
            background: date.past ? "var(--surface)" : `${meta.color}18`,
            border: `1px solid ${date.past ? "var(--border)" : `${meta.color}40`}`,
            borderRadius: "var(--radius-lg)",
            padding: "8px 12px",
            textAlign: "center",
            flexShrink: 0, minWidth: 54,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: date.past ? "var(--text-muted)" : meta.color, lineHeight: 1, fontFamily: "var(--font-title)" }}>
              {date.day}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 2, textTransform: "uppercase" }}>
              {date.month}
            </div>
          </div>

          {/* Title + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40`, borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, fontWeight: 600, color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
              {event.is_online && (
                <span style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.4)", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>
                  🌐 En ligne
                </span>
              )}
              {date.past && (
                <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "2px 10px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Passé
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--gold-light)", fontFamily: "var(--font-title)", lineHeight: 1.3 }}>
              {event.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
            {event.description}
          </p>
        )}

        {/* Meta details */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
              <span>🕐</span>
              <span>{date.dow} {date.time}{duration ? ` · ${duration}` : ""}</span>
            </div>
            <button onClick={() => setShowTz((v) => !v)} style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 11.5, color: "var(--gold)", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "inherit",
            }}>
              📍 Heure locale{event.timezone ? (showTz ? " ▲" : " ▼") : ""}
            </button>
            {event.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                <span>📍</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{event.location}</span>
              </div>
            )}
          </div>
          {showTz && (
            <div style={{ marginTop: 8, padding: "8px 11px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {event.timezone && (
                <div>🌍 Heure d&apos;origine : <b>{formatInZone(event.event_date, event.timezone)}</b> ({tzCity(event.timezone)})</div>
              )}
              <div>📍 Votre heure : <b>{date.time}</b> ({tzCity(userTimeZone())})</div>
            </div>
          )}
        </div>

        {/* RSVP counts */}
        {(goingCount > 0 || maybeCount > 0) && (
          <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
            {goingCount > 0 && <span>✅ {goingCount} participant{goingCount > 1 ? "s" : ""}</span>}
            {maybeCount > 0 && <span>🤔 {maybeCount} peut-être</span>}
          </div>
        )}

        {/* RSVP buttons — only for future events */}
        {!date.past && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => handleRsvp("going")} disabled={rsvpLoading}
              style={{
                flex: 1, minWidth: 90,
                background: userRsvp === "going" ? "linear-gradient(135deg, var(--gold-dark), var(--gold))" : "var(--surface)",
                border: `1px solid ${userRsvp === "going" ? "var(--gold)" : "var(--border)"}`,
                borderRadius: "var(--radius-full)", padding: "9px 14px",
                color: userRsvp === "going" ? "#000" : "var(--text-secondary)",
                fontSize: 12, fontWeight: userRsvp === "going" ? 700 : 500,
                cursor: rsvpLoading ? "not-allowed" : "pointer", transition: "all 0.15s ease",
              }}>
              ✅ Je participe
            </button>
            <button onClick={() => handleRsvp("maybe")} disabled={rsvpLoading}
              style={{
                flex: 1, minWidth: 90,
                background: userRsvp === "maybe" ? "rgba(91, 33, 182,0.15)" : "var(--surface)",
                border: `1px solid ${userRsvp === "maybe" ? "var(--violet-light)" : "var(--border)"}`,
                borderRadius: "var(--radius-full)", padding: "9px 14px",
                color: userRsvp === "maybe" ? "var(--violet-light)" : "var(--text-muted)",
                fontSize: 12, fontWeight: userRsvp === "maybe" ? 700 : 500,
                cursor: rsvpLoading ? "not-allowed" : "pointer", transition: "all 0.15s ease",
              }}>
              🤔 Peut-être
            </button>
            {event.is_online && joinUrl && (
              <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, minWidth: 90,
                  background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.4)",
                  borderRadius: "var(--radius-full)", padding: "9px 14px",
                  color: "#60a5fa", fontSize: 12, fontWeight: 600,
                  textDecoration: "none", textAlign: "center",
                }}>
                🌐 Rejoindre
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Create Modal ────────────────────────────────────────
function CreateEventModal({ currentUserId, onCreated, onClose }: {
  currentUserId: string;
  onCreated: (event: CCBEvent) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "", event_type: "culte",
    event_date: "", end_date: "", location: "",
    is_online: false, link_url: "", timezone: browserTimeZone(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--page-bg)", border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)", padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
  };

  async function save() {
    if (!form.title.trim()) { setError("Le titre est requis."); return; }
    if (!form.event_date) { setError("La date de début est requise."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase.from("events").insert({
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      event_date: zonedNaiveToUtcISO(form.event_date, form.timezone),
      end_date: form.end_date ? zonedNaiveToUtcISO(form.end_date, form.timezone) : null,
      timezone: form.timezone,
      location: form.location || null,
      is_online: form.is_online,
      link_url: form.link_url || null,
      stream_url: form.is_online ? (form.link_url || null) : null,
      created_by: currentUserId,
      is_published: true,
      status: "upcoming",
    }).select().single();
    if (e) { setError(e.message); setSaving(false); return; }
    onCreated(data as CCBEvent);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>➕ Créer un événement</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Titre *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nom de l'événement" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Type</label>
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} style={{ ...inputStyle, appearance: "auto" as any }}>
              {Object.entries(TYPE_META).map(([key, m]) => (
                <option key={key} value={key}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Début *</label>
              <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Fin</label>
              <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Fuseau horaire de l&apos;événement</label>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} style={{ ...inputStyle, appearance: "auto" as any }}>
              {COMMON_TIMEZONES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
              {!COMMON_TIMEZONES.some((t) => t.id === form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
            </select>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>
              L&apos;heure saisie correspond à ce fuseau. Chaque membre la verra dans son fuseau local.
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Lieu</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Adresse ou nom du lieu" style={inputStyle} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setForm({ ...form, is_online: !form.is_online })}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: form.is_online ? "var(--gold)" : "var(--border)", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: form.is_online ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
            </button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Événement en ligne</span>
          </div>

          {form.is_online && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Lien de connexion</label>
              <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://zoom.us/... ou YouTube Live..." style={inputStyle} />
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez l'événement..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {error && <div style={{ color: "var(--error)", fontSize: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "11px", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
            <button onClick={save} disabled={saving} style={{ flex: 2, background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", border: "none", borderRadius: "var(--radius-full)", padding: "11px", color: "#000", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Enregistrement..." : "✅ Créer l'événement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EventsClient (main export) ───────────────────────────────
// Programme régulier éditable (CMS "events-programme") : emoji | titre | horaire | sous-titre | lien
function parseProgramme(md: string): { icon: string; title: string; time: string; sub: string; href: string; accent: string }[] {
  return md.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|").map((s) => s.trim());
    return { icon: p[0] || "📅", title: p[1] || "", time: p[2] || "", sub: p[3] || "", href: p[4] || "/events", accent: "var(--gold)" };
  }).filter((x) => x.title);
}

export default function EventsClient({ events: initialEvents, userRsvpMap: initialRsvpMap, rsvpCountMap: initialCountMap, currentUserId, isAdmin, programmeMd }: {
  events: CCBEvent[];
  userRsvpMap: Record<string, string>;
  rsvpCountMap: Record<string, { going: number; maybe: number }>;
  currentUserId: string;
  isAdmin: boolean;
  programmeMd: string;
}) {
  const [events, setEvents] = useState<CCBEvent[]>(initialEvents);
  const [rsvpMap, setRsvpMap] = useState<Record<string, string>>(initialRsvpMap);
  const [countMap, setCountMap] = useState<Record<string, { going: number; maybe: number }>>(initialCountMap);
  const [filter, setFilter] = useState<"upcoming" | "past" | "mine">("upcoming");
  const [showModal, setShowModal] = useState(false);

  const now = new Date();

  const filtered = events.filter((e) => {
    const d = new Date(e.event_date);
    if (filter === "upcoming") return d >= now;
    if (filter === "past")     return d < now;
    if (filter === "mine")     return !!rsvpMap[e.id];
    return true;
  });

  function handleRsvp(eventId: string, status: string | null) {
    setRsvpMap((prev) => {
      const next = { ...prev };
      const old = next[eventId];
      if (status === null) delete next[eventId];
      else next[eventId] = status;
      setCountMap((c) => {
        const cur = c[eventId] ?? { going: 0, maybe: 0 };
        const updated = { ...cur };
        if (old === "going")   updated.going  = Math.max(0, updated.going  - 1);
        if (old === "maybe")   updated.maybe  = Math.max(0, updated.maybe  - 1);
        if (status === "going")  updated.going++;
        if (status === "maybe")  updated.maybe++;
        return { ...c, [eventId]: updated };
      });
      return next;
    });
  }

  const upcomingCount = events.filter((e) => new Date(e.event_date) >= now).length;
  const myCount       = events.filter((e) => !!rsvpMap[e.id]).length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "13px 16px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", overflowX: "auto" }}>
          <button style={tabStyle(filter === "upcoming")} onClick={() => setFilter("upcoming")}>
            📅 À venir {upcomingCount > 0 ? `(${upcomingCount})` : ""}
          </button>
          <button style={tabStyle(filter === "past")} onClick={() => setFilter("past")}>🕐 Passés</button>
          <button style={tabStyle(filter === "mine")} onClick={() => setFilter("mine")}>
            ✅ Mes inscriptions {myCount > 0 ? `(${myCount})` : ""}
          </button>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} style={{
              marginLeft: "auto", flexShrink: 0,
              background: "linear-gradient(135deg, var(--violet-dark), var(--violet-light))",
              border: "none", borderRadius: "var(--radius-full)", padding: "6px 14px",
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-body)", margin: "8px 16px 8px auto",
            }}>➕ Créer</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 32px" }}>

      {/* Programme régulier — toujours visible dans l'onglet "À venir" */}
      {filter === "upcoming" && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            📆 Programme régulier
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {parseProgramme(programmeMd).map((item) => (
              <div key={item.title} style={{
                display: "flex", gap: 14, alignItems: "center",
                background: "var(--card-bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)", padding: "14px 16px",
              }}>
                <div style={{
                  background: `${item.accent}18`, border: `1px solid ${item.accent}40`,
                  borderRadius: "var(--radius-lg)", padding: "10px 12px",
                  textAlign: "center", flexShrink: 0, fontSize: 22,
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: item.accent, fontWeight: 600, marginBottom: 2 }}>{item.time}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.sub}</div>
                </div>
                <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{
                    background: `${item.accent}18`, border: `1px solid ${item.accent}40`,
                    color: item.accent, borderRadius: "var(--radius-full)", padding: "6px 14px",
                    fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                  Rejoindre →
                </a>
              </div>
            ))}
          </div>

          <div style={{ borderBottom: "1px solid var(--border-subtle)", margin: "20px 0 0" }} />
          {upcomingCount > 0 && (
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 12px" }}>
              🎉 Événements ponctuels
            </h2>
          )}
        </div>
      )}

      {/* Events list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{filter === "mine" ? "🎟️" : filter === "past" ? "📂" : "🎉"}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {filter === "mine" ? "Vous n'êtes inscrit à aucun événement." : filter === "past" ? "Aucun événement passé." : "Aucun événement ponctuel programmé. Consultez le programme régulier ci-dessus."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              userRsvp={rsvpMap[event.id]}
              goingCount={countMap[event.id]?.going ?? 0}
              maybeCount={countMap[event.id]?.maybe ?? 0}
              currentUserId={currentUserId}
              onRsvp={handleRsvp}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateEventModal
          currentUserId={currentUserId}
          onCreated={(event) => setEvents((prev) => [event, ...prev])}
          onClose={() => setShowModal(false)}
        />
      )}
      </div>
    </div>
  );
}
