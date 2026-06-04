"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  JDTV_THEME as T,
  type JdtvVideo,
  type JdtvWatchProgress,
  formatVideoDuration,
  formatViewCount,
  getYoutubeThumbnail,
} from "@/lib/jdtv/theme";

interface Props {
  video: JdtvVideo;
  progress?: JdtvWatchProgress | null;
  isInWatchlist?: boolean;
  onToggleWl?: (videoId: string) => void;
  isAuth?: boolean;
}

/**
 * Carte vidéo réutilisable (grille ou carrousel).
 * Affiche thumbnail + badges + progress bar + hover overlay.
 */
export default function VideoGridCard({
  video, progress = null, isInWatchlist = false, onToggleWl, isAuth = false,
}: Props) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const thumb = video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  const pct = progress && video.duration_secs
    ? Math.min(100, Math.round((progress.watched_secs / video.duration_secs) * 100))
    : 0;

  async function handleToggleWl(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (onToggleWl) { onToggleWl(video.id); return; }
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/${video.slug}`); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    if (isInWatchlist) {
      await supabase.from("jdtv_user_watchlist").delete().eq("user_id", user.id).eq("video_id", video.id);
    } else {
      await supabase.from("jdtv_user_watchlist").insert({ user_id: user.id, video_id: video.id });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        transform: hover ? "translateY(-4px) scale(1.02)" : "none",
        transition: "transform 220ms ease",
      }}>
      <Link href={`/jesus-daily/video/${video.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <div style={{
          position: "relative", paddingBottom: "56.25%",
          background: T.card, borderRadius: 12, overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: hover ? T.shadowMd : T.shadowSoft,
        }}>
          {thumb ? (
            <img src={thumb} alt={video.title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48,
            }}>📺</div>
          )}

          {/* Badges */}
          <div style={{
            position: "absolute", top: 8, left: 8, right: 8,
            display: "flex", justifyContent: "space-between", gap: 6, pointerEvents: "none",
          }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {video.is_live ? (
                <span style={{
                  padding: "3px 8px", borderRadius: 4, background: T.live, color: "#fff",
                  fontSize: 10, fontWeight: 800, letterSpacing: 1,
                }}>🔴 LIVE</span>
              ) : null}
              {video.is_premium ? (
                <span style={{
                  padding: "3px 8px", borderRadius: 4, background: T.gold, color: "#000",
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
                }}>👑 PREMIUM</span>
              ) : null}
            </div>
            {video.duration_secs ? (
              <span style={{
                padding: "3px 8px", borderRadius: 4, background: "rgba(0,0,0,0.7)", color: "#fff",
                fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              }}>{formatVideoDuration(video.duration_secs)}</span>
            ) : null}
          </div>

          {/* Progress bar */}
          {pct > 0 ? (
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              height: 3, background: "rgba(0,0,0,0.4)",
            }}>
              <div style={{ height: "100%", width: `${pct}%`, background: T.violet }} />
            </div>
          ) : null}

          {/* Hover overlay */}
          {hover ? (
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78) 100%)",
              display: "flex", alignItems: "flex-end", padding: 10,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999, background: "#fff", color: "#000",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 18, marginRight: 8,
              }}>▶</div>
              <button
                onClick={handleToggleWl}
                aria-label={isInWatchlist ? "Retirer de ma liste" : "Ajouter à ma liste"}
                style={{
                  width: 36, height: 36, borderRadius: 999,
                  background: "rgba(0,0,0,0.6)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer",
                  fontSize: 16, fontWeight: 700,
                }}>
                {isInWatchlist ? "✓" : "＋"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Caption */}
        <div style={{ padding: "10px 4px 0" }}>
          <div style={{
            fontWeight: 700, fontSize: 14, color: T.text,
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
            lineHeight: 1.3,
          }}>{video.title}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {video.speaker ? <span>{video.speaker}</span> : null}
            {video.view_count ? <span>· {formatViewCount(video.view_count)} vues</span> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
