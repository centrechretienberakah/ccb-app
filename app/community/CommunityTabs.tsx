"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

/**
 * Barre de navigation interne du module Communauté (style Skool).
 * 4 onglets : Fil d'actualité · Prions Ensemble · Groupes · Membres
 * + cloche notifications + lien modération (admins).
 *
 * - Sticky en haut de la zone de contenu
 * - Onglet actif détecté automatiquement via le pathname
 * - Responsive (scroll horizontal sur mobile)
 * - Réutilisable sur les 4 pages : /community, /community/prions-ensemble,
 *   /community/groups, /community/membres
 *
 * Les compteurs (membres, notifs non lues, rôle admin) sont passés en props
 * quand la page les a déjà récupérés côté serveur (pas de flicker), sinon
 * récupérés côté client en best-effort.
 */
interface Props {
  memberCount?: number;
  unreadNotifCount?: number;
  isAdmin?: boolean;
}

// "Groupes" + chat privé sont unifiés sous "Messagerie" (/community/messages).
const TABS = [
  { key: "feed",       label: "Fil d'actualité", emoji: "📰", href: "/community" },
  { key: "prayer",     label: "Prions Ensemble", emoji: "🙏", href: "/community/prions-ensemble" },
  { key: "messagerie", label: "Messagerie",      emoji: "💬", href: "/community/messages" },
  { key: "members",    label: "Membres",         emoji: "👥", href: "/community/membres" },
] as const;

export default function CommunityTabs({ memberCount, unreadNotifCount, isAdmin }: Props) {
  const pathname = usePathname();

  const [counts, setCounts] = useState<{ members?: number; unread?: number; admin?: boolean }>({
    members: memberCount,
    unread: unreadNotifCount,
    admin: isAdmin,
  });

  // Récupération best-effort côté client si les valeurs ne sont pas fournies
  useEffect(() => {
    if (memberCount !== undefined && unreadNotifCount !== undefined && isAdmin !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        const next: { members?: number; unread?: number; admin?: boolean } = {};
        if (memberCount === undefined) {
          const { count } = await sb.from("user_profiles")
            .select("user_id", { count: "exact", head: true }).eq("is_public", true);
          next.members = count ?? undefined;
        }
        if (user && unreadNotifCount === undefined) {
          try {
            const { count } = await sb.from("user_notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id).is("read_at", null);
            next.unread = count ?? 0;
          } catch { /* table absente */ }
        }
        if (user && isAdmin === undefined) {
          try {
            const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
            const r = (data as { role?: string } | null)?.role;
            next.admin = !!r && ["owner", "admin", "leader", "moderator"].includes(r);
          } catch { /* noop */ }
        }
        if (!cancelled) setCounts((prev) => ({ ...prev, ...next }));
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isActive(href: string) {
    if (href === "/community") return pathname === "/community";
    // Messagerie englobe les conversations privées ET les groupes
    if (href === "/community/messages") {
      return pathname.startsWith("/community/messages") || pathname.startsWith("/community/groups");
    }
    return pathname.startsWith(href);
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      background: T.card, borderBottom: `1px solid ${T.border}`,
      boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
    }}>
      <style>{`.ccb-comm-tabs::-webkit-scrollbar{display:none;}`}</style>
      <div className="ccb-comm-tabs" style={{
        maxWidth: 1080, margin: "0 auto",
        display: "flex", alignItems: "center",
        overflowX: "auto", scrollbarWidth: "none",
        gap: 0, padding: "0 4px",
      }}>
        {TABS.map((t) => {
          const active = isActive(t.href);
          const showCount = t.key === "members" && counts.members !== undefined;
          return (
            <Link key={t.key} href={t.href} style={{
              padding: "13px 16px", textDecoration: "none",
              fontFamily: F.body, fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? T.violet : T.textMuted,
              borderBottom: `2px solid ${active ? T.violet : "transparent"}`,
              whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6,
              transition: "color .15s, border-color .15s",
            }}>
              <span style={{ fontSize: 15 }}>{t.emoji}</span>
              <span>{t.label}{showCount ? ` (${counts.members})` : ""}</span>
            </Link>
          );
        })}

        {/* Cloche notifications */}
        <Link href="/community/notifications" title="Mes notifications" style={{
          marginLeft: "auto", padding: "8px 12px",
          position: "relative", flexShrink: 0,
          textDecoration: "none", color: T.textSoft,
          display: "flex", alignItems: "center", fontSize: 17,
        }}>
          🔔
          {(counts.unread ?? 0) > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 2,
              background: "#C24B7A", color: "#fff",
              fontSize: 9, fontWeight: 700,
              borderRadius: 999, padding: "1px 5px",
              minWidth: 14, textAlign: "center",
              border: `1.5px solid ${T.card}`,
            }}>
              {(counts.unread ?? 0) > 99 ? "99+" : counts.unread}
            </span>
          )}
        </Link>

        {/* Modération (admins) */}
        {counts.admin && (
          <Link href="/community/admin" style={{
            padding: "6px 14px", fontSize: 11,
            background: T.violetSoft, color: T.violet, fontWeight: 700,
            borderRadius: 999, textDecoration: "none", flexShrink: 0,
            border: `1px solid ${T.violet}`,
            alignSelf: "center", marginRight: 10,
          }}>
            🛡️ Modération
          </Link>
        )}
      </div>
    </div>
  );
}
