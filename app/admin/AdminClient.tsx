"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  totalMembers: number; newMembersWeek: number; totalPosts: number;
  openPrayers: number; totalEvents: number; totalDevotions: number; activePlans: number;
}
interface Member { id: string; full_name: string; email?: string; role: string; spiritual_level?: string; created_at: string; country?: string; }
interface Post { id: string; content: string; created_at: string; user_id: string; category?: string; is_pinned?: boolean; }
interface Prayer { id: string; title: string; body?: string; status: string; created_at: string; user_id: string; is_anonymous?: boolean; }
interface Devotion { id: string; devotion_date: string; title: string; verse_reference: string; verse_text?: string; meditation_p1?: string; meditation_p2?: string; meditation_p3?: string; reflection_question?: string; prayer?: string; declaration?: string; }
interface Event { id: string; title: string; event_date: string; event_type?: string; is_published?: boolean; status?: string; }
interface Profile { id: string; full_name: string; }

interface AdminClientProps {
  adminName: string; stats: Stats;
  members: Member[]; posts: Post[]; postProfiles: Profile[];
  prayers: Prayer[]; prayerProfiles: Profile[];
  devotions: Devotion[]; events: Event[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "a l instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function roleBadge(role: string) {
  if (role === "admin") return { label: "Admin", bg: "rgba(212,175,55,0.15)", color: "var(--gold)" };
  if (role === "leader") return { label: "Leader", bg: "rgba(124,58,237,0.15)", color: "var(--violet-light)" };
  return { label: "Membre", bg: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" };
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" };
const sectionTitle: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 1rem" };

export default function AdminClient({ adminName, stats, members: initialMembers, posts: initialPosts, postProfiles, prayers: initialPrayers, prayerProfiles, devotions: initialDevotions, events }: AdminClientProps) {
  type Tab = "overview" | "members" | "posts" | "prayers" | "devotions";
  const [tab, setTab] = useState<Tab>("overview");
  const [members, setMembers] = useState(initialMembers);
  const [memberSearch, setMemberSearch] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const [prayers, setPrayers] = useState(initialPrayers);
  const [devotions, setDevotions] = useState(initialDevotions);
  const [showDevotionForm, setShowDevotionForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [devMsg, setDevMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ devotion_date: new Date().toISOString().split("T")[0], title: "", verse_reference: "", verse_text: "", meditation_p1: "", meditation_p2: "", meditation_p3: "", reflection_question: "", prayer: "", declaration: "" });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const changeRole = async (memberId: string, newRole: string) => {
    const sb = createClient();
    const { error } = await sb.from("profiles").update({ role: newRole }).eq("id", memberId);
    if (!error) { setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)); showToast("Role mis a jour"); }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Supprimer cette publication ?")) return;
    const sb = createClient();
    const { error } = await sb.from("posts").delete().eq("id", postId);
    if (!error) { setPosts(prev => prev.filter(p => p.id !== postId)); showToast("Publication supprimee"); }
  };

  const closePrayer = async (prayerId: string) => {
    const sb = createClient();
    const { error } = await sb.from("prayer_requests").update({ status: "answered" }).eq("id", prayerId);
    if (!error) { setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, status: "answered" } : p)); showToast("Priere marquee repondue"); }
  };

  const saveDevotion = async () => {
    if (!form.title || !form.verse_reference || !form.meditation_p1 || !form.prayer || !form.declaration) {
      setDevMsg({ type: "error", text: "Remplissez tous les champs obligatoires (*)." }); return;
    }
    setSaving(true); setDevMsg(null);
    const sb = createClient();
    const { data, error } = await sb.from("daily_devotions").insert({
      devotion_date: form.devotion_date, title: form.title, verse_reference: form.verse_reference,
      verse_text: form.verse_text || null, meditation_p1: form.meditation_p1,
      meditation_p2: form.meditation_p2 || null, meditation_p3: form.meditation_p3 || null,
      reflection_question: form.reflection_question || null, prayer: form.prayer,
      declaration: form.declaration, author: adminName,
    }).select().single();
    if (error) { setDevMsg({ type: "error", text: error.message }); }
    else {
      setDevotions(prev => [data, ...prev]);
      setDevMsg({ type: "success", text: "Devotion publiee !" });
      setForm({ devotion_date: new Date().toISOString().split("T")[0], title: "", verse_reference: "", verse_text: "", meditation_p1: "", meditation_p2: "", meditation_p3: "", reflection_question: "", prayer: "", declaration: "" });
      setTimeout(() => { setShowDevotionForm(false); setDevMsg(null); }, 1500);
    }
    setSaving(false);
  };

  const filteredMembers = members.filter(m => !memberSearch || m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase()));
  const nameFor = (profiles: Profile[], userId: string) => profiles.find(p => p.id === userId)?.full_name ?? "Membre";

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Apercu" },
    { id: "members", label: `Membres (${stats.totalMembers})` },
    { id: "posts", label: `Publications (${stats.totalPosts})` },
    { id: "prayers", label: `Prieres (${stats.openPrayers})` },
    { id: "devotions", label: `Devotions (${stats.totalDevotions})` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>

      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "#1a0a00", padding: "0.65rem 1.5rem", borderRadius: "9999px", fontWeight: 700, fontSize: "0.88rem", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>{toast}</div>
      )}

      <div style={{ background: "var(--header-gradient)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: "0 0 0.2rem" }}>Centre Chretien Berakah</p>
              <h1 style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "1.35rem", color: "var(--gold)", margin: 0 }}>Dashboard Admin</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Bienvenue, <strong style={{ color: "var(--text-primary)" }}>{adminName}</strong></span>
              <a href="/dashboard" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none", padding: "0.4rem 0.9rem", border: "1px solid var(--border)", borderRadius: "9999px" }}>← App</a>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.125rem", overflowX: "auto", scrollbarWidth: "none" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "0.55rem 1rem", borderRadius: "8px 8px 0 0", border: "none", background: tab === t.id ? "var(--card-bg)" : "transparent", color: tab === t.id ? "var(--gold)" : "var(--text-secondary)", fontWeight: tab === t.id ? 700 : 500, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap", borderBottom: tab === t.id ? "2px solid var(--gold)" : "2px solid transparent" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.75rem 1.5rem" }}>

        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Membres", value: stats.totalMembers, icon: "👥", accent: "var(--violet)" },
                { label: "Nouveaux (7j)", value: stats.newMembersWeek, icon: "✨", accent: "var(--gold)" },
                { label: "Publications", value: stats.totalPosts, icon: "📝", accent: "#38bdf8" },
                { label: "Prieres ouvertes", value: stats.openPrayers, icon: "🙏", accent: "#f472b6" },
                { label: "Evenements", value: stats.totalEvents, icon: "📅", accent: "#34d399" },
                { label: "Devotions", value: stats.totalDevotions, icon: "📖", accent: "var(--gold)" },
                { label: "Plans actifs", value: stats.activePlans, icon: "🎯", accent: "var(--violet-light)" },
              ].map(s => (
                <div key={s.label} style={{ ...card, borderTop: `3px solid ${s.accent}` }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <p style={sectionTitle}>Membres recents</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {members.slice(0, 6).map(m => {
                    const rb = roleBadge(m.role);
                    return (
                      <div key={m.id} style={{ ...card, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--violet)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", color: "white", flexShrink: 0 }}>{(m.full_name?.[0] ?? "?").toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name || "—"}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{timeAgo(m.created_at)}</div>
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "9999px", background: rb.bg, color: rb.color }}>{rb.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={sectionTitle}>Devotions recentes</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {devotions.slice(0, 6).map(d => (
                    <div key={d.id} style={{ ...card, padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ background: "var(--gold)", borderRadius: "var(--radius-md)", padding: "0.3rem 0.6rem", fontSize: "0.72rem", fontWeight: 700, color: "#1a0a00", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {new Date(d.devotion_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--gold)" }}>{d.verse_reference}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "members" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <input type="search" placeholder="Rechercher un membre..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{filteredMembers.length} resultat(s)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredMembers.map(m => (
                <div key={m.id} style={{ ...card, display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: m.role === "admin" ? "var(--gold)" : "var(--violet)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", color: m.role === "admin" ? "#1a0a00" : "white", flexShrink: 0 }}>{(m.full_name?.[0] ?? "?").toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{m.full_name || "Sans nom"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>
                    {m.country && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m.country}</div>}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Inscrit {timeAgo(m.created_at)}</div>
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: "120px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
                    <option value="member">Membre</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
              {filteredMembers.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucun membre correspondant.</div>}
            </div>
          </div>
        )}

        {tab === "posts" && (
          <div>
            <p style={sectionTitle}>{posts.length} publication(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {posts.map(p => (
                <div key={p.id} style={{ ...card, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--gold)" }}>{nameFor(postProfiles, p.user_id)}</span>
                      {p.category && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{p.category}</span>}
                      {p.is_pinned && <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: "rgba(212,175,55,0.12)", color: "var(--gold)" }}>Epingle</span>}
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.content}</div>
                  </div>
                  <button onClick={() => deletePost(p.id)} style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}>Supprimer</button>
                </div>
              ))}
              {posts.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune publication.</div>}
            </div>
          </div>
        )}

        {tab === "prayers" && (
          <div>
            <p style={sectionTitle}>{prayers.filter(p => p.status === "open").length} priere(s) ouverte(s)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {prayers.map(p => (
                <div key={p.id} style={{ ...card, borderLeft: `3px solid ${p.status === "answered" ? "var(--gold)" : "rgba(244,114,182,0.6)"}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{p.title}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", background: p.status === "answered" ? "rgba(212,175,55,0.12)" : "rgba(244,114,182,0.12)", color: p.status === "answered" ? "var(--gold)" : "#f472b6" }}>{p.status === "answered" ? "Repondue" : "Ouverte"}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>{timeAgo(p.created_at)}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{p.is_anonymous ? "Anonyme" : nameFor(prayerProfiles, p.user_id)}</div>
                      {p.body && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.body}</div>}
                    </div>
                    {p.status === "open" && (
                      <button onClick={() => closePrayer(p.id)} style={{ padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.08)", color: "var(--gold)", fontSize: "0.78rem", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>Repondue</button>
                    )}
                  </div>
                </div>
              ))}
              {prayers.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune priere.</div>}
            </div>
          </div>
        )}

        {tab === "devotions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <p style={{ ...sectionTitle, margin: 0 }}>{devotions.length} devotion(s)</p>
              <button onClick={() => { setShowDevotionForm(v => !v); setDevMsg(null); }} style={{ padding: "0.55rem 1.25rem", borderRadius: "9999px", border: "none", background: showDevotionForm ? "var(--surface)" : "var(--gold)", color: showDevotionForm ? "var(--text-primary)" : "#1a0a00", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                {showDevotionForm ? "Annuler" : "+ Nouvelle devotion"}
              </button>
            </div>
            {showDevotionForm && (
              <div style={{ ...card, marginBottom: "1.5rem", borderTop: "3px solid var(--gold)" }}>
                <h3 style={{ fontFamily: "var(--font-title)", color: "var(--gold)", fontSize: "1rem", margin: "0 0 1.25rem" }}>Nouvelle devotion</h3>
                {devMsg && <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: devMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${devMsg.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: devMsg.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.88rem" }}>{devMsg.text}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem" }}>
                    <div><label style={labelStyle}>Date *</label><input type="date" value={form.devotion_date} onChange={e => setForm(f => ({ ...f, devotion_date: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Titre *</label><input type="text" placeholder="Ex : Marcher dans la foi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                    <div><label style={labelStyle}>Reference *</label><input type="text" placeholder="Jean 3:16" value={form.verse_reference} onChange={e => setForm(f => ({ ...f, verse_reference: e.target.value }))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Texte du verset</label><input type="text" placeholder="Car Dieu a tant aime le monde..." value={form.verse_text} onChange={e => setForm(f => ({ ...f, verse_text: e.target.value }))} style={inputStyle} /></div>
                  </div>
                  <div><label style={labelStyle}>Meditation 1 *</label><textarea placeholder="Premier paragraphe..." value={form.meditation_p1} onChange={e => setForm(f => ({ ...f, meditation_p1: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Meditation 2</label><textarea placeholder="Deuxieme paragraphe (optionnel)..." value={form.meditation_p2} onChange={e => setForm(f => ({ ...f, meditation_p2: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Meditation 3 (optionnel)</label><textarea placeholder="Troisieme paragraphe..." value={form.meditation_p3} onChange={e => setForm(f => ({ ...f, meditation_p3: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Question de reflexion (optionnel)</label><input type="text" placeholder="Comment appliquer ce verset ?" value={form.reflection_question} onChange={e => setForm(f => ({ ...f, reflection_question: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Priere *</label><textarea placeholder="Seigneur, je te prie..." value={form.prayer} onChange={e => setForm(f => ({ ...f, prayer: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Declaration de foi *</label><input type="text" placeholder="Je declare que..." value={form.declaration} onChange={e => setForm(f => ({ ...f, declaration: e.target.value }))} style={inputStyle} /></div>
                  <button onClick={saveDevotion} disabled={saving} style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", border: "none", background: saving ? "rgba(212,175,55,0.3)" : "var(--gold)", color: "#1a0a00", fontWeight: 800, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Publication en cours..." : "Publier la devotion"}
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
                    {d.verse_text && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.3rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{d.verse_text}</div>}
                  </div>
                </div>
              ))}
              {devotions.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Aucune devotion. Creez la premiere !</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
