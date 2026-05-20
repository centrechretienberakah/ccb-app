"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JDTV_THEME as T, JDTV_FONTS as F } from "@/lib/jdtv/theme";

export interface LiveMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
}

interface Props {
  videoId: string;
  initialMessages: LiveMessage[];
  isAuth: boolean;
  currentUserId: string | null;
  isStaff: boolean;
}

export default function LiveChat({ videoId, initialMessages, isAuth, currentUserId, isStaff }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<LiveMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Realtime
    const supabase = createClient();
    const channel = supabase.channel(`jdtv-live-${videoId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "jdtv_live_messages",
        filter: `video_id=eq.${videoId}`,
      }, async (payload) => {
        const row = payload.new as { id: string; user_id: string; body: string; created_at: string };
        if (messages.some((m) => m.id === row.id)) return;
        const { data: prof } = await supabase
          .from("user_profiles").select("display_name, avatar_url").eq("user_id", row.user_id).maybeSingle();
        const p = (prof ?? null) as { display_name: string | null; avatar_url: string | null } | null;
        const enriched: LiveMessage = {
          id: row.id, user_id: row.user_id, body: row.body, created_at: row.created_at,
          user_display_name: p?.display_name ?? null,
          user_avatar_url: p?.avatar_url ?? null,
        };
        setMessages((arr) => arr.some((m) => m.id === enriched.id) ? arr : [...arr, enriched]);
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "jdtv_live_messages",
        filter: `video_id=eq.${videoId}`,
      }, (payload) => {
        const id = (payload.old as { id: string }).id;
        setMessages((arr) => arr.filter((m) => m.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [videoId, messages]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    if (busy || !text.trim()) return;
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/`); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const body = text.trim().slice(0, 500);
    const { error } = await supabase.from("jdtv_live_messages")
      .insert({ video_id: videoId, user_id: user.id, body });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setText("");
  }

  async function deleteMessage(m: LiveMessage) {
    const supabase = createClient();
    const { error } = await supabase.from("jdtv_live_messages").delete().eq("id", m.id);
    if (error) { alert(error.message); return; }
    setMessages((arr) => arr.filter((x) => x.id !== m.id));
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      overflow: "hidden", height: 480,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 8, background: T.surface2,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999, background: T.live,
          animation: "jdtvPulse 1.4s ease-in-out infinite",
        }} />
        <h3 style={{ margin: 0, fontFamily: F.title, fontSize: 16, color: T.text }}>Chat en direct</h3>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.textMuted }}>{messages.length} msg</span>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, overflowY: "auto", padding: "12px 12px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.textMuted, fontSize: 13, marginTop: 32 }}>
            🎙️ Sois le premier à dire quelque chose
          </div>
        ) : messages.map((m) => {
          const name = m.user_display_name ?? "Anonyme";
          const isOwner = m.user_id === currentUserId;
          return (
            <div key={m.id} style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              fontSize: 13, lineHeight: 1.4,
            }}>
              <div style={{
                flex: "0 0 28px", width: 28, height: 28, borderRadius: 999,
                background: T.violet, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, overflow: "hidden",
              }}>
                {m.user_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user_avatar_url} alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : name[0]?.toUpperCase() ?? "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: T.violet, marginBottom: 1 }}>{name}</div>
                <div style={{ color: T.textSoft, wordBreak: "break-word" }}>{m.body}</div>
              </div>
              {(isOwner || isStaff) ? (
                <button onClick={() => deleteMessage(m)} title="Supprimer"
                  style={{
                    background: "transparent", color: T.textMuted, border: "none",
                    cursor: "pointer", fontSize: 12,
                  }}>×</button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: 10, display: "flex", gap: 8 }}>
        {isAuth ? (
          <>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Écris un message..."
              maxLength={500}
              style={{
                flex: 1, padding: "8px 12px",
                background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
                borderRadius: 999, fontSize: 13, fontFamily: F.body,
              }}
            />
            <button onClick={send} disabled={busy || !text.trim()}
              style={{
                padding: "8px 16px", background: T.violet, color: "#fff", border: "none",
                borderRadius: 999, fontWeight: 700, fontSize: 13,
                cursor: busy || !text.trim() ? "not-allowed" : "pointer",
                opacity: busy || !text.trim() ? 0.5 : 1,
              }}>➤</button>
          </>
        ) : (
          <Link href="/auth/login" style={{
            flex: 1, textAlign: "center", padding: "8px 16px",
            background: T.violet, color: "#fff", borderRadius: 999,
            fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>Se connecter pour participer</Link>
        )}
      </div>
    </div>
  );
}
