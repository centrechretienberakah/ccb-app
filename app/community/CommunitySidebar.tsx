"use client";

import Link from "next/link";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { getRank } from "@/lib/community/gamification";
import { useOnlineUsers } from "@/lib/presence";

interface TopContributor {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
}

interface PinnedPost {
  id: string;
  content: string;
  user_id: string;
  display_name: string | null;
}

interface Props {
  contributors: TopContributor[];
  pinned: PinnedPost[];
  members: { user_id: string; display_name: string | null; avatar_url: string | null }[];
}

export default function CommunitySidebar({ contributors, pinned, members }: Props) {
  const online = useOnlineUsers();
  const onlineMembers = members
    .filter((m) => online.has(m.user_id))
    .slice(0, 10);

  return (
    <aside style={{
      display: "flex", flexDirection: "column", gap: 14,
      position: "sticky", top: 80, maxHeight: "calc(100vh - 100px)",
      overflowY: "auto",
    }}>
      {/* Membres en ligne */}
      <SidebarBlock title={`🟢 En ligne (${onlineMembers.length})`}>
        {onlineMembers.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textMuted, padding: "8px 0" }}>
            Personne pour l&apos;instant
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {onlineMembers.map((m) => {
              const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={m.user_id} href={`/community/profil/${m.user_id}`} title={m.display_name || ""}
                  style={{ textDecoration: "none", position: "relative" }}>
                  {m.avatar_url ? (
                    <img loading="lazy" decoding="async" src={m.avatar_url} alt={m.display_name || ""}
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.card}` }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff",
                      border: `2px solid ${T.card}`,
                    }}>{initials}</div>
                  )}
                  <span style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#2E9B47", border: `2px solid ${T.card}`,
                  }} />
                </Link>
              );
            })}
          </div>
        )}
      </SidebarBlock>

      {/* Top contributeurs */}
      <SidebarBlock title="🏆 Top contributeurs">
        {contributors.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textMuted, padding: "8px 0" }}>
            Aucune activité encore.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contributors.slice(0, 5).map((c, i) => {
              const rank = getRank(c.xp);
              const initials = (c.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={c.user_id} href={`/community/profil/${c.user_id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    textDecoration: "none", color: T.text,
                    padding: "4px 0",
                  }}>
                  <div style={{
                    width: 18, textAlign: "center", fontFamily: F.title,
                    fontWeight: 700, fontSize: 12,
                    color: i < 3 ? T.gold : T.textMuted,
                  }}>{i + 1}</div>
                  {c.avatar_url ? (
                    <img loading="lazy" decoding="async" src={c.avatar_url} alt={c.display_name || ""}
                      style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                    }}>{initials}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: F.body, fontSize: 12, fontWeight: 600,
                      color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {c.display_name || "Membre"}
                    </div>
                    <div style={{ fontSize: 10, color: rank.color, fontWeight: 700 }}>
                      {rank.emoji} {c.xp} XP
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <Link href="/community/membres" style={{
          display: "block", marginTop: 8, textAlign: "center",
          fontSize: 11, color: T.violet, fontWeight: 700,
          textDecoration: "none",
        }}>
          Voir tout le classement →
        </Link>
      </SidebarBlock>

      {/* Annonces épinglées */}
      {pinned.length > 0 && (
        <SidebarBlock title="📌 Épinglés">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pinned.map((p) => (
              <div key={p.id} style={{
                padding: "8px 10px",
                background: T.surface2,
                borderLeft: `3px solid ${T.gold}`,
                borderRadius: "0 8px 8px 0",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: T.violet,
                  marginBottom: 3,
                }}>
                  {p.display_name || "Membre"}
                </div>
                <div style={{
                  fontSize: 12, color: T.textSoft, lineHeight: 1.5,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                }}>
                  {p.content}
                </div>
              </div>
            ))}
          </div>
        </SidebarBlock>
      )}
    </aside>
  );
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "14px 16px",
      boxShadow: T.shadowSoft,
    }}>
      <div style={{
        fontFamily: F.title, fontSize: 12, fontWeight: 700,
        color: T.textMuted, textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
