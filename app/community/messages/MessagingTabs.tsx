"use client";

import Link from "next/link";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

/**
 * En-tête du module MESSAGERIE — page unique « Discussions ».
 * Plus d'onglets : privés + groupes sont fusionnés dans une seule liste.
 */
export default function MessagingTabs() {
  return (
    <div style={{ background: T.card, position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
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
    </div>
  );
}
