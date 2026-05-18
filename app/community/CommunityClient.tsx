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
      {/* Hero header CCB Communauté — compact mobile, aéré desktop */}
      <style>{`
        .ccb-hero-wrap { padding: 20px 14px 18px; }
        .ccb-hero-title { font-size: clamp(1.3rem, 4.5vw, 1.6rem); margin: 0 0 4px; letter-spacing: 0.04em; }
        .ccb-hero-tagline { font-size: clamp(10px, 2.8vw, 12px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) {
          .ccb-hero-wrap { padding: 32px 24px 28px; }
          .ccb-hero-title { font-size: 2rem; margin-bottom: 6px; letter-spacing: 0.06em; }
          .ccb-hero-tagline { font-size: 14px; white-space: normal; }
        }
        @media (min-width: 1100px) {
          .ccb-hero-wrap { padding: 40px 24px 36px; }
          .ccb-hero-title { font-size: 2.4rem; }
          .ccb-hero-tagline { font-size: 15px; }
        }
      `}</style>
      <div className="ccb-hero-wrap" style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <h1 className="ccb-hero-title" style={{
            fontFamily: F.title, fontWeight: 700,
          }}>
            COMMUNAUTÉ CCB
          </h1>
          <p className="ccb-hero-tagline" style={{
            margin: 0, opacity: 0.9, fontStyle: "italic",
            color: T.lavender,
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
          <Link href="/community/groups" style={{
            padding: "12px 20px", textDecoration: "none",
            fontFamily: F.body, fontSize: 14, fontWeight: 500,
            color: T.textMuted, whiteSpace: "nowrap",
            borderBottom: "2px solid transparent",
          }}>
            🧑‍🤝‍🧑 Groupes
          </Link>
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
        .ccb-community-sidebar { display: none; }
        @media (min-width: 768px) {
          .ccb-community-grid {
            max-width: 720px;
            padding: 24px 20px 48px;
          }
        }
        @media (min-width: 1024px) {
          .ccb-community-grid {
            max-width: 1080px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 28px;
            align-items: start;
            padding: 28px 24px 60px;
          }
          .ccb-community-sidebar { display: block; }
        }
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
