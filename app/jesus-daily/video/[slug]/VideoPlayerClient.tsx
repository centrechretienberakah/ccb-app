"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  JDTV_THEME as T,
  JDTV_FONTS as F,
  type JdtvVideo,
  type JdtvCategory,
  formatVideoDuration,
  formatViewCount,
  getEmbedUrl,
  getYoutubeThumbnail,
  relativeDate,
} from "@/lib/jdtv/theme";
import ReactionsBar from "./ReactionsBar";
import CommentsSection, { type CommentItem } from "./CommentsSection";
import LiveChat, { type LiveMessage } from "./LiveChat";
import WatchTracker from "./WatchTracker";
import UpNextCard from "./UpNextCard";

type Reaction = "clap" | "love" | "pray" | "fire" | "sparkle";

interface Props {
  video: JdtvVideo;
  category: JdtvCategory | null;
  recommendations: JdtvVideo[];
  isInWatchlist: boolean;
  watchedSecs: number;
  canAccessPremium: boolean;
  isAuth: boolean;
  currentUserId: string | null;
  isStaff: boolean;
  initialComments: CommentItem[];
  initialLikedIds: string[];
  reactionCounts: Record<Reaction, number>;
  userReaction: Reaction | null;
  initialLiveMessages: LiveMessage[];
}

