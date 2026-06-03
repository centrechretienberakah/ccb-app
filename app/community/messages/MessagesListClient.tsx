"use client";

import Link from "next/link";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { ConversationLite } from "./page";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MessagesListClient({ conversations }: { conversations: ConversationLite[]; currentUserId: string }) {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "20px 16px 18px", position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/community" style={{
            background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, padding: "6px 11px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>←</Link>
          <h1 style={{ fontFamily: F.title, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            💬 Messages
          </h1>
          <Link href="/community/messages/new" title="Nouveau groupe" style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 999, padding: "7px 14px", color: "#fff", fontSize: 12.5, fontWeight: 700,
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
          }}>👥 Nouveau groupe</Link>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {conversations.length === 0 ? (
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
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {conversations.map((c, i) => {
              const name = c.type === "group" ? (c.title || "Groupe privé") : (c.otherName || "Membre");
              const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={c.id} href={`/community/messages/${c.id}`} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 14px", textDecoration: "none", color: T.text,
                  borderTop: i === 0 ? "none" : `1px solid ${T.borderSoft}`,
                  background: c.unread ? "rgba(90,44,160,0.04)" : "transparent",
                }}>
                  {c.otherAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
