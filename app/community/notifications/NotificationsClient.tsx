"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

interface Notif {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  source_type: string;
  source_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface Actor {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  notifications: Notif[];
  actors: Actor[];
}

const TYPE_LABEL: Record<string, { icon: string; label: string }> = {
  mention_post:     { icon: "🔔", label: "t'a mentionné dans un post" },
  mention_comment:  { icon: "🔔", label: "t'a mentionné dans un commentaire" },
  reply_to_comment: { icon: "💬", label: "a répondu à ton commentaire" },
  like_post:        { icon: "❤️", label: "a aimé ton post" },
  reaction_amen:    { icon: "🙏", label: "a dit Amen à ton post" },
  reaction_fire:    { icon: "🔥", label: "a réagi 🔥 à ton post" },
  admin_announce:   { icon: "📣", label: "Annonce officielle" },
  system:           { icon: "ℹ️", label: "Information" },
};

function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationsClient({ notifications: initial, actors }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>(initial);
  const [busy, setBusy] = useState(false);

  const actorMap = useMemo(() =>
    Object.fromEntries(actors.map((a) => [a.user_id, a])),
    [actors],
  );

  const unreadCount = notifs.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    const supabase = createClient();
    const now = new Date().toISOString();
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: now } : n));
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setBusy(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    const ids = notifs.filter((n) => !n.read_at).map((n) => n.id);
    setNotifs((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: now }));
    await supabase.from("user_notifications").update({ read_at: now }).in("id", ids);
    setBusy(false);
  }

  async function deleteNotif(id: string) {
    const supabase = createClient();
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("user_notifications").delete().eq("id", id);
  }

  function notifUrl(n: Notif): string {
    if (n.source_type === "post" && n.source_id) return `/community#post-${n.source_id}`;
    if (n.source_type === "comment") return `/community`;
    return "/community";
  }

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Link href="/community" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none",
          }}>← Communauté</Link>
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={busy} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", border: "none",
              borderRadius: 8, padding: "6px 12px",
              fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer",
              marginLeft: "auto",
            }}>
              ✓ Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🔔</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Mes notifications
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""} · ${notifs.length} au total`
              : `${notifs.length} notification${notifs.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Liste */}
        {notifs.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "60px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucune notification pour l&apos;instant.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifs.map((n) => {
              const def = TYPE_LABEL[n.type] || { icon: "🔔", label: n.type };
              const actor = n.actor_id ? actorMap[n.actor_id] : null;
              const actorName = actor?.display_name || (n.payload?.actor_name as string) || "Quelqu'un";
              const excerpt = (n.payload?.excerpt as string) || "";
              const initials = actorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              const isUnread = !n.read_at;

              return (
                <div key={n.id} style={{
                  background: isUnread ? T.violetSoft : T.card,
                  border: `1px solid ${isUnread ? T.gold : T.border}`,
                  borderRadius: 12, padding: "12px 14px",
                  display: "flex", gap: 12,
                }}>
                  {/* Avatar acteur */}
                  {actor?.avatar_url ? (
                    <img loading="lazy" decoding="async" src={actor.avatar_url} alt=""
                      style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                    }}>{initials}</div>
                  )}

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.textSoft, marginBottom: 3 }}>
                      <span style={{ marginRight: 6 }}>{def.icon}</span>
                      <strong style={{ color: T.text }}>{actorName}</strong>{" "}
                      <span>{def.label}</span>
                    </div>
                    {excerpt && (
                      <div style={{
                        fontSize: 12, color: T.textMuted, fontStyle: "italic",
                        marginBottom: 6, lineHeight: 1.4,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                      }}>
                        « {excerpt} »
                      </div>
                    )}
                    <div style={{
                      display: "flex", gap: 10, fontSize: 11,
                      color: T.textMuted, alignItems: "center",
                    }}>
                      <span>{timeAgo(n.created_at)}</span>
                      {(n.source_id || n.source_type === "post") && (
                        <Link href={notifUrl(n)} onClick={() => markRead(n.id)}
                          style={{ color: T.gold, fontWeight: 700, textDecoration: "none" }}>
                          → Voir
                        </Link>
                      )}
                      {isUnread && (
                        <button onClick={() => markRead(n.id)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: T.gold, fontSize: 11, fontWeight: 600, padding: 0,
                        }}>
                          ✓ Lu
                        </button>
                      )}
                      <button onClick={() => deleteNotif(n.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: T.textMuted, fontSize: 11, padding: 0, marginLeft: "auto",
                      }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
