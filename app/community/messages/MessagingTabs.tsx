"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

/**
 * Barre supérieure du module MESSAGERIE (style WhatsApp).
 * Deux onglets : 💬 Discussions (messages privés) · 👥 Groupes.
 * Sticky, onglet actif souligné en violet, dark via tokens communauté.
 *
 * Discussions → /community/messages
 * Groupes     → /community/groups
 */
export default function MessagingTabs() {
  const pathname = usePathname();
  const isGroups = pathname.startsWith("/community/groups");
  const isDiscussions = pathname.startsWith("/community/messages");

  return (
    <div style={{ background: T.card, position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "14px 14px 12px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/community" aria-label="Communauté" style={{
            background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, padding: "6px 11px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>←</Link>
          <h1 style={{ fontFamily: F.title, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            💬 Discussions
          </h1>
        </div>
      </div>

      {/* Onglets */}
      <div style={{
        maxWidth: 1080, margin: "0 auto", display: "flex", borderBottom: `1px solid ${T.border}`,
      }}>
        <Link href="/community/messages" style={tab(isDiscussions)}>💬 Discussions</Link>
        <Link href="/community/groups" style={tab(isGroups)}>🧭 Découvrir des groupes</Link>
      </div>
    </div>
  );
}

function tab(active: boolean): React.CSSProperties {
  return {
    flex: 1, textAlign: "center", padding: "13px 10px",
    textDecoration: "none", fontFamily: F.body, fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: active ? T.violet : T.textMuted,
    borderBottom: `2.5px solid ${active ? T.violet : "transparent"}`,
    transition: "color .15s, border-color .15s",
  };
}
