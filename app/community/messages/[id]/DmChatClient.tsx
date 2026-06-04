"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { DmMessageRow, DmOther } from "./page";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const name = other.display_name || "Membre";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
    <div style={{ background: T.bg, height: "calc(100dvh - var(--ccb-topbar-h, 62px) - var(--ccb-bottomnav-h, 0px))", display: "flex", flexDirection: "column", color: T.text, fontFamily: F.body }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 2px 10px rgba(90,44,160,0.2)", flexShrink: 0,
      }}>
        <Link href="/community/messages" aria-label="Retour" style={{
          width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", textDecoration: "none", fontSize: 17, flexShrink: 0,
        }}>←</Link>
        <Link href={other.user_id ? `/community/profil/${other.user_id}` : "#"} style={{
          display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff", flex: 1, minWidth: 0,
        }}>
          {other.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatar_url} alt={name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ fontSize: 10.5, opacity: 0.75 }}>Conversation privée</div>
          </div>
        </Link>
        <Link href={`/community/messages/${conversationId}/call?mode=audio`} title="Appel audio" style={hdrBtn}>📞</Link>
        <Link href={`/community/messages/${conversationId}/call`} title="Appel vidéo" style={hdrBtn}>📹</Link>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onClick={() => { setMenuFor(null); setReactPickerFor(null); }}
        style={{ flex: 1, overflowY: "auto", padding: "14px", background: T.bg }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "40px 14px" }}>
            Démarre la conversation avec {name} 👋
          </div>
        ) : (
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              const parent = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
              const rx = reactionsFor(m.id);
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", position: "relative" }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); if (!m.is_deleted) setMenuFor(menuFor === m.id ? null : m.id); }}
                    style={{
                      maxWidth: "80%", padding: "8px 12px", borderRadius: 14, cursor: "pointer",
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

      {/* Composer */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.borderSoft}`, background: T.card, flexShrink: 0 }}>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,audio/*,video/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); if (fileRef.current) fileRef.current.value = ""; }} />
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          {!editing && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Joindre un fichier" style={{
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "10px 12px",
              cursor: uploading ? "wait" : "pointer", color: T.textMuted, fontSize: 18, flexShrink: 0,
            }}>{uploading ? "⏳" : "📎"}</button>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={editing ? "Modifier le message…" : "Écris un message…"}
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            style={{ flex: 1, boxSizing: "border-box", padding: "10px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 18, color: T.text, fontSize: 14, fontFamily: F.body, outline: "none", resize: "none", maxHeight: 120 }}
          />
          <button onClick={sendMessage} disabled={sending || (!text.trim() && !pending)} style={{
            background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`, color: "#fff", border: "none",
            borderRadius: 14, padding: "10px 16px", cursor: sending || (!text.trim() && !pending) ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 16, opacity: (!text.trim() && !pending) ? 0.5 : 1, flexShrink: 0,
          }}>{editing ? "✓" : "➤"}</button>
        </div>
      </div>

    </div>
  );
}

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
        <img src={url} alt={name || "image"} style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 10, display: "block" }} />
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
  width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.16)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, flexShrink: 0, cursor: "pointer", color: "#fff", textDecoration: "none",
};
const menuBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", fontSize: 17,
  padding: "4px 7px", borderRadius: 8,
};
