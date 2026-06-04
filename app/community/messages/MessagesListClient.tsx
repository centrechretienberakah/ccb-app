"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessagingTabs from "./MessagingTabs";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { ConversationLite, CallLogItem } from "./page";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MessagesListClient({ conversations, currentUserId, callLog }: { conversations: ConversationLite[]; currentUserId: string; callLog: CallLogItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ConversationLite[]>(conversations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"tous" | "nonlus" | "historique">("tous");
  const [showNew, setShowNew] = useState(false);
  const [members, setMembers] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(false);

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

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (busyId) return;
    if (!confirm("Supprimer DÉFINITIVEMENT cette conversation ?\nLes messages seront effacés. Cette action est irréversible.")) return;
    setBusyId(id);
    const supabase = createClient();
    // Suppression définitive (RPC SECURITY DEFINER) : DM -> tout est effacé
    // (messages, réactions, appels) ; mini-groupe -> on quitte simplement.
    const { error } = await supabase.rpc("dm_delete_conversation", { p_conversation_id: id });
    if (error) {
      alert("Suppression impossible : " + error.message + "\n(Migration v60 requise.)");
      setBusyId(null);
      return;
    }
    setItems((arr) => arr.filter((x) => x.id !== id));
    setBusyId(null);
  }

  const unreadCount = items.filter((c) => c.unread).length;
  const visible = filter === "nonlus" ? items.filter((c) => c.unread) : items;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 80 }}>
      <MessagingTabs />

      {/* Sous-barre de filtres — toujours sur une seule ligne (mobile inclus) */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, padding: "8px 12px" }}>
          {([["tous", "Tous"], ["nonlus", "Non lus"], ["historique", "Historique"]] as const).map(([key, label]) => {
            const active = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)} style={{
                flex: 1, minWidth: 0, padding: "8px 6px", borderRadius: 999,
                border: `1px solid ${active ? T.violet : T.border}`,
                background: active ? T.violet : "transparent",
                color: active ? "#fff" : T.textMuted,
                fontWeight: active ? 800 : 600,
                fontSize: "clamp(11.5px, 3.2vw, 13px)",
                cursor: "pointer", fontFamily: F.body, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "background .15s, color .15s, border-color .15s",
              }}>
                {label}
                {key === "nonlus" && unreadCount > 0 && (
                  <span style={{
                    background: active ? "rgba(255,255,255,0.25)" : "#C24B7A", color: "#fff",
                    fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 6px",
                    minWidth: 16, textAlign: "center",
                  }}>{unreadCount}</span>
                )}
              </button>
            );
          })}
          <button
            onClick={openNew}
            aria-label="Nouvelle conversation"
            title="Nouvelle conversation"
            style={{
              flexShrink: 0, width: 42, padding: "8px 0", borderRadius: 999,
              border: "none", background: T.violet, color: "#fff",
              fontSize: 22, fontWeight: 700, lineHeight: 1, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >＋</button>
        </div>
      </div>
      <style>{`
        .ccb-conv-row .ccb-conv-del { color: ${T.textMuted}; opacity: .55; transition: opacity .15s, color .15s, background .15s; }
        .ccb-conv-row:hover .ccb-conv-del { opacity: 1; }
        .ccb-conv-del:hover { color: #DC2626 !important; opacity: 1 !important; background: rgba(220,38,38,0.10) !important; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {filter === "historique" ? (
          callLog.length === 0 ? (
            <div style={{ textAlign: "center", padding: "44px 18px", color: T.textMuted, fontSize: 14, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
              Aucun appel pour le moment.
            </div>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {callLog.map((c, i) => {
                const ini = c.otherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const bad = c.status === "missed" || c.status === "declined";
                const dir = c.isGroup ? "Groupe" : (c.outgoing ? "Sortant" : "Entrant");
                const statusTxt = c.status === "missed" ? "Manqué" : c.status === "declined" ? "Refusé" : dir;
                return (
                  <Link key={c.id} href={c.targetHref} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    textDecoration: "none", color: T.text,
                    borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                  }}>
                    {c.otherAvatar ? (
                      <img src={c.otherAvatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
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
          <div style={{
            textAlign: "center", padding: "48px 18px", color: T.textMuted, fontSize: 14,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
            Aucune conversation pour le moment.<br />
            Va sur le profil d&apos;un membre et clique sur <strong style={{ color: T.violet }}>💬 Message</strong>.
            <div style={{ marginTop: 16 }}>
              <Link href="/community/membres" style={{
                display: "inline-block", background: T.violet, color: "#fff",
                borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>👥 Voir les membres</Link>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 18px", color: T.textMuted, fontSize: 14,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{filter === "nonlus" ? "✅" : "💬"}</div>
            {filter === "nonlus" ? "Aucune discussion non lue." : "Aucune discussion ici."}
          </div>
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {visible.map((c, i) => {
              const name = c.type === "group" ? (c.title || "Groupe privé") : (c.otherName || "Membre");
              const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={c.id} className="ccb-conv-row" style={{
                  display: "flex", alignItems: "stretch",
                  borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                  background: c.unread ? "rgba(91, 33, 182,0.04)" : "transparent",
                  opacity: busyId === c.id ? 0.5 : 1,
                }}>
                  <Link href={`/community/messages/${c.id}`} style={{
                    flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 14px", textDecoration: "none", color: T.text,
                  }}>
                    {c.otherAvatar ? (
                      <img src={c.otherAvatar} alt={name} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 700, fontSize: 16,
                      }}>{c.type === "group" ? "👥" : initials}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: c.unread ? 800 : 700, fontSize: 14.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {name}
                        </span>
                        <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <div style={{
                        fontSize: 13, color: c.unread ? T.text : T.textMuted, marginTop: 2,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        fontWeight: c.unread ? 600 : 400,
                      }}>
                        {c.lastMessage || "Nouvelle conversation"}
                      </div>
                    </div>
                    {c.unread && (
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.violet, flexShrink: 0 }} />
                    )}
                  </Link>
                  <button
                    type="button"
                    className="ccb-conv-del"
                    onClick={(e) => handleDelete(e, c.id)}
                    disabled={busyId === c.id}
                    aria-label="Supprimer la discussion"
                    title="Supprimer la discussion"
                    style={{
                      flexShrink: 0, width: 48, border: "none", background: "transparent",
                      cursor: busyId === c.id ? "default" : "pointer", fontSize: 17,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >🗑️</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nouvelle conversation — sélecteur de membre (feuille du bas) */}
      {showNew && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{
            width: "100%", maxWidth: 520, maxHeight: "82vh", background: T.card,
            borderRadius: "18px 18px 0 0", display: "flex", flexDirection: "column",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text, fontFamily: F.title }}>✏️ Nouvelle conversation</span>
              <button onClick={() => setShowNew(false)} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, color: T.textMuted, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "10px 16px" }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Rechercher un membre…"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none" }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }}>
              {loadingMembers ? (
                <div style={{ textAlign: "center", padding: 30, color: T.textMuted, fontSize: 13 }}>Chargement…</div>
              ) : (() => {
                const q = search.trim().toLowerCase();
                const filtered = q ? members.filter((m) => (m.display_name || "").toLowerCase().includes(q)) : members;
                if (filtered.length === 0) return <div style={{ textAlign: "center", padding: 30, color: T.textMuted, fontSize: 13 }}>Aucun membre trouvé.</div>;
                return filtered.map((m) => {
                  const nm = m.display_name || "Membre";
                  const ini = nm.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <button key={m.user_id} onClick={() => startConversation(m.user_id)} disabled={starting} style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                      padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent",
                      color: T.text, cursor: starting ? "wait" : "pointer", fontFamily: F.body,
                    }}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>{ini}</div>
                      )}
                      <span style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
