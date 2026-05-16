"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { RANKS, getRank, computeBadges, type MemberStats } from "@/lib/community/gamification";

interface MemberLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  stats: MemberStats;
  xp: number;
}

interface Props {
  members: MemberLite[];
  currentUserId: string;
}

export default function MembersClient({ members, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (m.display_name || "").toLowerCase();
        const cell = (m.cell_group || "").toLowerCase();
        if (!name.includes(q) && !cell.includes(q)) return false;
      }
      if (rankFilter) {
        const r = getRank(m.xp);
        if (r.id !== rankFilter) return false;
      }
      return true;
    });
  }, [members, search, rankFilter]);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/community" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Communauté</Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>👥</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Classement des membres
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            {members.length} disciples — du Disciple Débutant à l'Ambassadeur Berakah
          </p>
        </div>

        {/* Search + Filtre rang */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un membre…"
            style={{
              width: "100%", padding: "12px 14px",
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 12, color: T.text, fontSize: 14,
              fontFamily: F.body, outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setRankFilter("")} style={chipStyle(rankFilter === "")}>
              📚 Tous
            </button>
            {RANKS.map((r) => (
              <button key={r.id} onClick={() => setRankFilter(rankFilter === r.id ? "" : r.id)}
                style={chipStyle(rankFilter === r.id, r.color)}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🔎</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>Aucun membre trouvé.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((m, i) => {
              const rank = getRank(m.xp);
              const isMe = m.user_id === currentUserId;
              const badges = computeBadges(m.stats).filter((b) => b.achieved);
              const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={m.user_id} href={`/community/profil/${m.user_id}`} style={{
                  textDecoration: "none", color: T.text,
                }}>
                  <div style={{
                    background: T.card, border: `1px solid ${isMe ? T.violet : T.border}`,
                    borderRadius: 14, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                    position: "relative",
                  }}>
                    {/* Position */}
                    <div style={{
                      width: 26, textAlign: "center", fontFamily: F.title,
                      fontWeight: 700, fontSize: 14,
                      color: i < 3 ? T.gold : T.textMuted,
                    }}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.display_name || ""}
                        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 17, fontWeight: 700, color: "#fff",
                      }}>{initials}</div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: F.title, fontSize: 14, fontWeight: 700, color: T.text }}>
                          {m.display_name || "Membre"}
                        </span>
                        {isMe && (
                          <span style={{
                            background: T.violet, color: "#fff",
                            fontSize: 9, fontWeight: 700, padding: "1px 6px",
                            borderRadius: 999,
                          }}>VOUS</span>
                        )}
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginTop: 3,
                        fontSize: 11, color: rank.color, fontWeight: 700,
                      }}>
                        <span>{rank.emoji}</span>
                        <span>{rank.label}</span>
                        <span style={{ color: T.textMuted, fontWeight: 500 }}>· {m.xp} XP</span>
                      </div>
                      {badges.length > 0 && (
                        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                          {badges.slice(0, 6).map((b) => (
                            <span key={b.id} title={b.label} style={{ fontSize: 14 }}>{b.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ color: T.violet, fontSize: 16, flexShrink: 0 }}>→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function chipStyle(active: boolean, color?: string): React.CSSProperties {
  const c = color ?? T.violet;
  return {
    padding: "6px 12px",
    background: active ? `${c}1f` : T.card,
    border: `1px solid ${active ? c : T.border}`,
    color: active ? c : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
  };
}
