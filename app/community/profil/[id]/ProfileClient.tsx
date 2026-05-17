"use client";

import Link from "next/link";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F, getPostKindDef } from "@/lib/community/theme";
import {
  getRank, progressToNextRank, computeBadges, type MemberStats,
} from "@/lib/community/gamification";
import { useOnlineUsers } from "@/lib/presence";

function fmtJoinDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtPresence(iso: string | null, online: boolean): { label: string; color: string; dot: string } {
  if (online) return { label: "En ligne", color: "#2E9B47", dot: "🟢" };
  if (!iso) return { label: "Jamais connecté", color: "#857C95", dot: "⚪" };
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return { label: "à l'instant", color: "#2E9B47", dot: "🟢" };
  if (diff < 3600) return { label: `vu il y a ${Math.floor(diff / 60)} min`, color: "#857C95", dot: "⚪" };
  if (diff < 86400) return { label: `vu il y a ${Math.floor(diff / 3600)} h`, color: "#857C95", dot: "⚪" };
  if (diff < 86400 * 7) return { label: `vu il y a ${Math.floor(diff / 86400)} j`, color: "#857C95", dot: "⚪" };
  return { label: `vu le ${new Date(iso).toLocaleDateString("fr-FR")}`, color: "#857C95", dot: "⚪" };
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cell_group: string | null;
  testimony: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  last_seen_at: string | null;
}

interface RecentPost {
  id: string;
  content: string;
  post_kind: string | null;
  created_at: string;
}

interface Props {
  profile: Profile;
  stats: MemberStats;
  xp: number;
  milestones: string[];
  recentPosts: RecentPost[];
  isMe: boolean;
}

