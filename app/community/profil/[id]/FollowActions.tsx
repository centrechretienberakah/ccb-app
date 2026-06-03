"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import { getFollowStats, toggleFollow } from "@/lib/social/follows";

interface Props {
  targetUserId: string;
  isMe: boolean;
}

/**
 * Compteurs abonnés/abonnements + bouton Suivre/Abonné.
 * Affiché sur la carte de profil membre. (Phase 1 — réseau social CCB)
 */
export default function FollowActions({ targetUserId, isMe }: Props) {
  const router = useRouter();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [opening, setOpening] = useState(false);

  async function openMessage() {
    if (opening) return;
    setOpening(true);
    try {
      const sb = createClient();
      const { data, error } = await sb.rpc("get_or_create_dm", { p_other: targetUserId });
      if (!error && typeof data === "string") {
        router.push(`/community/messages/${data}`);
        return;
      }
    } catch { /* noop */ }
    setOpening(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getFollowStats(targetUserId);
      if (cancelled) return;
      setFollowers(s.followers);
      setFollowing(s.following);
      setIsFollowing(s.isFollowing);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [targetUserId]);

  async function onToggle() {
    if (busy) return;
    setBusy(true);
    // Optimiste
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowers((c) => Math.max(0, c + (next ? 1 : -1)));
    const result = await toggleFollow(targetUserId);
    if (result === null) {
      // rollback
      setIsFollowing(!next);
      setFollowers((c) => Math.max(0, c + (next ? -1 : 1)));
    } else {
      setIsFollowing(result);
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* Compteurs */}
      <div style={{ display: "flex", gap: 22, marginBottom: isMe ? 0 : 14 }}>
        <Link href={`/community/profil/${targetUserId}/abonnes`} style={countLink}>
          <strong style={countNum}>{loaded ? followers : "—"}</strong>
          <span style={countLbl}>Abonnés</span>
        </Link>
        <Link href={`/community/profil/${targetUserId}/abonnements`} style={countLink}>
          <strong style={countNum}>{loaded ? following : "—"}</strong>
          <span style={countLbl}>Abonnements</span>
        </Link>
      </div>

      {/* Boutons Suivre + Message (pas sur mon propre profil) */}
      {!isMe && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onToggle} disabled={busy} style={{
            flex: 1,
            background: isFollowing ? "rgba(255,255,255,0.16)" : T.gold,
            color: isFollowing ? "#fff" : T.black,
            border: isFollowing ? "1px solid rgba(255,255,255,0.3)" : "none",
            borderRadius: 999, padding: "11px 14px",
            fontWeight: 800, fontSize: 13.5,
            cursor: busy ? "wait" : "pointer", fontFamily: F.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: busy ? 0.7 : 1,
          }}>
            {isFollowing ? "✓ Abonné" : "➕ Suivre"}
          </button>
          <button onClick={openMessage} disabled={opening} style={{
            flex: 1,
            background: "rgba(255,255,255,0.16)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 999, padding: "11px 14px",
            fontWeight: 800, fontSize: 13.5,
            cursor: opening ? "wait" : "pointer", fontFamily: F.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: opening ? 0.7 : 1,
          }}>
            {opening ? "⏳ …" : "💬 Message"}
          </button>
        </div>
      )}
    </div>
  );
}

const countLink: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  textDecoration: "none", color: "#fff",
};
const countNum: React.CSSProperties = {
  fontFamily: F.title, fontSize: 19, fontWeight: 800, lineHeight: 1,
};
const countLbl: React.CSSProperties = {
  fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 3,
};
