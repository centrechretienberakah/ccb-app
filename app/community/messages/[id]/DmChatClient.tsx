"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import VoiceComposerButton from "@/components/community/VoiceComposerButton";
import type { DmMessageRow, DmOther } from "./page";

const COMPOSER_EMOJIS = ["😀","😂","😍","🥰","😅","😊","🙏","🔥","❤️","👍","🙌","🎉","✨","🕊️","💪","😢","😮","🤔","🙇","🥳","😇","👏","🤝","📖"];

interface Props {
  conversationId: string;
  currentUserId: string;
  other: DmOther;
  myDisplayName: string;
  initialMessages: DmMessageRow[];
}

interface Reaction { message_id: string; user_id: string; emoji: string; }

const REACTION_EMOJIS = ["❤️", "🙏", "🔥", "🙌", "👍", "🎉", "😂", "😢"];

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function detectType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "other";
}

export default function DmChatClient({ conversationId, currentUserId, other, myDisplayName, initialMessages }: Props) {
  const [messages, setMessages] = useState<DmMessageRow[]>(initialMessages);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<DmMessageRow | null>(null);
  const [editing, setEditing] = useState<DmMessageRow | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [pending, setPending] = useState<{ url: string; type: string; name: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [clearedAt, setClearedAt] = useState(0); // ms — masque (localement) les messages antérieurs
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const muteKey = `ccb-dm-mute-${conversationId}`;
  const blockKey = other.user_id ? `ccb-dm-block-${other.user_id}` : `ccb-dm-block-${conversationId}`;
  const clearKey = `ccb-dm-cleared-${conversationId}`;

  // Préférences locales (mute / blocage / effacement) — chargées après mount
  useEffect(() => {
    try {
      setMuted(localStorage.getItem(muteKey) === "1");
      setBlocked(localStorage.getItem(blockKey) === "1");
      const c = Number(localStorage.getItem(clearKey) || 0);
      if (Number.isFinite(c)) setClearedAt(c);
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Ferme le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const name = other.display_name || "Membre";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Marque la conversation comme lue (à l'ouverture + à chaque message) → évite
  // qu'un message qu'on vient d'envoyer apparaisse « non lu » pour soi-même.
  useEffect(() => {
    const sb = createClient();
    void sb.from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).eq("user_id", currentUserId);
  }, [conversationId, currentUserId, messages.length]);

  // Charge les réactions initiales
  const loadReactions = useCallback(async () => {
    try {
      const sb = createClient();
      const ids = messages.map((m) => m.id);
      if (ids.length === 0) return;
      const { data } = await sb.from("dm_message_reactions")
        .select("message_id, user_id, emoji").in("message_id", ids);
      setReactions((data ?? []) as Reaction[]);
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);
  useEffect(() => { void loadReactions(); }, [loadReactions]);

  // Realtime messages + réactions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as DmMessageRow;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_id !== currentUserId) {
            void supabase.from("conversation_members")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId).eq("user_id", currentUserId);
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as DmMessageRow;
          setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_message_reactions" },
        (payload) => {
          const r = payload.new as Reaction;
          setReactions((prev) => prev.some((x) => x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji) ? prev : [...prev, r]);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_message_reactions" },
        (payload) => {
          const r = payload.old as Reaction;
          setReactions((prev) => prev.filter((x) => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji)));
        })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  async function uploadFile(file: File) {
    if (file.size > 100 * 1024 * 1024) { alert("Fichier trop volumineux (max 100 Mo)"); return; }
    setUploading(true);
    try {
      const sb = createClient();
      const ext = file.name.split(".").pop() || "bin";
      const path = `dm/${conversationId}/${Date.now()}-${currentUserId}.${ext}`;
      const { error } = await sb.storage.from("posts").upload(path, file);
      if (error) { alert("Erreur upload : " + error.message); setUploading(false); return; }
      const { data } = sb.storage.from("posts").getPublicUrl(path);
      setPending({ url: data.publicUrl, type: detectType(file), name: file.name });
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    const t = text.trim();
    if ((!t && !pending) || sending) return;
    setSending(true);
    const sb = createClient();

    if (editing) {
      // Édition
      const { error } = await sb.from("dm_messages")
        .update({ content: t, is_edited: true, edited_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (!error) {
        setMessages((prev) => prev.map((x) => x.id === editing.id ? { ...x, content: t, is_edited: true } : x));
        setEditing(null); setText("");
      }
      setSending(false);
      return;
    }

    const payload: Record<string, unknown> = {
      conversation_id: conversationId, sender_id: currentUserId, content: t || null,
    };
    if (replyTo) payload.reply_to_id = replyTo.id;
    if (pending) {
      payload.attachment_url = pending.url;
      payload.attachment_type = pending.type;
      payload.attachment_name = pending.name;
    }
    const { data, error } = await sb.from("dm_messages")
      .insert(payload)
      .select("id, sender_id, content, attachment_url, attachment_type, attachment_name, reply_to_id, is_pinned, is_edited, is_deleted, created_at")
      .single();
    if (!error && data) {
      const row = data as DmMessageRow;
      setMessages((prev) => prev.some((x) => x.id === row.id) ? prev : [...prev, row]);
      setText(""); setReplyTo(null); setPending(null);
      void sb.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      // Notif push à l'interlocuteur (best-effort)
      void fetch("/api/notifications/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `💬 ${myDisplayName}`,
          body: (t || (pending ? "📎 Pièce jointe" : "")).slice(0, 140),
          url: `/community/messages/${conversationId}`,
          audience: "conversation_members",
          conversationId,
        }),
      }).catch(() => {});
    }
    setSending(false);
  }

  function insertEmoji(e: string) {
    setText((t) => t + e);
  }

  // Message vocal : upload du blob enregistré → message avec pièce jointe audio
  async function sendVoice(file: File) {
    if (sending) return;
    setSending(true);
    try {
      const sb = createClient();
      const ext = file.name.split(".").pop() || "webm";
      const path = `dm/${conversationId}/${Date.now()}-${currentUserId}.${ext}`;
      const { error: upErr } = await sb.storage.from("posts").upload(path, file, { contentType: file.type });
      if (upErr) { alert("Erreur envoi du vocal : " + upErr.message); return; }
      const { data: pub } = sb.storage.from("posts").getPublicUrl(path);
      const { data, error } = await sb.from("dm_messages")
        .insert({ conversation_id: conversationId, sender_id: currentUserId, content: null, attachment_url: pub.publicUrl, attachment_type: "audio", attachment_name: file.name })
        .select("id, sender_id, content, attachment_url, attachment_type, attachment_name, reply_to_id, is_pinned, is_edited, is_deleted, created_at")
        .single();
      if (!error && data) {
        const row = data as DmMessageRow;
        setMessages((prev) => prev.some((x) => x.id === row.id) ? prev : [...prev, row]);
        void sb.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
        void fetch("/api/notifications/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `💬 ${myDisplayName}`, body: "🎤 Message vocal", url: `/community/messages/${conversationId}`, audience: "conversation_members", conversationId }),
        }).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  }

  // ── Actions du menu 3 points ──────────────────────────────────────────
  function toggleMute() {
    setMenuOpen(false);
    setMuted((m) => { const nv = !m; try { localStorage.setItem(muteKey, nv ? "1" : "0"); } catch { /* noop */ } return nv; });
  }
  function toggleBlock() {
    setMenuOpen(false);
    setBlocked((b) => { const nv = !b; try { localStorage.setItem(blockKey, nv ? "1" : "0"); } catch { /* noop */ } return nv; });
  }
  function clearChat() {
    setMenuOpen(false);
    if (!confirm("Effacer la discussion sur cet appareil ? Les messages ne sont pas supprimés pour l'autre personne.")) return;
    const now = Date.now();
    try { localStorage.setItem(clearKey, String(now)); } catch { /* noop */ }
    setClearedAt(now);
  }
  async function reportUser() {
    setMenuOpen(false);
    if (!confirm(`Signaler « ${name} » à l'équipe de modération ?`)) return;
    try {
      await fetch("/api/notifications/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🚩 Signalement d'un membre",
          body: `${myDisplayName} a signalé ${name} (conversation privée).`,
          url: other.user_id ? `/community/profil/${other.user_id}` : "/community",
          audience: "admins",
        }),
      });
      alert("Merci. L'équipe de modération a été notifiée.");
    } catch { alert("Impossible d'envoyer le signalement pour le moment."); }
  }

  // Messages visibles : on retire (localement) les messages antérieurs à l'effacement
  // + filtre de recherche éventuel.
  const visibleMessages = messages.filter((m) => {
    if (clearedAt && new Date(m.created_at).getTime() <= clearedAt) return false;
    if (search.trim() && !(m.content || "").toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  async function toggleReaction(messageId: string, emoji: string) {
    setReactPickerFor(null); setMenuFor(null);
    const sb = createClient();
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji);
    if (mine) {
      setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji)));
      await sb.from("dm_message_reactions").delete().eq("message_id", messageId).eq("user_id", currentUserId).eq("emoji", emoji);
    } else {
      setReactions((prev) => [...prev, { message_id: messageId, user_id: currentUserId, emoji }]);
      await sb.from("dm_message_reactions").insert({ message_id: messageId, user_id: currentUserId, emoji });
    }
  }

  async function deleteMessage(m: DmMessageRow) {
    setMenuFor(null);
    if (!confirm("Supprimer ce message ?")) return;
    const sb = createClient();
    setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, is_deleted: true, content: null, attachment_url: null } : x));
    await sb.from("dm_messages").update({ is_deleted: true, content: null, attachment_url: null }).eq("id", m.id);
  }

  function startEdit(m: DmMessageRow) {
    setMenuFor(null); setEditing(m); setReplyTo(null); setText(m.content || "");
  }

  function reactionsFor(id: string) {
    const map: Record<string, { count: number; mine: boolean }> = {};
    for (const r of reactions.filter((x) => x.message_id === id)) {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, mine: false };
      map[r.emoji].count++;
      if (r.user_id === currentUserId) map[r.emoji].mine = true;
    }
    return Object.entries(map);
  }

  return (
    <div style={{ background: T.bg, height: "100dvh", display: "flex", flexDirection: "column", color: T.text, fontFamily: F.body }}>
      {/* Header compact — AppBar unique façon WhatsApp */}
      <div style={{
        background: `linear-gradient(180deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff",
        paddingTop: "calc(4px + env(safe-area-inset-top, 0px))", paddingBottom: 4, paddingLeft: 8, paddingRight: 8,
        display: "flex", alignItems: "center", gap: 6,
        boxShadow: "0 2px 8px rgba(91, 33, 182,0.2)", flexShrink: 0,
      }}>
        <Link href="/community/messages" aria-label="Retour" style={{
          width: 32, height: 32, borderRadius: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", textDecoration: "none", fontSize: 20, flexShrink: 0,
        }}>←</Link>
        <Link href={other.user_id ? `/community/profil/${other.user_id}` : "#"} style={{
          display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "#fff", flex: 1, minWidth: 0,
        }}>
          {other.avatar_url ? (
            <img loading="lazy" decoding="async" src={other.avatar_url} alt={name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.1 }}>Conversation privée</div>
          </div>
        </Link>
        <Link href={`/community/messages/${conversationId}/call?mode=audio`} title="Appel audio" style={hdrBtn}>📞</Link>
        <Link href={`/community/messages/${conversationId}/call`} title="Appel vidéo" style={hdrBtn}>📹</Link>

        {/* Menu 3 points */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" style={{ ...hdrBtn, fontSize: 19, fontWeight: 700 }}>⋮</button>
          {menuOpen && (
            <div role="menu" style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40,
              minWidth: 224, background: T.card, color: T.text,
              border: `1px solid ${T.border}`, borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)", overflow: "hidden", padding: 4,
            }}>
              <button onClick={() => { setMenuOpen(false); setShowSearch(true); }} style={dmMenuItem}><span style={dmMenuIco}>🔍</span> Rechercher</button>
              {other.user_id && (
                <button onClick={() => { setMenuOpen(false); router.push(`/community/profil/${other.user_id}`); }} style={dmMenuItem}><span style={dmMenuIco}>👤</span> Afficher le profil</button>
              )}
              <button onClick={() => { setMenuOpen(false); setShowMedia(true); }} style={dmMenuItem}><span style={dmMenuIco}>🖼️</span> Média, docs et liens</button>
              <button onClick={toggleMute} style={dmMenuItem}><span style={dmMenuIco}>{muted ? "🔔" : "🔕"}</span> {muted ? "Réactiver le son" : "Mode silencieux"}</button>
              <div style={{ height: 1, background: T.borderSoft, margin: "4px 0" }} />
              <button onClick={reportUser} style={dmMenuItem}><span style={dmMenuIco}>🚩</span> Signaler</button>
              <button onClick={toggleBlock} style={{ ...dmMenuItem, color: blocked ? T.violet : "#C24B7A" }}><span style={dmMenuIco}>{blocked ? "✅" : "🚫"}</span> {blocked ? "Débloquer" : "Bloquer"}</button>
              <button onClick={clearChat} style={{ ...dmMenuItem, color: "#C24B7A" }}><span style={dmMenuIco}>🗑️</span> Effacer la discussion</button>
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche (ouverte depuis le menu ⋮) */}
      {showSearch && (
        <div style={{ flexShrink: 0, padding: "8px 12px", background: T.card, borderBottom: `1px solid ${T.borderSoft}`, display: "flex", gap: 8, alignItems: "center" }}>
          <input autoFocus type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher dans la conversation…"
            style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "9px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 999, color: T.text, fontSize: 14, fontFamily: F.body, outline: "none" }} />
          <button onClick={() => { setShowSearch(false); setSearch(""); }} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 13.5, flexShrink: 0 }}>Fermer</button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onClick={() => { setMenuFor(null); setReactPickerFor(null); setShowEmoji(false); }}
        className="ccb-chat-bg"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minWidth: 0, padding: "14px", background: T.bg }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "40px 14px" }}>
            Démarre la conversation avec {name} 👋
          </div>
        ) : visibleMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "40px 14px" }}>
            {search.trim() ? "Aucun message ne correspond à la recherche." : "Discussion effacée sur cet appareil."}
          </div>
        ) : (
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            {visibleMessages.map((m) => {
              const mine = m.sender_id === currentUserId;
              const parent = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
              const rx = reactionsFor(m.id);
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", position: "relative", minWidth: 0, maxWidth: "100%" }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); if (!m.is_deleted) setMenuFor(menuFor === m.id ? null : m.id); }}
                    style={{
                      maxWidth: "80%", minWidth: 0, overflowWrap: "anywhere", padding: "8px 12px", borderRadius: 14, cursor: "pointer",
                      background: mine ? T.violet : T.card,
                      color: mine ? "#fff" : T.text,
                      border: mine ? "none" : `1px solid ${T.border}`,
                      borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
                    }}>
                    {/* Reply context */}
                    {parent && !m.is_deleted && (
                      <div style={{
                        fontSize: 12, opacity: 0.85, borderLeft: `2px solid ${mine ? "rgba(255,255,255,0.6)" : T.gold}`,
                        paddingLeft: 8, marginBottom: 5, fontStyle: "italic",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240,
                      }}>
                        ↩ {parent.is_deleted ? "Message supprimé" : (parent.content || "📎 Pièce jointe")}
                      </div>
                    )}

                    {/* Attachment */}
                    {!m.is_deleted && m.attachment_url && (
                      <DmAttachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} mine={mine} />
                    )}

                    {/* Text */}
                    {(m.content || m.is_deleted) && (
                      <div style={{ fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", fontStyle: m.is_deleted ? "italic" : "normal", opacity: m.is_deleted ? 0.7 : 1, marginTop: m.attachment_url ? 6 : 0 }}>
                        {m.is_deleted ? "Message supprimé" : m.content}
                      </div>
                    )}
                    <div style={{ fontSize: 10, textAlign: "right", marginTop: 2, color: mine ? "rgba(255,255,255,0.7)" : T.textMuted }}>
                      {fmtTime(m.created_at)}{m.is_edited && !m.is_deleted ? " · modifié" : ""}
                    </div>
                  </div>

                  {/* Réactions affichées */}
                  {rx.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      {rx.map(([emoji, info]) => (
                        <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }} style={{
                          background: info.mine ? T.violetSoft : T.card, border: `1px solid ${info.mine ? T.violet : T.border}`,
                          borderRadius: 999, padding: "1px 7px", fontSize: 11.5, cursor: "pointer", color: T.text,
                        }}>{emoji} {info.count}</button>
                      ))}
                    </div>
                  )}

                  {/* Menu actions */}
                  {menuFor === m.id && !m.is_deleted && (
                    <div onClick={(e) => e.stopPropagation()} style={{
                      position: "absolute", top: -8, [mine ? "right" : "left"]: 0, zIndex: 10,
                      transform: "translateY(-100%)", background: T.card, border: `1px solid ${T.border}`,
                      borderRadius: 12, boxShadow: T.shadowMd, padding: 6, display: "flex", gap: 2,
                    } as React.CSSProperties}>
                      <button onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)} style={menuBtn}>😊</button>
                      <button onClick={() => { setReplyTo(m); setEditing(null); setMenuFor(null); }} style={menuBtn} title="Répondre">↩</button>
                      {mine && <button onClick={() => startEdit(m)} style={menuBtn} title="Modifier">✏️</button>}
                      {mine && <button onClick={() => deleteMessage(m)} style={{ ...menuBtn, color: "#C24B7A" }} title="Supprimer">🗑</button>}
                    </div>
                  )}

                  {/* Picker réactions */}
                  {reactPickerFor === m.id && (
                    <div onClick={(e) => e.stopPropagation()} style={{
                      position: "absolute", top: -8, [mine ? "right" : "left"]: 0, zIndex: 11,
                      transform: "translateY(-100%)", background: T.card, border: `1px solid ${T.border}`,
                      borderRadius: 16, boxShadow: T.shadowMd, padding: "5px 8px", display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 230,
                    } as React.CSSProperties}>
                      {REACTION_EMOJIS.map((e) => (
                        <button key={e} onClick={() => toggleReaction(m.id, e)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 2 }}>{e}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply / Edit / Pending preview */}
      {(replyTo || editing || pending) && (
        <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", padding: "8px 12px 0" }}>
          {replyTo && (
            <Bar onClose={() => setReplyTo(null)} label={`↩ Réponse à : ${replyTo.content || "📎 Pièce jointe"}`} />
          )}
          {editing && (
            <Bar onClose={() => { setEditing(null); setText(""); }} label="✏️ Modification du message" />
          )}
          {pending && (
            <Bar onClose={() => setPending(null)} label={`📎 ${pending.name}`} />
          )}
        </div>
      )}

      {/* Bloqué : le composer est remplacé par une bannière */}
      {blocked && (
        <div style={{ flexShrink: 0, padding: "12px 14px calc(12px + env(safe-area-inset-bottom, 0px))", background: T.card, borderTop: `1px solid ${T.borderSoft}`, textAlign: "center", fontSize: 13, color: T.textMuted }}>
          🚫 Vous avez bloqué {name}.{" "}
          <button onClick={toggleBlock} style={{ background: "none", border: "none", color: T.violet, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>Débloquer</button>
        </div>
      )}

      {/* Composer — style WhatsApp (pill + emoji/📎/📷 + bouton rond mic/envoi) */}
      <div style={{ display: blocked ? "none" : "block", padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${T.borderSoft}`, background: T.card, flexShrink: 0 }}>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,audio/*,video/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (fileRef.current) fileRef.current.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (camRef.current) camRef.current.value = ""; }} />
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end", position: "relative" }}>
          {/* Sélecteur d'emoji */}
          {showEmoji && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: 0, zIndex: 20,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: T.shadowMd,
              padding: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, width: "min(320px, 90vw)",
            }}>
              {COMPOSER_EMOJIS.map((e) => (
                <button key={e} onClick={() => insertEmoji(e)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 4, borderRadius: 8 }}>{e}</button>
              ))}
            </div>
          )}

          {/* Pill : emoji + texte + joindre + photo */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", gap: 2, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 22, padding: "2px 6px 2px 4px" }}>
            <button onClick={() => setShowEmoji((v) => !v)} title="Emoji" style={pillIcon}>😊</button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={editing ? "Modifier le message…" : "Message"}
              rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "9px 4px", background: "transparent", border: "none", color: T.text, fontSize: 15, fontFamily: F.body, outline: "none", resize: "none", maxHeight: 120, lineHeight: 1.4 }}
            />
            {!editing && <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Joindre un fichier" style={pillIcon}>{uploading ? "⏳" : "📎"}</button>}
            {!editing && <button onClick={() => camRef.current?.click()} title="Appareil photo" style={pillIcon}>📷</button>}
          </div>

          {/* Bouton rond : valider (édition) · sinon mic/envoi */}
          {editing ? (
            <button onClick={sendMessage} disabled={sending} title="Valider" style={roundSend}>✓</button>
          ) : (
            <VoiceComposerButton
              hasContent={!!text.trim() || !!pending}
              disabled={sending}
              color={T.violet} colorDark={T.violetDark}
              onSend={sendMessage}
              onVoice={sendVoice}
              onError={(m) => alert(m)}
            />
          )}
        </div>
      </div>

      {/* Média, docs et liens */}
      {showMedia && (
        <DmMediaModal messages={messages} onClose={() => setShowMedia(false)} />
      )}

    </div>
  );
}

const dmMenuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
  background: "none", border: "none", cursor: "pointer", color: T.text,
  fontSize: 14, fontFamily: F.body, padding: "10px 12px", borderRadius: 9,
};
const dmMenuIco: React.CSSProperties = { fontSize: 17, width: 22, textAlign: "center", flexShrink: 0 };

// ── Modal « Média, docs et liens » — listes extraites des messages ──
function DmMediaModal({ messages, onClose }: { messages: DmMessageRow[]; onClose: () => void }) {
  const medias = messages.filter((m) => !m.is_deleted && m.attachment_url);
  const images = medias.filter((m) => m.attachment_type === "image");
  const files = medias.filter((m) => m.attachment_type !== "image");
  const linkRe = /(https?:\/\/[^\s]+)/g;
  const links: string[] = [];
  for (const m of messages) {
    if (m.is_deleted || !m.content) continue;
    const found = m.content.match(linkRe);
    if (found) for (const l of found) if (!links.includes(l)) links.push(l);
  }
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(31,26,51,0.55)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: T.card, borderTop: `3px solid ${T.violet}`, borderRadius: "20px 20px 0 0",
        padding: "18px 16px calc(20px + env(safe-area-inset-bottom, 0px))",
        width: "100%", maxWidth: 560, maxHeight: "78vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: F.title, fontSize: 15, fontWeight: 700, color: T.violet }}>🖼️ Média, docs et liens</div>
          <button onClick={onClose} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 11px", color: T.textMuted, fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        {images.length === 0 && files.length === 0 && links.length === 0 && (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "30px 10px" }}>Aucun média partagé pour le moment.</div>
        )}

        {images.length > 0 && (
          <>
            <div style={dmMediaSection}>Images ({images.length})</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginBottom: 14 }}>
              {images.map((m) => (
                <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" style={{ display: "block", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", background: T.bg }}>
                  <img loading="lazy" decoding="async" src={m.attachment_url!} alt={m.attachment_name || "image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </a>
              ))}
            </div>
          </>
        )}

        {files.length > 0 && (
          <>
            <div style={dmMediaSection}>Documents ({files.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {files.map((m) => (
                <a key={m.id} href={m.attachment_url!} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: T.text, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 11px", fontSize: 13 }}>
                  <span style={{ fontSize: 18 }}>{m.attachment_type === "audio" ? "🎵" : m.attachment_type === "video" ? "🎬" : m.attachment_type === "pdf" ? "📄" : "📎"}</span>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.attachment_name || "Fichier"}</span>
                </a>
              ))}
            </div>
          </>
        )}

        {links.length > 0 && (
          <>
            <div style={dmMediaSection}>Liens ({links.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ color: T.violet, fontSize: 13, textDecoration: "none", wordBreak: "break-all", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 11px" }}>🔗 {l}</a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const dmMediaSection: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: T.textMuted, textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 8,
};

const pillIcon: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: T.textMuted,
  fontSize: 19, padding: "7px 6px", flexShrink: 0, lineHeight: 1,
};
const roundSend: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  color: "#fff", border: "none", fontSize: 18, cursor: "pointer",
  boxShadow: `0 3px 10px ${T.violet}44`,
};

function Bar({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: T.violetSoft,
      border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 10px", marginBottom: 6,
    }}>
      <span style={{ flex: 1, fontSize: 12.5, color: T.textSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: "italic" }}>{label}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14 }}>✕</button>
    </div>
  );
}

function DmAttachment({ url, type, name, mine }: { url: string; type: string | null; name: string | null; mine: boolean }) {
  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img loading="lazy" decoding="async" src={url} alt={name || "image"} style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 10, display: "block" }} />
      </a>
    );
  }
  if (type === "video") {
    return <video src={url} controls style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 10 }} />;
  }
  if (type === "audio") {
    return <audio src={url} controls style={{ maxWidth: 240 }} />;
  }
  const icon = type === "pdf" ? "📄" : "📎";
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
      color: mine ? "#fff" : T.violet, background: mine ? "rgba(255,255,255,0.12)" : T.violetSoft,
      borderRadius: 10, padding: "8px 10px", fontSize: 13, fontWeight: 600,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{name || "Fichier"}</span>
    </a>
  );
}

const hdrBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,0.16)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 15, flexShrink: 0, cursor: "pointer", color: "#fff", textDecoration: "none",
};
const menuBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", fontSize: 17,
  padding: "4px 7px", borderRadius: 8,
};
