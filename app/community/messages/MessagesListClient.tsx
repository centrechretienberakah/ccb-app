"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MessagingTabs from "./MessagingTabs";
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
  const [items, setItems] = useState<ConversationLite[]>(conversations);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 80 }}>
      <MessagingTabs />
      <style>{`
        .ccb-conv-row .ccb-conv-del { color: ${T.textMuted}; opacity: .55; transition: opacity .15s, color .15s, background .15s; }
        .ccb-conv-row:hover .ccb-conv-del { opacity: 1; }
        .ccb-conv-del:hover { color: #DC2626 !important; opacity: 1 !important; background: rgba(220,38,38,0.10) !important; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {items.length === 0 ? (
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
            {items.map((c, i) => {
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
    </div>
  );
}
