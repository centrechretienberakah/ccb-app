"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOnlineUsers } from "@/lib/presence";
import ResourceTab, { ColumnDef } from "./ResourceTab";
import SiteContentTab from "./SiteContentTab";
import AnalyticsTab, { type AnalyticsData } from "./AnalyticsTab";
import DataAdminTab from "./DataAdminTab";
import BroadcastNotification from "./BroadcastNotification";
import { can, ROLE_LABEL, ROLE_BADGE, type Role } from "@/lib/rbac";

interface Stats {
  totalMembers: number; newMembersWeek: number; totalPosts: number;
  openPrayers: number; totalEvents: number; totalDevotions: number;
  newContacts: number; pendingRdv: number;
}
interface Member {
  id: string; full_name: string; role: string; spiritual_level?: string | null;
  created_at: string; country?: string | null; city?: string | null;
  is_disabled?: boolean; last_sign_in_at?: string | null; last_seen_at?: string | null;
}
interface Post { id: string; content: string; created_at: string; user_id: string; is_pinned?: boolean; post_type?: string | null; }
interface Prayer { id: string; title?: string | null; content?: string | null; is_answered: boolean; created_at: string; user_id: string; is_anonymous?: boolean; category?: string | null; }
interface Devotion { id: string; devotion_date: string; title: string; verse_reference: string; verse_text?: string | null; }
interface ContactMsg { id: string; full_name: string; email: string; phone?: string | null; subject: string; message: string; is_read: boolean; created_at: string; }
interface RdvItem { id: string; full_name: string; phone: string; email?: string | null; subject: string; message?: string | null; preferred_date: string; preferred_time: string; modality: string; status: string; created_at: string; }
interface Profile { id: string; full_name: string; }

interface AdminLog {
  id: string; actor_id: string | null; actor_role: string | null;
  action: string; target_type: string | null; target_id: string | null;
  details: Record<string, unknown> | null; created_at: string;
}

