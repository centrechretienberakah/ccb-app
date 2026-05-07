"use client";

import { useState } from "react";
import Link from "next/link";

export interface Notification {
  id: string;
  user_id: string;
  type: "like" | "comment" | "prayer_reply" | "intercession" | "new_post" | "system";
  title: string;
  body: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  prayer_reply: "🙏",
  intercession: "✨",
  new_post: "📝",
  system: "🔔",
};

const TYPE_COLOR: Record<string, string> = {
  like: "var(--error)",
  comment: "var(--violet-light)",
  prayer_reply: "var(--gold)",
  intercession: "var(--gold)",
  new_post: "var(--violet-light)",
  system: "var(--text-secondary)",
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr); const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications] = useState<Notification[]>(initial);
  const [filter, setFilter] = useState<string>("all");

  const filters = [
    { key: "all", label: "Toutes" },
    { key: "like", label: "❤️ J'aime" },
    { key: "comment", label: "💬 Commentaires" },
    { key: "prayer_reply", label: "🙏 Prières" },
    { key: "new_post", label: "📝 Publications" },
    { key: "system", label: "🔔 Système" },
  ];

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "13px 16px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {filters.map((f) => (
            <button key={f.key} style={tabStyle(filter === f.key)} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px 100px" }}>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {filter === "all" ? "Vous êtes à jour !" : "Aucune notification dans cette catégorie."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((n) => {
            const icon = TYPE_ICON[n.type] ?? "🔔";
            const color = TYPE_COLOR[n.type] ?? "var(--text-secondary)";
            const card = (
              <div
                key={n.id}
                style={{
                  background: n.is_read ? "var(--card-bg)" : "var(--surface)",
                  border: `1px solid ${n.is_read ? "var(--border-subtle)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 16px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  cursor: n.link_url ? "pointer" : "default",
                  transition: "background 0.15s ease",
                  textDecoration: "none",
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: `${color}18`,
                  border: `1px solid ${color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                      {n.title}
                    </div>
                    {!n.is_read && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            );

            return n.link_url ? (
              <Link key={n.id} href={n.link_url} style={{ textDecoration: "none" }}>
                {card}
              </Link>
            ) : (
              <div key={n.id}>{card}</div>
            );
          })}
        </div>
      )}

      {/* Empty state — first-time users */}
      {notifications.length === 0 && (
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "24px 20px",
          marginTop: 16,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
            Les notifications apparaîtront ici quand quelqu'un réagit à vos prières, posts ou activités communautaires.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/community" style={{ background: "linear-gradient(135deg, var(--gold-dark), var(--gold))", border: "none", borderRadius: "var(--radius-full)", padding: "10px 20px", color: "#000", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Rejoindre la communauté
            </Link>
            <Link href="/prayer" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "10px 20px", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Mur de prière
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
