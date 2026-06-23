"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessagingTabs from "./MessagingTabs";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { canCreateGroup, GROUP_CATEGORIES } from "@/lib/groups/theme";
import { notifyGroupsStaff } from "@/lib/groups/theme";
import type { Discussion, CallLogItem } from "./page";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

type Filter = "tous" | "prives" | "groupes" | "nonlus" | "historique";

export default function MessagesListClient({ discussions, currentUserId, callLog, userRole }: { discussions: Discussion[]; currentUserId: string; callLog: CallLogItem[]; userRole: string | null }) {
  const router = useRouter();
  const [items, setItems] = useState<Discussion[]>(discussions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("tous");
  const [showNew, setShowNew] = useState(false);
  const [members, setMembers] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [starting, setStarting] = useState(false);

  // Création de groupe (rapatriée ici depuis l'ancienne page Groupes)
  const canCreate = canCreateGroup(userRole);
  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gType, setGType] = useState<"public" | "private">("public");
  const [gCat, setGCat] = useState("general");
  const [gSaving, setGSaving] = useState(false);
  const [gError, setGError] = useState("");

  const unreadCount = useMemo(() => items.filter((c) => c.unread).length, [items]);

  const visible = useMemo(() => items.filter((d) => {
    if (filter === "prives" && d.kind !== "private") return false;
    if (filter === "groupes" && d.kind !== "group") return false;
    if (filter === "nonlus" && !d.unread) return false;
    return true;
  }), [items, filter]);

  async function openNew() {
    setShowNew(true);
    if (members.length > 0) return;
    setLoadingMembers(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .eq("is_public", true)
        .order("display_name", { ascending: true })
        .limit(500);
      const list = ((data ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>)
        .filter((m) => m.user_id !== currentUserId);
      setMembers(list);
    } catch { /* noop */ }
    setLoadingMembers(false);
  }

  async function startConversation(userId: string) {
    if (starting) return;
    setStarting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_or_create_dm", { p_other: userId });
      if (!error && typeof data === "string") { router.push(`/community/messages/${data}`); return; }
      alert("Impossible de démarrer la conversation" + (error ? " : " + error.message : ""));
    } catch { alert("Erreur réseau."); }
    setStarting(false);
  }

  async function createGroup() {
    if (!gName.trim()) { setGError("Le nom est requis."); return; }
    if (!canCreate) { setGError("Permissions insuffisantes."); return; }
    setGSaving(true); setGError("");
    const supabase = createClient();
    const { data, error } = await supabase.from("groups").insert({
      name: gName.trim(), description: gDesc.trim() || null, type: gType, category: gCat, created_by: currentUserId,
    }).select("id, name").single();
    if (error) {
      setGSaving(false);
      setGError(/policy|permission|denied|row.*level/i.test(error.message)
        ? "Permission refusée. Seuls owner/admin/leader/modérateur peuvent créer un groupe."
        : error.message);
      return;
    }
    const g = data as { id: string; name: string };
    try {
      await supabase.from("group_members").upsert({ group_id: g.id, user_id: currentUserId, role: "owner" }, { onConflict: "group_id,user_id" });
    } catch { /* trigger SQL a déjà créé l'owner */ }
    try {
      notifyGroupsStaff(`🧑‍🤝‍🧑 Nouveau groupe : ${g.name}`, gType === "public" ? "Public" : "Privé", `/community/groups/${g.id}`);
    } catch { /* noop */ }
    router.push(`/community/groups/${g.id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (busyId) return;
    if (!confirm("Supprimer DÉFINITIVEMENT cette conversation ?\nLes messages seront effacés. Cette action est irréversible.")) return;
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("dm_delete_conversation", { p_conversation_id: id });
    if (error) {
      alert("Suppression impossible : " + error.message + "\n(Migration v60 requise.)");
      setBusyId(null);
      return;
    }
    setItems((arr) => arr.filter((x) => x.id !== id));
    setBusyId(null);
  }

  const FILTERS: [Filter, string][] = [["tous", "Tous"], ["prives", "Privés"], ["groupes", "Groupes"], ["nonlus", "Non lus"]];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 80 }}>
      <MessagingTabs />

      {/* Filtres + actions — directement sous la barre violette */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, padding: "8px 12px", alignItems: "center" }}>
          {FILTERS.map(([key, label]) => {
            const active = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)} style={{
                flex: 1, minWidth: 0, padding: "8px 6px", borderRadius: 999,
                border: `1px solid ${active ? T.violet : T.border}`,
                background: active ? T.violet : "transparent",
                color: active ? "#fff" : T.textMuted,
                fontWeight: active ? 800 : 600,
                fontSize: "clamp(11px, 3vw, 13px)",
                cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "background .15s, color .15s, border-color .15s",
              }}>
                {label}
                {key === "nonlus" && unreadCount > 0 && (
                  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#C24B7A", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px", minWidth: 16, textAlign: "center" }}>{unreadCount}</span>
                )}
              </button>
            );
          })}
          <button onClick={() => setFilter("historique")} aria-label="Journal des appels" title="Journal des appels"
            style={{ flexShrink: 0, width: 42, padding: "8px 0", borderRadius: 999, border: `1px solid ${filter === "historique" ? T.violet : T.border}`, background: filter === "historique" ? T.violet : "transparent", color: filter === "historique" ? "#fff" : T.textMuted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>📞</button>
          <button onClick={openNew} aria-label="Nouvelle conversation" title="Nouvelle conversation"
            style={{ flexShrink: 0, width: 42, padding: "8px 0", borderRadius: 999, border: "none", background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", fontSize: 22, fontWeight: 700, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>＋</button>
        </div>
      </div>

      <style>{`
        .ccb-conv-row .ccb-conv-del { color: ${T.textMuted}; opacity: .55; transition: opacity .15s, color .15s, background .15s; }
        .ccb-conv-row:hover .ccb-conv-del { opacity: 1; }
        .ccb-conv-del:hover { color: #DC2626 !important; opacity: 1 !important; background: rgba(220,38,38,0.10) !important; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {/* Actions groupe (admins) — rapatriées de l'ancienne page Groupes */}
        {canCreate && filter !== "historique" && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
            <Link href="/community/groups/admin" style={{ padding: "7px 14px", background: T.violetSoft, color: T.gold, border: `1px solid ${T.violet}`, borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>⚙️ Dashboard admin</Link>
            <button onClick={() => setShowCreate(true)} style={{ padding: "7px 16px", background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, color: "#fff", border: "none", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>➕ Créer un groupe</button>
          </div>
        )}

        {filter === "historique" ? (
          callLog.length === 0 ? (
            <div style={{ textAlign: "center", padding: "44px 18px", color: T.textMuted, fontSize: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
              Aucun appel pour le moment.
            </div>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {callLog.map((c, i) => {
                const ini = initialsOf(c.otherName);
                const bad = c.status === "missed" || c.status === "declined";
                const dir = c.isGroup ? "Groupe" : (c.outgoing ? "Sortant" : "Entrant");
                const statusTxt = c.status === "missed" ? "Manqué" : c.status === "declined" ? "Refusé" : dir;
                return (
                  <Link key={c.id} href={c.targetHref} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textDecoration: "none", color: T.text, borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}` }}>
                    {c.otherAvatar ? (
                      <img loading="lazy" decoding="async" src={c.otherAvatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>{c.isGroup ? "👥" : ini}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: bad ? "#DC2626" : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.otherName}</div>
                      <div style={{ fontSize: 12.5, color: bad ? "#DC2626" : T.textMuted, marginTop: 2 }}>
                        <span style={{ marginRight: 5 }}>{c.outgoing ? "↗" : "↘"}</span>
                        {c.type === "audio" ? "📞" : "📹"} {statusTxt}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{timeAgo(c.createdAt)}</span>
                  </Link>
                );
              })}
            </div>
          )
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 18px", color: T.textMuted, fontSize: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
            Aucune discussion pour le moment.<br />
            Démarre une conversation{canCreate ? " ou crée un groupe" : ""}.
            <div style={{ marginTop: 16 }}>
              <button onClick={openNew} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✏️ Nouvelle conversation</button>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 18px", color: T.textMuted, fontSize: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{filter === "nonlus" ? "✅" : "💬"}</div>
            {filter === "nonlus" ? "Aucune discussion non lue." : "Aucune discussion ici."}
          </div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {visible.map((d, i) => {
              const href = d.source === "conversation" ? `/community/messages/${d.id}` : `/community/groups/${d.id}`;
              const isGroup = d.kind === "group";
              return (
                <div key={d.key} className="ccb-conv-row" style={{
                  display: "flex", alignItems: "stretch",
                  borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                  background: d.unread ? "rgba(91, 33, 182,0.04)" : "transparent",
                  opacity: busyId === d.id ? 0.5 : 1,
                }}>
                  <Link href={href} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", textDecoration: "none", color: T.text }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {d.avatarUrl ? (
                        <img loading="lazy" decoding="async" src={d.avatarUrl} alt={d.name} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>{isGroup ? "👥" : initialsOf(d.name)}</div>
                      )}
                      {isGroup && (
                        <span style={{ position: "absolute", bottom: -2, right: -2, width: 19, height: 19, borderRadius: "50%", background: T.gold, color: "#1a0a00", fontSize: 9.5, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.card}` }}>👥</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: d.unread ? 800 : 700, fontSize: 14.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                        <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{timeAgo(d.lastMessageAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: d.unread ? T.text : T.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: d.unread ? 600 : 400 }}>
                        {d.lastMessage || "Nouvelle conversation"}
                      </div>
                    </div>
                    {d.unreadCount > 0 ? (
                      <span style={{ flexShrink: 0, alignSelf: "center", background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 7px", minWidth: 20, textAlign: "center" }}>{d.unreadCount > 99 ? "99+" : d.unreadCount}</span>
                    ) : d.unread ? (
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.violet, flexShrink: 0, alignSelf: "center" }} />
                    ) : null}
                  </Link>
                  {d.source === "conversation" && (
                    <button type="button" className="ccb-conv-del" onClick={(e) => handleDelete(e, d.id)} disabled={busyId === d.id}
                      aria-label="Supprimer la discussion" title="Supprimer la discussion"
                      style={{ flexShrink: 0, width: 48, border: "none", background: "transparent", cursor: busyId === d.id ? "default" : "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nouvelle conversation — sélecteur de membre */}
      {showNew && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 520, maxHeight: "82vh", background: T.card, borderRadius: "18px 18px 0 0", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text, fontFamily: F.title }}>✏️ Nouvelle conversation</span>
              <button onClick={() => setShowNew(false)} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, color: T.textMuted, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
              {loadingMembers ? (
                <div style={{ textAlign: "center", padding: 30, color: T.textMuted, fontSize: 13 }}>Chargement…</div>
              ) : members.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: T.textMuted, fontSize: 13 }}>Aucun membre trouvé.</div>
              ) : members.map((m) => {
                const nm = m.display_name || "Membre";
                return (
                  <button key={m.user_id} onClick={() => startConversation(m.user_id)} disabled={starting} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", color: T.text, cursor: starting ? "wait" : "pointer", fontFamily: F.body }}>
                    {m.avatar_url ? (
                      <img loading="lazy" decoding="async" src={m.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>{initialsOf(nm)}</div>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Créer un groupe — modal (rapatriée ici) */}
      {showCreate && canCreate && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(31,26,51,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <div style={{ background: T.card, borderRadius: 18, padding: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: F.title, fontSize: 17, fontWeight: 700, color: T.gold, marginBottom: 16 }}>➕ Créer un groupe</div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>NOM *</label>
              <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="ex. Intercesseurs CCB, Équipe Louange…" maxLength={80} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>DESCRIPTION (optionnel)</label>
              <textarea value={gDesc} onChange={(e) => setGDesc(e.target.value)} rows={3} placeholder="À quoi sert ce groupe ?" style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={lbl}>TYPE</label>
                <select value={gType} onChange={(e) => setGType(e.target.value as "public" | "private")} style={inputStyle}>
                  <option value="public">🌍 Public — tout le monde peut rejoindre</option>
                  <option value="private">🔒 Privé — sur invitation</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={lbl}>CATÉGORIE</label>
                <select value={gCat} onChange={(e) => setGCat(e.target.value)} style={inputStyle}>
                  {GROUP_CATEGORIES.map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.label}</option>))}
                </select>
              </div>
            </div>
            {gError && <div style={{ color: "#C24B7A", fontSize: 12, marginBottom: 10 }}>{gError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setShowCreate(false)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 16px", color: T.textMuted, cursor: "pointer", fontSize: 12, fontFamily: F.body }}>Annuler</button>
              <button onClick={createGroup} disabled={gSaving || !gName.trim()} style={{ background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (gSaving || !gName.trim()) ? "not-allowed" : "pointer", opacity: !gName.trim() ? 0.5 : 1 }}>{gSaving ? "Création…" : "Créer le groupe"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, fontFamily: F.body, outline: "none" };