interface AdminClientProps {
  adminName: string; isAdmin: boolean; isOwner: boolean; currentRole: string;
  stats: Stats;
  members: Member[]; posts: Post[]; postProfiles: Profile[];
  prayers: Prayer[]; prayerProfiles: Profile[];
  devotions: Devotion[];
  events: Record<string, unknown>[];
  contacts: ContactMsg[];
  rdvList: RdvItem[];
  media: Record<string, unknown>[];
  courses?: Record<string, unknown>[];
  sermons?: Record<string, unknown>[];
  albums: Record<string, unknown>[];
  groups?: Record<string, unknown>[];
  siteContent: Record<string, unknown>[];
  adminLogs: AdminLog[];
  testimonies: Record<string, unknown>[];
  analytics: AnalyticsData;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function roleBadge(role: string) {
  const r = (role as Role) || "member";
  const badge = ROLE_BADGE[r] ?? ROLE_BADGE.member;
  const label = ROLE_LABEL[r] ?? "Membre";
  return { label, bg: badge.bg, color: badge.color };
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" };
const sectionTitle: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 1rem" };

export default function AdminClient({
  adminName, isAdmin, isOwner, currentRole, stats,
  members: initialMembers, posts: initialPosts, postProfiles,
  prayers: initialPrayers, prayerProfiles,
  devotions: initialDevotions,
  contacts: initialContacts,
  rdvList: initialRdv,
  events: initialEvents,
  media, albums, siteContent,
  adminLogs, testimonies, analytics,
}: AdminClientProps) {
  type Tab =
    | "overview" | "analytics" | "data" | "members" | "posts" | "prayers" | "devotions"
    | "contacts" | "rdv"
    | "media" | "albums" | "events"
    | "testimonies"
    | "content" | "activity";
  const onlineSet = useOnlineUsers();
  // currentRole peut être 'owner' | 'admin' | 'moderator' | 'leader' | 'member' | 'premium_member'
  const canDeleteUser    = can(currentRole, "user.delete");
  const canChangeRole    = can(currentRole, "user.change_role");
  const canChangeOwner   = can(currentRole, "user.change_role_owner");
  const canDisableUser   = can(currentRole, "user.disable");
  const canInviteUser    = can(currentRole, "user.invite");
  const canViewAuditLog  = can(currentRole, "admin.view_audit_log");
  const canEditSettings  = can(currentRole, "settings.edit");
  // Silence "unused props" pour les flags hérités
  void isAdmin; void isOwner;
  // Calcul figé au mount du composant pour éviter Date.now() en render.
  const [twoMinutesAgo] = useState(() => new Date(Date.now() - 2 * 60_000).toISOString());
  const [tab, setTab] = useState<Tab>("overview");
  const [members, setMembers] = useState(initialMembers);
  const [memberSearch, setMemberSearch] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const [prayers, setPrayers] = useState(initialPrayers);
  const [devotions, setDevotions] = useState(initialDevotions);
  const [contacts, setContacts] = useState(initialContacts);
  const [rdvList, setRdvList] = useState(initialRdv);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [expandedRdv, setExpandedRdv] = useState<string | null>(null);
  const [showDevotionForm, setShowDevotionForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [devMsg, setDevMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    devotion_date: new Date().toISOString().split("T")[0],
    title: "", verse_reference: "", verse_text: "",
    meditation_p1: "", meditation_p2: "", meditation_p3: "",
    reflection_question: "", prayer: "", declaration: ""
  });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const logAction = async (sb: ReturnType<typeof createClient>, action: string, targetType?: string, targetId?: string, details?: Record<string, unknown>) => {
    try {
      await sb.rpc("log_admin_action", { p_action: action, p_target_type: targetType ?? null, p_target_id: targetId ?? null, p_details: details ?? null });
    } catch { /* RPC pas encore migrée — silencieux */ }
  };

  const changeRole = async (memberId: string, newRole: string) => {
    const sb = createClient();
    const oldRole = members.find(m => m.id === memberId)?.role;
    const { error } = await sb.from("user_roles").upsert({ user_id: memberId, role: newRole }, { onConflict: "user_id" });
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      showToast("Rôle mis à jour ✓");
      logAction(sb, "role.change", "user", memberId, { from: oldRole, to: newRole });
    }
  };

  const toggleDisable = async (memberId: string, disable: boolean) => {
    const sb = createClient();
    const { error } = await sb.from("user_profiles").update({ is_disabled: disable }).eq("user_id", memberId);
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_disabled: disable } : m));
      showToast(disable ? "Compte désactivé ✓" : "Compte réactivé ✓");
      logAction(sb, disable ? "user.disable" : "user.enable", "user", memberId);
    } else showToast("❌ " + error.message);
  };

  const hardDelete = async (memberId: string, name: string) => {
    if (!confirm(`Supprimer DÉFINITIVEMENT le compte de "${name}" et toutes ses données ? Cette action est irréversible.`)) return;
    if (!confirm(`Confirmer la suppression définitive de "${name}" ?`)) return;
    const sb = createClient();
    const res = await fetch(`/api/admin/users/${memberId}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) { showToast("❌ " + (body.error || "Erreur")); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    showToast("Compte supprimé ✓");
    logAction(sb, "user.delete", "user", memberId, { name });
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const inviteUser = async () => {
    if (!inviteEmail) { showToast("Email requis"); return; }
    setInviting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, display_name: inviteName || undefined }),
    });
    const body = await res.json();
    setInviting(false);
    if (!res.ok) { showToast("❌ " + (body.error || "Erreur")); return; }
    const sb = createClient();
    logAction(sb, "user.invite", "user", body.user?.id, { email: inviteEmail });
    setInviteEmail(""); setInviteName("");
    showToast("Invitation envoyée ✓");
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Supprimer cette publication définitivement ?")) return;
    const sb = createClient();
    const { error } = await sb.from("posts").delete().eq("id", postId);
    if (!error) { setPosts(prev => prev.filter(p => p.id !== postId)); showToast("Publication supprimée ✓"); }
  };

  const closePrayer = async (prayerId: string) => {
    const sb = createClient();
    const { error } = await sb.from("prayer_requests").update({ is_answered: true }).eq("id", prayerId);
    if (!error) { setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, is_answered: true } : p)); showToast("Prière marquée répondue ✓"); }
  };

  const markContactRead = async (id: string) => {
    const sb = createClient();
    await sb.from("contact_messages").update({ is_read: true }).eq("id", id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, is_read: true } : c));
  };

  const updateRdvStatus = async (id: string, status: string) => {
    const sb = createClient();
    const { error } = await sb.from("pastoral_appointments").update({ status }).eq("id", id);
    if (!error) { setRdvList(prev => prev.map(r => r.id === id ? { ...r, status } : r)); showToast(`RDV ${status === "confirmed" ? "confirmé" : status === "cancelled" ? "annulé" : "mis à jour"} ✓`); }
  };

  const saveDevotion = async () => {
    if (!form.title || !form.verse_reference || !form.verse_text || !form.meditation_p1 || !form.prayer || !form.declaration) {
      setDevMsg({ type: "error", text: "Remplissez tous les champs obligatoires (*)." }); return;
    }
    setSaving(true); setDevMsg(null);
    const sb = createClient();
    const basePayload: Record<string, unknown> = {
      devotion_date: form.devotion_date, title: form.title, verse_reference: form.verse_reference,
      verse_text: form.verse_text, meditation_p1: form.meditation_p1, meditation_p2: form.meditation_p2 || null,
      meditation_p3: form.meditation_p3 || null, reflection_question: form.reflection_question || null,
      prayer: form.prayer, declaration: form.declaration,
    };

    // Tentative 1 : avec author (si la colonne existe en prod)
    let res = await sb.from("devotions").insert({ ...basePayload, author: adminName }).select().single();

    // Tentative 2 : retry sans author si erreur "schema cache" (colonne absente)
    // L'erreur Supabase est : "Could not find the 'author' column of 'devotions' in the schema cache"
    if (res.error && /author/i.test(res.error.message)) {
      res = await sb.from("devotions").insert(basePayload).select().single();
    }

    if (res.error) {
      setDevMsg({ type: "error", text: res.error.message });
      setSaving(false);
      return;
    }

    setDevotions(prev => [res.data, ...prev]);

    // ── Envoie une notification push à tous les abonnés ──
    let pushFeedback = "";
    try {
      const notifRes = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `☀️ Méditons ensemble — ${form.title}`,
          body: `${form.verse_reference} · ${form.verse_text.slice(0, 80)}${form.verse_text.length > 80 ? "…" : ""}`,
          url: "/dashboard",
        }),
      });
      const notifBody = await notifRes.json();
      if (notifRes.ok) {
        pushFeedback = ` 🔔 ${notifBody.sent} notification(s) envoyée(s)${notifBody.failed > 0 ? `, ${notifBody.failed} échec(s)` : ""}.`;
      } else {
        pushFeedback = ` ⚠ Push non envoyé : ${notifBody.error ?? "erreur inconnue"}`;
      }
    } catch {
      pushFeedback = " ⚠ Push non envoyé (réseau).";
    }

    setDevMsg({ type: "success", text: "Méditation publiée avec succès !" + pushFeedback });
    setForm({ devotion_date: new Date().toISOString().split("T")[0], title: "", verse_reference: "", verse_text: "", meditation_p1: "", meditation_p2: "", meditation_p3: "", reflection_question: "", prayer: "", declaration: "" });
    setTimeout(() => { setShowDevotionForm(false); setDevMsg(null); }, 3500);
    setSaving(false);
  };

  const filteredMembers = members.filter(m => !memberSearch || m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || m.country?.toLowerCase().includes(memberSearch.toLowerCase()));
  const nameFor = (profiles: Profile[], userId: string) => profiles.find(p => p.id === userId)?.full_name ?? "Membre";

  const unreadContacts = contacts.filter(c => !c.is_read).length;
  const pendingRdvCount = rdvList.filter(r => r.status === "pending").length;

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "overview",  label: "Aperçu" },
    { id: "analytics", label: "📊 Statistiques" },
    { id: "data",      label: "📉 Données" },
    { id: "members",   label: `Membres (${stats.totalMembers})` },
    { id: "posts",     label: `Publications (${stats.totalPosts})` },
    { id: "prayers",   label: `Prières (${stats.openPrayers})` },
    { id: "devotions", label: `Méditations (${stats.totalDevotions})` },
    { id: "events",    label: `📅 Événements` },
    { id: "media",     label: `📚 Bibliothèque` },
    { id: "albums",    label: `🖼️ Galerie` },
    { id: "testimonies", label: `✨ Témoignages (${testimonies.length})` },
    { id: "content",   label: `📝 Pages (CMS)`, hidden: !canEditSettings },
    { id: "contacts",  label: unreadContacts > 0 ? `📬 Messages (${unreadContacts} non lus)` : `Messages (${contacts.length})` },
    { id: "rdv",       label: pendingRdvCount > 0 ? `🗓️ RDV (${pendingRdvCount} en attente)` : `RDV (${rdvList.length})` },
    { id: "activity",  label: `🛡 Activité`, hidden: !canViewAuditLog },
  ];

  const lastSignInLabel = (iso: string | null | undefined) => {
    if (!iso) return "Jamais";
    return timeAgo(iso);
  };
  const isOnline = (id: string, lastSeen?: string | null) => {
    if (onlineSet.has(id)) return true;
    if (!lastSeen) return false;
    return lastSeen >= twoMinutesAgo;
  };

  // Colonnes des ressources gérables (ResourceTab)
  const mediaCols: ColumnDef[] = [
    { key: "title", label: "Titre", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", hiddenInList: true },
    { key: "type", label: "Type", type: "select", options: ["pdf","audio","video","ebook","document"], required: true, defaultValue: "pdf" },
    { key: "category", label: "Catégorie", type: "text", defaultValue: "general" },
    { key: "file_url", label: "URL fichier", type: "url", required: true },
    { key: "thumbnail_url", label: "Vignette", type: "url", hiddenInList: true },
    { key: "is_premium", label: "Premium", type: "boolean" },
    { key: "is_published", label: "Publié", type: "boolean", defaultValue: true },
  ];
  const albumCols: ColumnDef[] = [
    { key: "title", label: "Titre", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea", hiddenInList: true },
    { key: "cover_url", label: "Cover URL", type: "url" },
    { key: "is_public", label: "Public", type: "boolean", defaultValue: true },
  ];
  const testimonyCols: ColumnDef[] = [
    { key: "title", label: "Titre", type: "text", required: true },
    { key: "content", label: "Contenu", type: "textarea", required: true, hiddenInList: true },
    { key: "category", label: "Catégorie", type: "select", options: ["healing","salvation","provision","family","deliverance","other"], defaultValue: "healing" },
    { key: "media_url", label: "Média", type: "url", hiddenInList: true },
    { key: "is_approved", label: "Approuvé", type: "boolean" },
    { key: "is_featured", label: "Mis en avant", type: "boolean" },
  ];
  const eventCols: ColumnDef[] = [
    { key: "title", label: "Titre", type: "text", required: true },
    { key: "subtitle", label: "Sous-titre", type: "text", hiddenInList: true },
    { key: "description", label: "Description", type: "textarea", hiddenInList: true },
    { key: "event_date", label: "Date", type: "datetime", required: true },
    { key: "end_date", label: "Fin", type: "datetime", hiddenInList: true },
    { key: "location", label: "Lieu", type: "text" },
    { key: "is_online", label: "En ligne", type: "boolean" },
    { key: "stream_url", label: "Stream URL", type: "url", hiddenInList: true },
    { key: "image_url", label: "Image", type: "url", hiddenInList: true },
    { key: "status", label: "Statut", type: "select", options: ["draft","upcoming","live","past","cancelled"], defaultValue: "upcoming" },
    { key: "is_published", label: "Publié", type: "boolean", defaultValue: true },
  ];

  const modalityLabel: Record<string, string> = { presentiel: "🏛️ Présentiel", visio: "📹 Visio", telephone: "📞 Téléphone" };
  const rdvStatusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", label: "⏳ En attente" },
    confirmed: { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "✓ Confirmé" },
    cancelled: { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", label: "✕ Annulé" },
    done:      { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "✅ Effectué" },
  };

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)" }}>

      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "#1a0a00", padding: "0.65rem 1.5rem", borderRadius: "9999px", fontWeight: 700, fontSize: "0.88rem", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#f5f0e8", borderBottom: "1px solid #d9cdb8" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Centre Chrétien Berakah</p>
              <h1 style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "1.35rem", color: "var(--gold)", margin: 0 }}>Dashboard Admin</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Bienvenue, <strong style={{ color: "var(--text-primary)" }}>{adminName}</strong>{" "}
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "9999px", background: roleBadge(currentRole).bg, color: roleBadge(currentRole).color, marginLeft: 6 }}>
                  {roleBadge(currentRole).label}
                </span>
              </span>
              <a href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none", padding: "0.4rem 0.9rem", border: "1px solid var(--border)", borderRadius: "9999px" }}>← App</a>
            </div>
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", paddingBottom: "4px" }}>
            {tabs.filter(t => !t.hidden).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: tab === t.id ? "1px solid var(--gold)" : "1px solid var(--border)",
                  background: tab === t.id ? "var(--gold)" : "var(--card-bg)",
                  color: tab === t.id ? "#1a0a00" : "var(--text-secondary)",
                  fontWeight: tab === t.id ? 700 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.75rem 1.5rem" }}>

        {/* ===== STATISTIQUES ===== */}
        {tab === "analytics" && (
          <AnalyticsTab data={analytics} onlineCount={onlineSet.size} />
        )}

        {/* ===== TABLEAU DE BORD DATA ===== */}
        {tab === "data" && <DataAdminTab />}

        {/* ===== APERÇU ===== */}
        {tab === "overview" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <BroadcastNotification />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Membres", value: stats.totalMembers, icon: "👥", accent: "var(--violet, #7c3aed)" },
                { label: "Nouveaux (7j)", value: stats.newMembersWeek, icon: "✨", accent: "var(--gold)" },
                { label: "Publications", value: stats.totalPosts, icon: "📝", accent: "#38bdf8" },
                { label: "Prières ouvertes", value: stats.openPrayers, icon: "🙏", accent: "#f472b6" },
                { label: "Événements", value: stats.totalEvents, icon: "📅", accent: "#34d399" },
                { label: "Dévotions", value: stats.totalDevotions, icon: "📖", accent: "var(--gold)" },
                { label: "Messages non lus", value: stats.newContacts, icon: "📬", accent: "#fb923c" },
                { label: "RDV en attente", value: stats.pendingRdv, icon: "🗓️", accent: "#a78bfa" },
              ].map(s => (
                <div key={s.label} style={{ ...card, borderTop: `3px solid ${s.accent}`, textAlign: "center", cursor: s.label.includes("Messages") || s.label.includes("RDV") ? "pointer" : "default" }}
                  onClick={() => { if (s.label.includes("Messages")) setTab("contacts"); if (s.label.includes("RDV")) setTab("rdv"); }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <p style={sectionTitle}>Membres récents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {members.slice(0, 6).map(m => { const rb = roleBadge(m.role); return (
                    <div key={m.id} style={{ ...card, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: m.role === "admin" ? "var(--gold)" : "var(--violet, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", color: m.role === "admin" ? "#1a0a00" : "white", flexShrink: 0 }}>{(m.full_name?.[0] ?? "?").toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.country || m.city || "—"} · {timeAgo(m.created_at)}</div>
                      </div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "9999px", background: rb.bg, color: rb.color, flexShrink: 0 }}>{rb.label}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div>
                <p style={sectionTitle}>Derniers messages reçus</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {contacts.slice(0, 5).map(c => (
                    <div key={c.id} style={{ ...card, padding: "0.875rem 1rem", borderLeft: `3px solid ${c.is_read ? "var(--border)" : "#fb923c"}`, cursor: "pointer" }} onClick={() => { setTab("contacts"); setExpandedContact(c.id); markContactRead(c.id); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{c.full_name}</span>
                        {!c.is_read && <span style={{ fontSize: "0.65rem", background: "#fb923c", color: "#fff", borderRadius: "9999px", padding: "0.15rem 0.5rem", fontWeight: 700 }}>NOUVEAU</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gold)", marginTop: 2 }}>{c.subject}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(c.created_at)}</div>
                    </div>
                  ))}
                  {contacts.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: "0.85rem" }}>Aucun message reçu.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== MEMBRES ===== */}
        {tab === "members" && (
          <div>
            {canInviteUser && (
              <div style={{ ...card, marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <label style={labelStyle}>Inviter par email</label>
                  <input type="email" placeholder="email@exemple.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: "1 1 220px" }}>
                  <label style={labelStyle}>Nom (optionnel)</label>
                  <input type="text" placeholder="Prénom Nom" value={inviteName} onChange={e => setInviteName(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={inviteUser} disabled={inviting} style={{ padding: "0.65rem 1.25rem", borderRadius: "9999px", border: "none", background: "var(--gold)", color: "#1a0a00", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: inviting ? 0.6 : 1 }}>
                  {inviting ? "..." : "+ Inviter"}
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
              <input type="search" placeholder="Rechercher par nom ou pays..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                {filteredMembers.length} membre(s) · <span style={{ color: "#22c55e" }}>● {filteredMembers.filter(m => isOnline(m.id, m.last_seen_at)).length} en ligne</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredMembers.map(m => {
                const online = isOnline(m.id, m.last_seen_at);
                return (
                  <div key={m.id} style={{ ...card, display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", opacity: m.is_disabled ? 0.55 : 1 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: m.role === "admin" ? "var(--gold)" : "var(--violet, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", color: m.role === "admin" ? "#1a0a00" : "white" }}>{(m.full_name?.[0] ?? "?").toUpperCase()}</div>
                      {online && <div title="En ligne" style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--card-bg)" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {m.full_name || "Sans nom"}
                        {m.is_disabled && <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: "9999px", background: "rgba(248,113,113,0.15)", color: "#fca5a5", fontWeight: 700 }}>DÉSACTIVÉ</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.country || m.city || "—"} · {m.spiritual_level || "Nouveau croyant"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Inscrit {timeAgo(m.created_at)} · Dernière connexion : {lastSignInLabel(m.last_sign_in_at)}
                      </div>
                    </div>
                    <select
                      value={m.role}
                      onChange={e => changeRole(m.id, e.target.value)}
                      disabled={!canChangeRole || (m.role === "owner" && !canChangeOwner)}
                      style={{ ...inputStyle, width: "auto", minWidth: 0, padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      <option value="member">Membre</option>
                      <option value="premium_member">Premium</option>
                      <option value="moderator">Modérateur</option>
                      <option value="leader">Leader (legacy)</option>
                      <option value="admin">Admin</option>
                      {canChangeOwner && <option value="owner">Propriétaire</option>}
                    </select>
                    {canDisableUser && (
                      <button onClick={() => toggleDisable(m.id, !m.is_disabled)} style={{ padding: "0.4rem 0.7rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.75rem", cursor: "pointer" }}>
                        {m.is_disabled ? "Réactiver" : "Désactiver"}
                      </button>
                    )}
                    {canDeleteUser && m.role !== "owner" && (
                      <button onClick={() => hardDelete(m.id, m.full_name)} style={{ padding: "0.4rem 0.7rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "0.75rem", cursor: "pointer" }}>
                        🗑 Suppr.
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredMembers.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucun membre correspondant.</div>}
            </div>
          </div>
        )}

        {/* ===== ÉVÉNEMENTS / LIVE ===== */}
        {tab === "events" && (
          <ResourceTab table="events" titleField="title" columns={eventCols} initialRows={initialEvents} rubrique="Événements & Live" icon="📅" />
        )}

        {/* ===== BIBLIOTHÈQUE ===== */}
        {tab === "media" && (
          <ResourceTab table="media_library" titleField="title" columns={mediaCols} initialRows={media} rubrique="Bibliothèque" icon="📚" />
        )}

        {/* ===== GALERIE ===== */}
        {tab === "albums" && (
          <ResourceTab table="photo_albums" titleField="title" columns={albumCols} initialRows={albums} rubrique="Albums photo" icon="🖼️" />
        )}

        {/* ===== TÉMOIGNAGES ===== */}
        {tab === "testimonies" && (
          <ResourceTab table="testimonies" titleField="title" columns={testimonyCols} initialRows={testimonies} rubrique="Témoignages" icon="✨" />
        )}

        {/* ===== SITE CONTENT (CMS pages statiques) ===== */}
        {tab === "content" && canEditSettings && (
          <SiteContentTab initialRows={siteContent} />
        )}

        {/* ===== ACTIVITÉ / LOGS ADMIN ===== */}
        {tab === "activity" && canViewAuditLog && (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h3 style={{ margin: 0 }}>🛡 Journal d&apos;activité <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem" }}>({adminLogs.length} entrées)</span></h3>
            {adminLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>Aucune activité enregistrée pour l&apos;instant.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "70vh", overflowY: "auto" }}>
                {adminLogs.map(log => (
                  <div key={log.id} style={{ ...card, padding: "0.7rem 0.9rem", background: "var(--surface)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gold)" }}>{log.action}</span>
                        {log.actor_role && <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: "9999px", background: roleBadge(log.actor_role).bg, color: roleBadge(log.actor_role).color, fontWeight: 700 }}>{roleBadge(log.actor_role).label}</span>}
                        {log.target_type && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>→ {log.target_type}{log.target_id ? ` #${String(log.target_id).slice(0, 8)}` : ""}</span>}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{timeAgo(log.created_at)}</span>
                    </div>
                    {log.details && (
                      <pre style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== PUBLICATIONS ===== */}
        {tab === "posts" && (
          <div>
            <p style={{ ...sectionTitle, marginBottom: "1rem" }}>{posts.length} publication(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {posts.map(p => (
                <div key={p.id} style={{ ...card, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--gold)" }}>{nameFor(postProfiles, p.user_id)}</span>
                      {p.is_pinned && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: "rgba(212,175,55,0.12)", color: "var(--gold)" }}>📌 Épinglé</span>}
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>
                  </div>
                  <button onClick={() => deletePost(p.id)} style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}>🗑 Supprimer</button>
                </div>
              ))}
              {posts.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune publication.</div>}
            </div>
          </div>
        )}

        {/* ===== PRIÈRES ===== */}
        {tab === "prayers" && (
          <div>
            <p style={{ ...sectionTitle, marginBottom: "1rem" }}>{prayers.filter(p => !p.is_answered).length} prière(s) ouverte(s) · {prayers.filter(p => p.is_answered).length} répondue(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {prayers.map(p => (
                <div key={p.id} style={{ ...card, borderLeft: `3px solid ${p.is_answered ? "var(--gold)" : "rgba(244,114,182,0.6)"}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{p.title}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: p.is_answered ? "rgba(212,175,55,0.12)" : "rgba(244,114,182,0.12)", color: p.is_answered ? "var(--gold)" : "#f472b6" }}>{p.is_answered ? "✓ Répondue" : "● Ouverte"}</span>
                        {p.category && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{p.category}</span>}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{p.is_anonymous ? "🔒 Anonyme" : nameFor(prayerProfiles, p.user_id)}</div>
                      {p.content && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>}
                    </div>
                    {!p.is_answered && <button onClick={() => closePrayer(p.id)} style={{ padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.08)", color: "var(--gold)", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}>✓ Répondue</button>}
                  </div>
                </div>
              ))}
              {prayers.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune prière.</div>}
            </div>
          </div>
        )}

        {/* ===== DÉVOTIONS ===== */}
        {tab === "devotions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <p style={{ ...sectionTitle, margin: 0 }}>{devotions.length} dévotion(s)</p>
              <button onClick={() => { setShowDevotionForm(v => !v); setDevMsg(null); }} style={{ padding: "0.55rem 1.25rem", borderRadius: "9999px", border: "none", background: showDevotionForm ? "var(--surface)" : "var(--gold)", color: showDevotionForm ? "var(--text-primary)" : "#1a0a00", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                {showDevotionForm ? "✕ Annuler" : "+ Nouvelle dévotion"}
              </button>
            </div>
            {showDevotionForm && (
              <div style={{ ...card, marginBottom: "1.5rem", borderTop: "3px solid var(--gold)" }}>
                <h3 style={{ fontFamily: "var(--font-title)", color: "var(--gold)", fontSize: "1rem", margin: "0 0 1.25rem" }}>✍ Nouvelle dévotion</h3>
                {devMsg && <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: devMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${devMsg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: devMsg.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.88rem" }}>{devMsg.text}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem" }}>
                    <div><label style={labelStyle}>Date *</label><input type="date" value={form.devotion_date} onChange={e => setForm(f => ({ ...f, devotion_date: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Titre *</label><input type="text" placeholder="Ex : Marcher dans la foi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                    <div><label style={labelStyle}>Référence *</label><input type="text" placeholder="Jean 3:16" value={form.verse_reference} onChange={e => setForm(f => ({ ...f, verse_reference: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Texte du verset *</label><input type="text" placeholder="Car Dieu a tant aimé le monde..." value={form.verse_text} onChange={e => setForm(f => ({ ...f, verse_text: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div><label style={labelStyle}>Méditation 1 *</label><textarea placeholder="Premier paragraphe..." value={form.meditation_p1} onChange={e => setForm(f => ({ ...f, meditation_p1: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Méditation 2</label><textarea placeholder="Deuxième paragraphe..." value={form.meditation_p2} onChange={e => setForm(f => ({ ...f, meditation_p2: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Méditation 3</label><textarea placeholder="Troisième paragraphe..." value={form.meditation_p3} onChange={e => setForm(f => ({ ...f, meditation_p3: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Question de réflexion</label><input type="text" placeholder="Comment appliquer ce verset aujourd'hui ?" value={form.reflection_question} onChange={e => setForm(f => ({ ...f, reflection_question: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prière *</label><textarea placeholder="Seigneur, je te prie..." value={form.prayer} onChange={e => setForm(f => ({ ...f, prayer: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Déclaration de foi *</label><input type="text" placeholder="Je déclare que..." value={form.declaration} onChange={e => setForm(f => ({ ...f, declaration: e.target.value }))} style={inputStyle} /></div>
                  <button onClick={saveDevotion} disabled={saving} style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", border: "none", background: saving ? "rgba(212,175,55,0.3)" : "var(--gold)", color: "#1a0a00", fontWeight: 800, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Publication en cours..." : "📖 Publier la dévotion"}
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {devotions.map(d => (
                <div key={d.id} style={{ ...card, display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ background: "var(--gold)", borderRadius: "var(--radius-md)", padding: "0.3rem 0.7rem", fontSize: "0.75rem", fontWeight: 700, color: "#1a0a00", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {new Date(d.devotion_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.2rem" }}>{d.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--gold)" }}>{d.verse_reference}</div>
                    {d.verse_text && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.3rem" }}>&laquo; {d.verse_text} &raquo;</div>}
                  </div>
                </div>
              ))}
              {devotions.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune dévotion. Créez la première !</div>}
            </div>
          </div>
        )}

        {/* ===== MESSAGES DE CONTACT ===== */}
        {tab === "contacts" && (
          <div>
            <p style={{ ...sectionTitle, marginBottom: "1rem" }}>{contacts.filter(c => !c.is_read).length} non lu(s) · {contacts.length} total</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {contacts.map(c => (
                <div key={c.id} style={{ ...card, borderLeft: `3px solid ${c.is_read ? "var(--border)" : "#fb923c"}`, opacity: c.is_read ? 0.85 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", cursor: "pointer" }}
                    onClick={() => { setExpandedContact(expandedContact === c.id ? null : c.id); if (!c.is_read) markContactRead(c.id); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{c.full_name}</span>
                        {!c.is_read && <span style={{ fontSize: "0.65rem", background: "#fb923c", color: "#fff", borderRadius: "9999px", padding: "0.15rem 0.6rem", fontWeight: 700 }}>NOUVEAU</span>}
                        <span style={{ fontSize: "0.75rem", color: "var(--gold)", background: "rgba(212,175,55,0.1)", padding: "0.15rem 0.6rem", borderRadius: "9999px" }}>{c.subject}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        <span>📧 {c.email}</span>
                        {c.phone && <span>📞 {c.phone}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>{expandedContact === c.id ? "▲" : "▼"}</span>
                  </div>
                  {expandedContact === c.id && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "1rem", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{c.message}</div>
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
                        <a href={`mailto:${c.email}?subject=Re: ${c.subject}`} style={{ padding: "0.5rem 1rem", background: "var(--gold)", color: "#1a0a00", borderRadius: "9999px", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                          📧 Répondre par email
                        </a>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} style={{ padding: "0.5rem 1rem", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "9999px", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none" }}>
                            📞 Appeler
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {contacts.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "4rem", fontSize: "0.9rem" }}>📬 Aucun message de contact reçu.</div>}
            </div>
          </div>
        )}

        {/* ===== RENDEZ-VOUS PASTORAUX ===== */}
        {tab === "rdv" && (
          <div>
            <p style={{ ...sectionTitle, marginBottom: "1rem" }}>{rdvList.filter(r => r.status === "pending").length} en attente · {rdvList.length} total</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {rdvList.map(r => {
                const st = rdvStatusStyle[r.status] ?? rdvStatusStyle.pending;
                return (
                  <div key={r.id} style={{ ...card, borderLeft: `3px solid ${r.status === "pending" ? "#fbbf24" : r.status === "confirmed" ? "#22c55e" : "var(--border)"}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", cursor: "pointer" }} onClick={() => setExpandedRdv(expandedRdv === r.id ? null : r.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{r.full_name}</span>
                          <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.65rem", borderRadius: "9999px", background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(r.created_at)}</span>
                        </div>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          <span>📋 {r.subject}</span>
                          <span>📅 {new Date(r.preferred_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })} à {r.preferred_time}</span>
                          <span>{modalityLabel[r.modality] ?? r.modality}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>{expandedRdv === r.id ? "▲" : "▼"}</span>
                    </div>
                    {expandedRdv === r.id && (
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
                          <span>📞 <a href={`tel:${r.phone}`} style={{ color: "var(--gold)", textDecoration: "none" }}>{r.phone}</a></span>
                          {r.email && <span>📧 <a href={`mailto:${r.email}`} style={{ color: "var(--gold)", textDecoration: "none" }}>{r.email}</a></span>}
                        </div>
                        {r.message && (
                          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "0.875rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.875rem", whiteSpace: "pre-wrap" }}>{r.message}</div>
                        )}
                        {r.status === "pending" && (
                          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            <button onClick={() => updateRdvStatus(r.id, "confirmed")} style={{ padding: "0.5rem 1.1rem", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", borderRadius: "9999px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✓ Confirmer</button>
                            <button onClick={() => updateRdvStatus(r.id, "cancelled")} style={{ padding: "0.5rem 1.1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "9999px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✕ Annuler</button>
                            {r.phone && <a href={`tel:${r.phone}`} style={{ padding: "0.5rem 1.1rem", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "9999px", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none" }}>📞 Appeler</a>}
                          </div>
                        )}
                        {r.status === "confirmed" && (
                          <button onClick={() => updateRdvStatus(r.id, "done")} style={{ padding: "0.5rem 1.1rem", background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8", borderRadius: "9999px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✅ Marquer effectué</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {rdvList.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "4rem", fontSize: "0.9rem" }}>🗓️ Aucune demande de rendez-vous.</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
