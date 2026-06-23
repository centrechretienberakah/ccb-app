"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { MemberStats } from "@/lib/community/gamification";

interface Props {
  userId: string;
  displayName: string | null;
  role: string | null;
  stats: MemberStats;
  xp: number;
  rankLabel: string;
  lastSeenAt: string | null;
  createdAt: string | null;
}

interface AuthInfo { email: string | null; phone: string | null; created_at: string | null; last_sign_in_at: string | null; confirmed: boolean; provider: string | null; }
interface Note { id: string; content: string; created_at: string; author_id: string | null; }
interface Audit { id: string; action: string; details: Record<string, unknown>; created_at: string; actor_id: string | null; }
interface CourseProg { id: string; title: string; completed: number; total: number; pct: number; }
interface Overview {
  donations: { totalXaf: number; count: number; pending: number; byMode: Record<string, number>; last: { amount_native: number; currency: string; payment_mode: string | null; status: string; created_at: string } | null };
  formations: { courses: CourseProg[]; lessonsCompleted: number; certificates: number };
  bible: { chaptersRead: number; readingDays: number; plansTotal: number; plansActive: number };
  prayers: { posted: number; answered: number };
  session: { ip: string | null; user_agent: string | null; device: string | null; browser: string | null; created_at: string } | null;
}

