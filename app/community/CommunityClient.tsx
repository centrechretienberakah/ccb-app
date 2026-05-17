"use client";

import Link from "next/link";
import FeedClient, { Post, Category } from "./FeedClient";
import CommunitySidebar from "./CommunitySidebar";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";

interface Member {
  user_id: string; display_name: string | null; avatar_url: string | null;
  bio: string | null; cell_group: string | null; testimony: string | null;
}

interface TopContributor {
  user_id: string; display_name: string | null; avatar_url: string | null; xp: number;
}
interface PinnedSidebarPost {
  id: string; content: string; user_id: string; display_name: string | null;
}

interface Props {
  members: Member[];
  currentUserId: string;
  currentUserProfile: any;
  isAdmin: boolean;
  memberMilestones?: Record<string, string[]>; // gardé pour compat page.tsx, non utilisé
  posts: Post[]; categories: Category[];
  userLikedPostIds: string[];
  userBookmarkedPostIds?: string[];
  userVotes: Record<string, number>;
  topContributors?: TopContributor[];
  pinnedPosts?: PinnedSidebarPost[];
  unreadNotifCount?: number;
}

export default function CommunityClient({
  members, currentUserId, currentUserProfile, isAdmin,
  posts, categories,
  userLikedPostIds, userBookmarkedPostIds, userVotes,
  topContributors = [], pinnedPosts = [], unreadNotifCount = 0,
}: Props) {
  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* Hero header CCB Communauté — compact + 1 ligne mobile */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "20px 14px 18px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.3rem, 4.5vw, 1.9rem)",
            fontWeight: 700, margin: "0 0 4px",
            letterSpacing: "0.04em",
          }}>
            COMMUNAUTÉ CCB
          </h1>
          <p style={{
            margin: 0, fontSize: "clamp(10px, 2.8vw, 13px)",
            opacity: 0.9, fontStyle: "italic",
            color: T.lavender, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            Grandissons ensemble dans la foi, l&apos;amour et la bénédiction.
          </p>
        </div>
      </div>

      {/* Sub-nav : feed actif + lien Membres + notifs + modération */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", alignItems: "center", overflowX: "auto",
          gap: 0,
        }}>
          <div style={{
            padding: "12px 20px", fontFamily: F.body,
            borderBottom: `2px solid ${T.violet}`,
            color: T.violet, fontWeight: 700, fontSize: 14,
            whiteSpace: "nowrap",
          }}>
            📰 Fil d&apos;actualité
          </div>
          <Link href="/community/membres" style={{
            padding: "12px 20px", textDecoration: "none",
            fontFamily: F.body, fontSize: 14, fontWeight: 500,
            color: T.textMuted, whiteSpace: "nowrap",
            borderBottom: "2px solid transparent",
          }}>
            👥 Membres ({members.length})
          </Link>
          <Link href="/community/notifications" title="Mes notifications" style={{
            marginLeft: "auto", padding: "8px 12px",
            position: "relative", flexShrink: 0,
            textDecoration: "none", color: T.textSoft,
            display: "flex", alignItems: "center",
            fontSize: 17,
          }}>
            🔔
            {unreadNotifCount > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 0,
                background: "#C24B7A", color: "#fff",
                fontSize: 9, fontWeight: 700,
                borderRadius: 999, padding: "1px 5px",
                minWidth: 14, textAlign: "center",
                border: `1.5px solid ${T.card}`,
              }}>
                {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
              </span>
            )}
          </Link>
          {isAdmin && (
            <Link href="/community/admin" style={{
              padding: "6px 14px", fontSize: 11,
              background: T.violetSoft, color: T.violet, fontWeight: 700,
              borderRadius: 999, textDecoration: "none", flexShrink: 0,
              border: `1px solid ${T.violet}`,
              alignSelf: "center", marginRight: 12,
            }}>
              🛡️ Modération
            </Link>
          )}
        </div>
      </div>

      {/* Layout responsive : feed central + sidebar à droite desktop */}
      <style>{`
        .ccb-community-grid {
          max-width: 680px;
          margin: 0 auto;
          padding: 16px 16px 40px;
        }
        @media (min-width: 1100px) {
          .ccb-community-grid {
            max-width: 1080px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 24px;
            align-items: start;
          }
          .ccb-community-sidebar { display: block; }
        }
        .ccb-community-sidebar { display: none; }
      `}</style>

      <div className="ccb-community-grid">
        <div>
          <FeedClient
            posts={posts} categories={categories}
            currentUserId={currentUserId} currentUserProfile={currentUserProfile}
            isAdmin={isAdmin}
            userLikedPostIds={userLikedPostIds}
            userBookmarkedPostIds={userBookmarkedPostIds}
            userVotes={userVotes}
            members={members.map((m) => ({
              user_id: m.user_id,
              display_name: m.display_name,
              avatar_url: m.avatar_url,
            }))}
          />
        </div>

        {/* Right sidebar (desktop only) */}
        <div className="ccb-community-sidebar">
          <CommunitySidebar
            contributors={topContributors}
            pinned={pinnedPosts}
            members={members.map((m) => ({
              user_id: m.user_id,
              display_name: m.display_name,
              avatar_url: m.avatar_url,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