export default function VideoPlayerClient({
  video, category, recommendations, isInWatchlist, watchedSecs, canAccessPremium, isAuth,
  currentUserId, isStaff,
  initialComments, initialLikedIds, reactionCounts, userReaction, initialLiveMessages,
}: Props) {
  const router = useRouter();
  const [inWl, setInWl] = useState(isInWatchlist);
  const [busyWl, setBusyWl] = useState(false);
  const [copied, setCopied] = useState(false);
  const embed = getEmbedUrl(video.video_url);
  const isPremiumLocked = video.is_premium && !canAccessPremium;
  const startedRef = useRef(false);
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextDismissed, setUpNextDismissed] = useState(false);

  // Next video : explicit next_video_id from admin > first reco
  const nextVideo: JdtvVideo | null = (() => {
    if (video.next_video_id) {
      const explicit = recommendations.find((r) => r.id === video.next_video_id);
      if (explicit) return explicit;
    }
    return recommendations.find((r) => !r.is_live) ?? recommendations[0] ?? null;
  })();

  // Track view + initialize progress on mount
  useEffect(() => {
    if (!isAuth || isPremiumLocked) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Upsert progress row (last_seen_at refresh)
      try {
        await supabase.from("jdtv_user_watch_progress").upsert({
          user_id: user.id,
          video_id: video.id,
          watched_secs: watchedSecs,
          is_completed: false,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,video_id" });
      } catch { /* noop */ }
      // Increment view count (best-effort)
      try {
        await supabase.rpc("jdtv_increment_view", { p_video_id: video.id });
      } catch { /* fonction RPC pas encore créée, on ignore */ }
    })();
  }, [video.id, isAuth, isPremiumLocked, watchedSecs]);

  async function toggleWatchlist() {
    if (busyWl) return;
    if (!isAuth) { router.push(`/auth/login?redirect=/jesus-daily/video/${video.slug}`); return; }
    setBusyWl(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusyWl(false); return; }
    if (inWl) {
      await supabase.from("jdtv_user_watchlist").delete().eq("user_id", user.id).eq("video_id", video.id);
      setInWl(false);
    } else {
      await supabase.from("jdtv_user_watchlist").insert({ user_id: user.id, video_id: video.id });
      setInWl(true);
    }
    setBusyWl(false);
  }

  async function markCompleted() {
    if (!isAuth) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("jdtv_user_watch_progress").upsert({
      user_id: user.id,
      video_id: video.id,
      watched_secs: video.duration_secs ?? 0,
      is_completed: true,
      last_seen_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
    alert("✅ Marqué comme terminé");
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `📺 ${video.title} — Jesus Daily TV`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch { /* noop */ }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      {/* Invisible heartbeat tracker */}
      {!isPremiumLocked && !video.is_live ? (
        <WatchTracker
          videoId={video.id}
          initialWatchedSecs={watchedSecs}
          durationSecs={video.duration_secs ?? null}
          isAuth={isAuth}
          onComplete={() => { if (!upNextDismissed && nextVideo) setShowUpNext(true); }}
        />
      ) : null}

      {/* Up Next floating card */}
      {showUpNext && nextVideo && !upNextDismissed ? (
        <UpNextCard
          nextVideo={nextVideo}
          onCancel={() => { setShowUpNext(false); setUpNextDismissed(true); }}
        />
      ) : null}

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 0", fontSize: 13, color: T.textMuted }}>
        <Link href="/jesus-daily" style={{ color: T.textMuted, textDecoration: "none" }}>📺 Jesus Daily TV</Link>
        {category ? <> <span style={{ margin: "0 6px" }}>›</span><span>{category.icon} {category.name}</span></> : null}
      </div>

      {/* Player */}
      <div style={{ maxWidth: 1280, margin: "12px auto 0", padding: "0 24px" }}>
        <div style={{
          position: "relative", paddingBottom: "56.25%",
          background: "#000", borderRadius: 14, overflow: "hidden",
          boxShadow: T.shadowMd,
        }}>
          {isPremiumLocked ? (
            <PremiumLock />
          ) : embed?.provider === "youtube" || embed?.provider === "vimeo" ? (
            <iframe
              src={`${embed.src}${embed.provider === "youtube" ? "&autoplay=1" : "?autoplay=1"}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            />
          ) : embed ? (
            <video
              src={embed.src}
              controls autoPlay
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textMuted, fontSize: 14,
            }}>Vidéo indisponible</div>
          )}
        </div>
      </div>

      {/* Infos + actions */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 0", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 28 }}
        className="jdtv-detail-grid">
        <div>
          {/* Title + badges */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {video.is_live ? <Badge label="🔴 EN DIRECT" color={T.live} /> : null}
            {video.is_premium ? <Badge label="👑 PREMIUM" color={T.gold} dark /> : null}
            {category ? <Badge label={`${category.icon ?? "📺"} ${category.name}`} color={T.violet} /> : null}
          </div>
          <h1 style={{ fontFamily: F.title, fontSize: "clamp(24px, 3.4vw, 36px)", margin: "0 0 8px", lineHeight: 1.15 }}>
            {video.title}
          </h1>
          {video.subtitle ? (
            <p style={{ color: T.textSoft, fontSize: 16, margin: "0 0 12px", lineHeight: 1.5 }}>{video.subtitle}</p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: T.textMuted, fontSize: 14, marginBottom: 18 }}>
            {video.speaker ? <span>🎙️ {video.speaker}</span> : null}
            {video.duration_secs ? <span>⏱️ {formatVideoDuration(video.duration_secs)}</span> : null}
            {video.view_count ? <span>👁️ {formatViewCount(video.view_count)} vues</span> : null}
            <span>📅 {relativeDate(video.published_at)}</span>
            {video.scripture ? <span>📖 {video.scripture}</span> : null}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            <button onClick={toggleWatchlist} disabled={busyWl} style={actionBtn(inWl)}>
              {inWl ? "✓ Dans ma liste" : "＋ Ma liste"}
            </button>
            <button onClick={handleShare} style={actionBtn(false)}>
              {copied ? "✓ Lien copié" : "🔗 Partager"}
            </button>
            {isAuth && !isPremiumLocked ? (
              <button onClick={markCompleted} style={actionBtn(false)}>
                ✓ Marquer comme vu
              </button>
            ) : null}
            {nextVideo && !isPremiumLocked ? (
              <Link href={`/jesus-daily/video/${nextVideo.slug}`} style={{ ...actionBtn(false), textDecoration: "none" }}>
                ▶ Vidéo suivante
              </Link>
            ) : null}
          </div>

          {/* Description */}
          {video.description ? (
            <div style={{
              padding: 18, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              fontSize: 15, lineHeight: 1.7, color: T.textSoft, whiteSpace: "pre-wrap",
            }}>{video.description}</div>
          ) : null}

          {/* Tags */}
          {video.tags && video.tags.length > 0 ? (
            <div style={{ marginTop: 14, marginBottom: 22, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {video.tags.map((t) => (
                <span key={t} style={{
                  padding: "4px 10px", borderRadius: 999, background: T.violetSoft, color: T.text,
                  fontSize: 12, fontWeight: 600, border: `1px solid ${T.violet}`,
                }}>#{t}</span>
              ))}
            </div>
          ) : null}

          {/* Réactions */}
          {!isPremiumLocked ? (
            <ReactionsBar
              videoId={video.id}
              initialCounts={reactionCounts}
              initialUserReaction={userReaction}
              isAuth={isAuth}
            />
          ) : null}

          {/* Commentaires */}
          {!isPremiumLocked ? (
            <CommentsSection
              videoId={video.id}
              initialComments={initialComments}
              initialLikedIds={initialLikedIds}
              currentUserId={currentUserId}
              isAuth={isAuth}
              isStaff={isStaff}
            />
          ) : null}
        </div>

        {/* Sidebar : live chat (si live) + recommendations */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {video.is_live && !isPremiumLocked ? (
            <LiveChat
              videoId={video.id}
              initialMessages={initialLiveMessages}
              isAuth={isAuth}
              currentUserId={currentUserId}
              isStaff={isStaff}
            />
          ) : null}

          <div>
            <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 14px" }}>À découvrir</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.slice(0, 8).map((v) => (
                <RecoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div style={{ height: 60 }} />

      <style jsx global>{`
        @media (max-width: 900px) {
          .jdtv-detail-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes jdtvPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function Badge({ label, color, dark = false }: { label: string; color: string; dark?: boolean }) {
  return (
    <span style={{
      padding: "5px 10px", borderRadius: 6, background: dark ? color : `${color}28`,
      color: dark ? "#000" : "#fff", border: `1px solid ${color}`,
      fontWeight: 800, fontSize: 11, letterSpacing: 0.8,
    }}>{label}</span>
  );
}

function actionBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 18px",
    background: active ? T.violet : "rgba(255,255,255,0.08)",
    color: "#fff",
    border: `1px solid ${active ? T.violet : "rgba(255,255,255,0.18)"}`,
    borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
  };
}

function PremiumLock() {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
      background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`, color: "#fff", padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 64 }}>👑</div>
      <h3 style={{ fontFamily: F.title, fontSize: 26, margin: 0 }}>Contenu Premium</h3>
      <p style={{ margin: 0, color: T.textSoft, maxWidth: 460, fontSize: 14, lineHeight: 1.5 }}>
        Cette vidéo est réservée aux membres premium du Centre Chrétien Berakah.
      </p>
      <Link href="/abonnement" style={{
        padding: "12px 22px", background: T.gold, color: "#000", borderRadius: 999,
        fontWeight: 800, textDecoration: "none", marginTop: 8,
      }}>Découvrir Premium</Link>
    </div>
  );
}

function RecoCard({ video }: { video: JdtvVideo }) {
  const thumb = video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  return (
    <Link href={`/jesus-daily/video/${video.slug}`}
      style={{
        display: "flex", gap: 10, textDecoration: "none", color: "inherit",
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 8,
      }}>
      <div style={{
        flex: "0 0 130px", position: "relative", aspectRatio: "16/9",
        background: "#000", borderRadius: 6, overflow: "hidden",
      }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={video.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0, background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>📺</div>
        )}
        {video.is_live ? (
          <span style={{
            position: "absolute", top: 4, left: 4, padding: "2px 6px", borderRadius: 3,
            background: T.live, color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: 0.8,
          }}>🔴 LIVE</span>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: 13, lineHeight: 1.3,
          display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
        }}>{video.title}</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          {video.speaker ? `${video.speaker} · ` : ""}{video.duration_secs ? formatVideoDuration(video.duration_secs) : ""}
        </div>
      </div>
    </Link>
  );
}