const MODE_LABEL: Record<string, string> = {
  paypal: "PayPal", notchpay: "Notch Pay", "mtn-momo": "MTN MoMo", "orange-money": "Orange Money",
  stripe: "Stripe", manual: "Manuel", "iban-be": "Virement", autre: "Autre",
};
function xaf(n: number): string { return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA"; }

const ROLE_OPTIONS = [
  { v: "member", l: "🌱 Membre" },
  { v: "premium_member", l: "💎 Premium" },
  { v: "moderator", l: "🛡 Modérateur" },
  { v: "leader", l: "⭐ Leader" },
  { v: "admin", l: "👑 Admin" },
  { v: "owner", l: "⚜ Owner" },
];
const STATUS_OPTIONS = [
  { v: "active", l: "🟢 Actif" },
  { v: "inactive", l: "🟡 Inactif" },
  { v: "suspended", l: "🔴 Suspendu" },
  { v: "banned", l: "⚫ Banni" },
];
const FOLLOW_OPTIONS = [
  { v: "none", l: "🟢 Aucun" },
  { v: "light", l: "🟡 Léger" },
  { v: "regular", l: "🟠 Régulier" },
  { v: "priority", l: "🔴 Prioritaire" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

// Score d'engagement (0-100) basé sur présence, lectures, participation,
// prières et formations (le détail formations/bible s'ajoute après chargement).
function engagementScore(stats: MemberStats, xp: number, lastSeenAt: string | null, ov?: Overview | null): { score: number; label: string } {
  let s = 0;
  s += Math.min(24, stats.posts * 3);
  s += Math.min(16, stats.comments * 2);
  s += Math.min(12, stats.prayersPosted * 3);
  s += Math.min(12, stats.testimonies * 5);
  s += Math.min(8, Math.floor(xp / 100));
  // récence (présence)
  if (lastSeenAt) {
    const days = (Date.now() - new Date(lastSeenAt).getTime()) / 86400000;
    if (days < 2) s += 8; else if (days < 7) s += 5; else if (days < 30) s += 2;
  }
  // lectures + formations + générosité (si chargé)
  if (ov) {
    s += Math.min(10, ov.bible.readingDays);
    s += Math.min(8, ov.formations.lessonsCompleted * 2);
    s += Math.min(2, ov.donations.count * 2);
  }
  const score = Math.max(0, Math.min(100, Math.round(s)));
  const label = score >= 80 ? "Excellent disciple" : score >= 55 ? "Bon engagement" : score >= 30 ? "Engagement modéré" : "Faible engagement";
  return { score, label };
}

export default function AdminMemberPanel({ userId, displayName, role, stats, xp, rankLabel, lastSeenAt, createdAt }: Props) {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [meta, setMeta] = useState<{ status: string; follow_level: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [curRole, setCurRole] = useState(role ?? "member");
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const eng = engagementScore(stats, xp, lastSeenAt, overview);
  const inactiveDays = lastSeenAt ? Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 86400000) : null;

  const alerts: string[] = [];
  if (inactiveDays !== null && inactiveDays >= 30) alerts.push(`Inactif depuis ${inactiveDays} jours`);
  if (eng.score < 30) alerts.push("Faible engagement");
  if (stats.posts === 0 && stats.comments === 0) alerts.push("Aucune contribution");
  if (overview && overview.bible.plansTotal === 0) alerts.push("Aucun plan biblique");
  if (meta?.follow_level === "priority") alerts.push("Suivi pastoral prioritaire");

  async function loadAll() {
    try {
      const sb = createClient();
      const [{ data: m }, { data: n }, { data: a }] = await Promise.all([
        sb.from("member_admin_meta").select("status, follow_level").eq("user_id", userId).maybeSingle(),
        sb.from("member_pastoral_notes").select("id, content, created_at, author_id").eq("user_id", userId).order("created_at", { ascending: false }),
        sb.from("member_admin_audit").select("id, action, details, created_at, actor_id").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      setMeta((m as { status: string; follow_level: string } | null) ?? { status: "active", follow_level: "none" });
      setNotes((n ?? []) as Note[]);
      setAudit((a ?? []) as Audit[]);
    } catch { /* tables v55 pas migrées */ setMeta({ status: "active", follow_level: "none" }); }
    try {
      const res = await fetch(`/api/admin/member/${userId}/auth`);
      if (res.ok) setAuthInfo(await res.json());
    } catch { /* noop */ }
    try {
      const res = await fetch(`/api/admin/member/${userId}/overview`);
      if (res.ok) setOverview(await res.json());
    } catch { /* noop */ }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recharge au changement de membre uniquement
  useEffect(() => { void loadAll(); }, [userId]);

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(""), 2500); }

  async function setRole(r: string) {
    if (busy) return; setBusy(true);
    try { const sb = createClient(); const { error } = await sb.rpc("admin_set_member_role", { p_target: userId, p_role: r });
      if (error) flash("Erreur : " + error.message); else { setCurRole(r); flash("✅ Rôle mis à jour"); void loadAll(); } }
    catch { flash("Erreur"); } setBusy(false);
  }
  async function setStatus(s: string) {
    if (busy) return; setBusy(true);
    try { const sb = createClient(); const { error } = await sb.rpc("admin_set_member_status", { p_target: userId, p_status: s });
      if (error) flash("Erreur : " + error.message); else { setMeta((p) => ({ status: s, follow_level: p?.follow_level ?? "none" })); flash("✅ Statut mis à jour"); } }
    catch { flash("Erreur"); } setBusy(false);
  }
  async function setFollow(l: string) {
    if (busy) return; setBusy(true);
    try { const sb = createClient(); const { error } = await sb.rpc("admin_set_follow_level", { p_target: userId, p_level: l });
      if (error) flash("Erreur : " + error.message); else { setMeta((p) => ({ status: p?.status ?? "active", follow_level: l })); flash("✅ Suivi mis à jour"); } }
    catch { flash("Erreur"); } setBusy(false);
  }
  async function addNote() {
    if (busy || noteText.trim().length < 1) return; setBusy(true);
    try { const sb = createClient(); const { error } = await sb.rpc("admin_add_pastoral_note", { p_target: userId, p_content: noteText.trim() });
      if (error) flash("Erreur : " + error.message); else { setNoteText(""); flash("✅ Note ajoutée"); void loadAll(); } }
    catch { flash("Erreur"); } setBusy(false);
  }
  async function deleteNote(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    try { const sb = createClient(); await sb.from("member_pastoral_notes").delete().eq("id", id);
      setNotes((p) => p.filter((x) => x.id !== id)); } catch { /* noop */ }
  }
  async function openConv(mode?: "audio" | "video") {
    if (busy) return; setBusy(true);
    try {
      const sb = createClient();
      const { data, error } = await sb.rpc("get_or_create_dm", { p_other: userId });
      if (!error && typeof data === "string") {
        router.push(mode ? `/community/messages/${data}/call${mode === "audio" ? "?mode=audio" : ""}` : `/community/messages/${data}`);
        return;
      }
    } catch { /* noop */ }
    setBusy(false);
  }
  async function resetPassword() {
    if (busy) return;
    if (!confirm("Envoyer un email de réinitialisation du mot de passe à ce membre ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/member/${userId}/reset-password`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      flash(res.ok ? "✅ Email de réinitialisation envoyé" : "Erreur : " + (j.error || res.status));
    } catch { flash("Erreur réseau"); }
    setBusy(false);
  }
  async function deleteAccount() {
    const name = displayName || "ce membre";
    if (!confirm(`⚠ Supprimer définitivement le compte de ${name} ?\n\nCette action est IRRÉVERSIBLE : profil, publications, messages et données seront effacés.`)) return;
    if (!confirm("Dernière confirmation : supprimer définitivement ce compte ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { flash("✅ Compte supprimé"); setTimeout(() => router.push("/community/membres"), 1200); }
      else flash("Erreur : " + (j.error || res.status));
    } catch { flash("Erreur réseau"); }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {msg && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: T.violet, color: "#fff", padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 999, boxShadow: T.shadowMd }}>{msg}</div>}

      {/* Bandeau admin */}
      <div style={{ background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, color: "#fff", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>👑</span>
        <div>
          <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 15 }}>Administration du membre</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Visible uniquement par les administrateurs</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <QuickAct emoji="📩" label="Message" onClick={() => openConv()} disabled={busy} />
        <QuickAct emoji="📞" label="Appeler" onClick={() => openConv("audio")} disabled={busy} />
        <QuickAct emoji="🎥" label="Réunion" onClick={() => openConv("video")} disabled={busy} />
        {authInfo?.email && <QuickAct emoji="📧" label="Email" href={`mailto:${authInfo.email}`} />}
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${T.gold}`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: T.goldDark, fontWeight: 600 }}>⚠ {a}</div>
          ))}
        </div>
      )}

      {/* Identité */}
      <Card title="🪪 Identité">
        <Row k="Nom" v={displayName || "—"} />
        <Row k="Email" v={authInfo?.email || "—"} />
        <Row k="Téléphone" v={authInfo?.phone || "—"} />
        <Row k="Inscrit le" v={fmt(authInfo?.created_at || createdAt)} />
        <Row k="Dernière connexion" v={fmt(authInfo?.last_sign_in_at ?? null)} />
        <Row k="Méthode" v={authInfo?.provider || "email"} />
        <Row k="Compte confirmé" v={authInfo ? (authInfo.confirmed ? "✅ Oui" : "❌ Non") : "—"} />

        {/* Identité technique (session récente) */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Session récente</div>
          <Row k="Adresse IP" v={overview?.session?.ip || "—"} />
          <Row k="Appareil" v={overview?.session?.device || "—"} />
          <Row k="Navigateur" v={overview?.session?.browser || "—"} />
          <Row k="Vue le" v={fmt(overview?.session?.created_at ?? null)} />
        </div>

        <button onClick={resetPassword} disabled={busy}
          style={{ marginTop: 10, width: "100%", background: T.bg, color: T.gold, border: `1px solid ${T.violet}`, borderRadius: 10, padding: "9px", fontWeight: 700, fontSize: 12.5, cursor: busy ? "wait" : "pointer" }}>
          🔑 Réinitialiser le mot de passe
        </button>
      </Card>

      {/* Score d'engagement */}
      <Card title="📊 Engagement spirituel">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ position: "relative", width: 74, height: 74, flexShrink: 0 }}>
            <svg width="74" height="74" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="37" cy="37" r="32" fill="none" stroke={T.surface2} strokeWidth="7" />
              <circle cx="37" cy="37" r="32" fill="none" stroke={T.gold} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - eng.score / 100)}`} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.title, fontWeight: 800, fontSize: 18, color: T.gold }}>{eng.score}%</div>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{eng.label}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>Basé sur publications, prières, témoignages, XP et récence.</div>
          </div>
        </div>
      </Card>

      {/* Statistiques spirituelles */}
      <Card title="📈 Statistiques spirituelles">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Mini k="🌱 Rang" v={rankLabel} />
          <Mini k="⭐ XP total" v={String(xp)} />
          <Mini k="📝 Publications" v={String(stats.posts)} />
          <Mini k="💬 Commentaires" v={String(stats.comments)} />
          <Mini k="🙏 Prières publiées" v={String(overview?.prayers.posted ?? stats.prayersPosted)} />
          <Mini k="🙏 Prières exaucées" v={overview ? String(overview.prayers.answered) : "—"} />
          <Mini k="✨ Témoignages" v={String(stats.testimonies)} />
          <Mini k="❤️ Likes reçus" v={String(stats.likesReceived)} />
          <Mini k="📖 Chapitres lus" v={overview ? String(overview.bible.chaptersRead) : "—"} />
          <Mini k="📅 Jours de lecture" v={overview ? String(overview.bible.readingDays) : "—"} />
          <Mini k="📚 Plans bibliques" v={overview ? `${overview.bible.plansActive}/${overview.bible.plansTotal}` : "—"} />
          <Mini k="🎓 Formations suivies" v={overview ? String(overview.formations.courses.length) : "—"} />
          <Mini k="🎓 Leçons terminées" v={overview ? String(overview.formations.lessonsCompleted) : "—"} />
          <Mini k="🏆 Certificats" v={overview ? String(overview.formations.certificates) : "—"} />
        </div>
      </Card>

      {/* Formations (Institut) */}
      <Card title="🎓 Formations">
        {!overview ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Chargement…</div>
        ) : overview.formations.courses.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Aucune formation suivie.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {overview.formations.courses.map((c) => (
              <div key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: T.textSoft, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.completed >= c.total && c.total > 0 ? "🏆 " : ""}{c.title}
                  </span>
                  <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0 }}>{c.completed}/{c.total} · {c.pct}%</span>
                </div>
                <div style={{ height: 6, background: T.surface2, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.pct}%`, background: `linear-gradient(90deg, ${T.violet}, ${T.gold})`, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dons */}
      <Card title="💝 Dons">
        {!overview ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Chargement…</div>
        ) : overview.donations.count === 0 && overview.donations.pending === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Aucun don enregistré.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <Mini k="Total donné" v={xaf(overview.donations.totalXaf)} />
              <Mini k="Dons confirmés" v={String(overview.donations.count)} />
            </div>
            {overview.donations.last && (
              <Row k="Dernier don" v={`${new Intl.NumberFormat("fr-FR").format(overview.donations.last.amount_native)} ${overview.donations.last.currency} · ${fmt(overview.donations.last.created_at)}`} />
            )}
            {Object.keys(overview.donations.byMode).length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${T.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Modes de paiement</div>
                {Object.entries(overview.donations.byMode).map(([m, amt]) => (
                  <Row key={m} k={MODE_LABEL[m] || m} v={xaf(amt)} />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Rôle + statut + suivi */}
      <Card title="⚙️ Gestion">
        <Selector label="Rôle (RBAC)" value={curRole} options={ROLE_OPTIONS} onChange={setRole} busy={busy} />
        <Selector label="Statut du compte" value={meta?.status ?? "active"} options={STATUS_OPTIONS} onChange={setStatus} busy={busy} />
        <Selector label="Niveau de suivi pastoral" value={meta?.follow_level ?? "none"} options={FOLLOW_OPTIONS} onChange={setFollow} busy={busy} />
      </Card>

      {/* Notes pastorales */}
      <Card title="📝 Notes pastorales (privées)">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ajouter une note pastorale…"
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
            style={{ flex: 1, padding: "9px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, fontFamily: F.body, outline: "none" }} />
          <button onClick={addNote} disabled={busy || !noteText.trim()} style={{ background: T.violet, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !noteText.trim() ? 0.5 : 1 }}>Ajouter</button>
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Aucune note pour le moment.</div>
        ) : notes.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 0", borderTop: `1px solid ${T.borderSoft}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.5 }}>{n.content}</div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>{fmt(n.created_at)}</div>
            </div>
            <button onClick={() => deleteNote(n.id)} title="Supprimer" style={{ background: "none", border: "none", color: "#C24B7A", cursor: "pointer", fontSize: 13 }}>🗑</button>
          </div>
        ))}
      </Card>

      {/* Audit */}
      <Card title="🔒 Journal d'audit">
        {audit.length === 0 ? (
          <div style={{ fontSize: 12.5, color: T.textMuted, fontStyle: "italic" }}>Aucune action enregistrée.</div>
        ) : audit.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: `1px solid ${T.borderSoft}`, fontSize: 12 }}>
            <span style={{ color: T.textSoft }}>{labelAction(a.action, a.details)}</span>
            <span style={{ color: T.textMuted, flexShrink: 0 }}>{fmt(a.created_at)}</span>
          </div>
        ))}
      </Card>

      {/* Zone sensible */}
      <div style={{ background: "rgba(194,75,122,0.06)", border: "1px solid #C24B7A", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#C24B7A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>⚠ Zone sensible</div>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
          La suppression du compte est définitive et irréversible. Préférez « Suspendre » ou « Bannir » pour une mesure réversible.
        </p>
        <button onClick={deleteAccount} disabled={busy}
          style={{ background: "#C24B7A", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
          🗑 Supprimer le compte
        </button>
      </div>
    </div>
  );
}

function QuickAct({ emoji, label, onClick, href, disabled }: { emoji: string; label: string; onClick?: () => void; href?: string; disabled?: boolean }) {
  const style: React.CSSProperties = {
    flex: "1 1 0", minWidth: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 6px",
    fontSize: 11, fontWeight: 700, color: T.textSoft, cursor: disabled ? "wait" : "pointer", textDecoration: "none",
  };
  const inner = <><span style={{ fontSize: 18 }}>{emoji}</span>{label}</>;
  if (href) return <a href={href} style={style}>{inner}</a>;
  return <button onClick={onClick} disabled={disabled} style={style}>{inner}</button>;
}

function labelAction(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case "role_change": return `Rôle : ${details.from ?? "?"} → ${details.to ?? "?"}`;
    case "status_change": return `Statut → ${details.status}`;
    case "follow_level": return `Suivi → ${details.level}`;
    case "note_add": return "Note pastorale ajoutée";
    default: return action;
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: T.textMuted }}>{k}</span>
      <span style={{ color: T.text, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}
function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontFamily: F.title, fontWeight: 700, fontSize: 15, color: T.text }}>{v}</div>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{k}</div>
    </div>
  );
}
function Selector({ label, value, options, onChange, busy }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void; busy: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <select value={value} disabled={busy} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, fontFamily: F.body, cursor: "pointer", outline: "none" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
