"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { DmMessageRow, DmOther } from "./page";

interface Props {
  conversationId: string;
  currentUserId: string;
  other: DmOther;
  initialMessages: DmMessageRow[];
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function DmChatClient({ conversationId, currentUserId, other, initialMessages }: Props) {
  const [messages, setMessages] = useState<DmMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const name = other.display_name || "Membre";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Auto-scroll en bas
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Realtime : nouveaux messages de cette conversation
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dm_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const m = payload.new as DmMessageRow;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        // marque lu (best-effort) si message reçu
        if (m.sender_id !== currentUserId) {
          void supabase.from("conversation_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId).eq("user_id", currentUserId);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "dm_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const m = payload.new as DmMessageRow;
        setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  async function sendMessage() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("dm_messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content: t })
      .select("id, sender_id, content, attachment_url, attachment_type, attachment_name, reply_to_id, is_pinned, is_edited, is_deleted, created_at")
      .single();
    if (!error && data) {
      const row = data as DmMessageRow;
      setMessages((prev) => prev.some((x) => x.id === row.id) ? prev : [...prev, row]);
      setText("");
      // Met à jour last_message_at de la conversation (pour le tri de la liste)
      void supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  }

  return (
    <div style={{ background: T.bg, height: "100dvh", display: "flex", flexDirection: "column", color: T.text, fontFamily: F.body }}>
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
            <div style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14,
            }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ fontSize: 10.5, opacity: 0.75 }}>Conversation privée</div>
          </div>
        </Link>
        {/* Appels privés (réutilise CCB Meet / LiveKit) */}
        <Link href={`/community/messages/${conversationId}/call?mode=audio`} title="Appel audio" style={callBtn}>📞</Link>
        <Link href={`/community/messages/${conversationId}/call`} title="Appel vidéo" style={callBtn}>📹</Link>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", background: T.bg }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "40px 14px" }}>
            Démarre la conversation avec {name} 👋
          </div>
        ) : (
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "78%", padding: "8px 12px", borderRadius: 14,
                    background: mine ? T.violet : T.card,
                    color: mine ? "#fff" : T.text,
                    border: mine ? "none" : `1px solid ${T.border}`,
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                  }}>
                    <div style={{ fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", fontStyle: m.is_deleted ? "italic" : "normal", opacity: m.is_deleted ? 0.7 : 1 }}>
                      {m.is_deleted ? "Message supprimé" : m.content}
                    </div>
                    <div style={{ fontSize: 10, textAlign: "right", marginTop: 2, color: mine ? "rgba(255,255,255,0.7)" : T.textMuted }}>
                      {fmtTime(m.created_at)}{m.is_edited && !m.is_deleted ? " · modifié" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.borderSoft}`, background: T.card, flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écris un message…"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            style={{
              flex: 1, boxSizing: "border-box", padding: "10px 14px",
              background: T.bg, border: `1px solid ${T.border}`, borderRadius: 18,
              color: T.text, fontSize: 14, fontFamily: F.body, outline: "none", resize: "none",
              maxHeight: 120,
            }}
          />
          <button onClick={sendMessage} disabled={sending || !text.trim()} style={{
            background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
            color: "#fff", border: "none", borderRadius: 14, padding: "10px 16px",
            cursor: sending || !text.trim() ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 16, opacity: !text.trim() ? 0.5 : 1, flexShrink: 0,
          }}>➤</button>
        </div>
      </div>
    </div>
  );
}

const callBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.16)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, flexShrink: 0, cursor: "pointer", color: "#fff", textDecoration: "none",
};