const MILESTONE_DEF: Record<string, { label: string; icon: string }> = {
  baptism_water:    { label: "Baptême d'eau",           icon: "💧" },
  baptism_spirit:   { label: "Baptême du Saint-Esprit", icon: "🔥" },
  cell_member:      { label: "Membre de cellule",       icon: "👥" },
  school_of_faith:  { label: "École de la foi",         icon: "📖" },
  leadership_track: { label: "Parcours leadership",     icon: "⭐" },
  missions:         { label: "Missions",                icon: "🌍" },
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr); const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function ProfileClient({ profile, stats, xp, milestones, recentPosts, isMe }: Props) {
  const rank = getRank(xp);
  const progress = progressToNextRank(xp);
  const badges = computeBadges(stats);
  const initials = (profile.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const online = useOnlineUsers();
  const isOnline = online.has(profile.user_id);
  const presence = fmtPresence(profile.last_seen_at, isOnline);
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const joinedOn = fmtJoinDate(profile.created_at);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Link href="/community/membres" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Membres</Link>
          {isMe && (
            <Link href="/profile" style={{
              background: T.violet, border: "none",
              borderRadius: 8, padding: "6px 12px",
              color: "#fff", fontSize: 12, fontWeight: 700,
              textDecoration: "none", fontFamily: F.body,
            }}>✏️ Modifier mon profil</Link>
          )}
        </div>

        {/* Carte profil + rang */}
        <div style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff", borderRadius: 20, padding: "24px 22px",
          marginBottom: 20, position: "relative", overflow: "hidden",
          boxShadow: T.shadowMd,
        }}>
          {/* Or accent */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.gold}, transparent)`,
          }} />

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
            {/* Avatar */}
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name || ""}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.gold}`, flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 700, color: T.black,
                border: `2px solid ${T.gold}`,
              }}>{initials}</div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: F.title, fontSize: 22, fontWeight: 700,
                margin: "0 0 4px",
              }}>
                {profile.display_name || "Membre"}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {profile.cell_group && (
                  <span style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 999, padding: "2px 10px",
                    fontSize: 11, fontWeight: 600,
                  }}>
                    👥 {profile.cell_group}
                  </span>
                )}
                {location && (
                  <span style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 999, padding: "2px 10px",
                    fontSize: 11, fontWeight: 500,
                  }}>
                    📍 {location}
                  </span>
                )}
                <span style={{
                  background: isOnline ? "rgba(46,155,71,0.25)" : "rgba(255,255,255,0.12)",
                  border: isOnline ? "1px solid rgba(46,155,71,0.6)" : "1px solid transparent",
                  borderRadius: 999, padding: "2px 10px",
                  fontSize: 11, fontWeight: 600,
                  color: isOnline ? "#a8f0bc" : "rgba(255,255,255,0.85)",
                }}>
                  {presence.dot} {presence.label}
                </span>
              </div>
            </div>
          </div>

          {/* Bandeau infos (inscription) */}
          {joinedOn && (
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.7)",
              marginTop: 14, marginBottom: 4,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              📅 Membre depuis le <strong style={{ color: "#fff" }}>{joinedOn}</strong>
            </div>
          )}

          {/* Rang + progression */}
          <div style={{
            background: "rgba(0,0,0,0.18)", borderRadius: 12,
            padding: "12px 14px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8, fontFamily: F.body,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{rank.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{rank.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{xp} XP</div>
                </div>
              </div>
              {progress.next && (
                <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  <div>Prochain : {progress.next.emoji} {progress.next.label}</div>
                  <div>{progress.toGo} XP restants</div>
                </div>
              )}
            </div>
            <div style={{
              height: 6, background: "rgba(255,255,255,0.15)",
              borderRadius: 3, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${Math.round(progress.pct * 100)}%`,
                background: T.gold, transition: "width 0.4s",
              }} />
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: 14, marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}>
              À propos
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* Témoignage */}
        {profile.testimony && (
          <div style={{
            background: T.card, borderLeft: `3px solid ${T.gold}`,
            borderRadius: "0 14px 14px 0",
            border: `1px solid ${T.borderSoft}`, borderLeftWidth: 3,
            padding: 14, marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.gold,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}>
              ✨ Témoignage
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textSoft, lineHeight: 1.6, fontStyle: "italic" }}>
              « {profile.testimony} »
            </p>
          </div>
        )}

        {/* Stats grille */}
        <SectionTitle>📊 Statistiques</SectionTitle>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 22,
        }}>
          <StatChip label="Posts publiés" value={stats.posts} accent={T.violet} />
          <StatChip label="Commentaires" value={stats.comments} accent={T.gold} />
          <StatChip label="Likes reçus" value={stats.likesReceived} accent={T.violet} />
          <StatChip label="Témoignages" value={stats.testimonies} accent={T.gold} />
        </div>

        {/* Badges */}
        <SectionTitle>🏆 Badges</SectionTitle>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10, marginBottom: 22,
        }}>
          {badges.map((b) => (
            <div key={b.id} style={{
              background: b.achieved ? T.card : "transparent",
              border: `1px solid ${b.achieved ? T.gold : T.border}`,
              borderRadius: 12, padding: "12px 10px",
              textAlign: "center", opacity: b.achieved ? 1 : 0.55,
            }}>
              <div style={{
                fontSize: 26, marginBottom: 4,
                filter: b.achieved ? "none" : "grayscale(100%)",
              }}>{b.emoji}</div>
              <div style={{
                fontFamily: F.title, fontSize: 12, fontWeight: 700,
                color: b.achieved ? T.text : T.textMuted, marginBottom: 3,
              }}>
                {b.label}
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.35 }}>
                {b.description}
              </div>
            </div>
          ))}
        </div>

        {/* Jalons spirituels */}
        {milestones.length > 0 && (
          <>
            <SectionTitle>🌟 Jalons spirituels</SectionTitle>
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22,
            }}>
              {milestones.map((mk) => {
                const def = MILESTONE_DEF[mk];
                if (!def) return null;
                return (
                  <div key={mk} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 999, padding: "6px 14px",
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: T.textSoft, fontWeight: 600,
                  }}>
                    <span>{def.icon}</span>{def.label}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Publications récentes */}
        {recentPosts.length > 0 && (
          <>
            <SectionTitle>📝 Publications récentes</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentPosts.map((p) => {
                const k = getPostKindDef(p.post_kind);
                return (
                  <div key={p.id} style={{
                    background: T.card, border: `1px solid ${T.borderSoft}`,
                    borderRadius: 12, padding: "10px 14px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      marginBottom: 6, fontSize: 11,
                    }}>
                      <span style={{ color: k.color, fontWeight: 700 }}>{k.emoji} {k.label}</span>
                      <span style={{ color: T.textMuted }}>· {timeAgo(p.created_at)}</span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13, color: T.textSoft,
                      lineHeight: 1.5,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
                    }}>
                      {p.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: F.title, fontSize: 13, fontWeight: 700,
      color: T.textMuted, textTransform: "uppercase",
      letterSpacing: "0.1em", margin: "6px 0 10px",
    }}>
      {children}
    </h2>
  );
}

function StatChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "12px 14px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: accent,
      }} />
      <div style={{
        fontFamily: F.title, fontSize: 22, fontWeight: 700,
        color: T.text, lineHeight: 1, marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </div>
    </div>
  );
}
