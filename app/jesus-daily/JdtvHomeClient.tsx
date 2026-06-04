"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  JDTV_THEME as T,
  JDTV_FONTS as F,
  type JdtvCategory,
  type JdtvVideo,
  type JdtvWatchProgress,
  formatVideoDuration,
  formatViewCount,
  getEmbedUrl,
  getYoutubeThumbnail,
} from "@/lib/jdtv/theme";
import YouTubeRail from "./_components/YouTubeRail";

interface Props {
  featured: JdtvVideo | null;
  categories: JdtvCategory[];
  videos: JdtvVideo[];
  watchlistIds: string[];
  watchlistVideos: JdtvVideo[];
  continueVideos: JdtvVideo[];
  progress: JdtvWatchProgress[];
  isAdmin: boolean;
  isAuth: boolean;
}

export default function JdtvHomeClient({
  featured, categories, videos, watchlistIds, watchlistVideos, continueVideos, progress, isAdmin, isAuth,
}: Props) {
  const router = useRouter();
  const [wlIds, setWlIds] = useState<Set<string>>(new Set(watchlistIds));
  const [busy, setBusy] = useState(false);

  const progressByVideo = useMemo(() => {
    const m = new Map<string, JdtvWatchProgress>();
    progress.forEach((p) => m.set(p.video_id, p));
    return m;
  }, [progress]);

  const videosByCategory = useMemo(() => {
    const m = new Map<string, JdtvVideo[]>();
    videos.forEach((v) => {
      if (!v.category_id) return;
      if (!m.has(v.category_id)) m.set(v.category_id, []);
      m.get(v.category_id)!.push(v);
    });
    return m;
  }, [videos]);

  const recentVideos = useMemo(() => videos.slice(0, 12), [videos]);

  async function toggleWatchlist(videoId: string) {
    if (busy) return;
    if (!isAuth) { router.push("/auth/login?redirect=/jesus-daily"); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/auth/login?redirect=/jesus-daily"); return; }
    if (wlIds.has(videoId)) {
      await supabase.from("jdtv_user_watchlist").delete().eq("user_id", user.id).eq("video_id", videoId);
      const next = new Set(wlIds);
      next.delete(videoId);
      setWlIds(next);
    } else {
      await supabase.from("jdtv_user_watchlist").insert({ user_id: user.id, video_id: videoId });
      const next = new Set(wlIds);
      next.add(videoId);
      setWlIds(next);
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      {/* HERO */}
      {featured ? (
        <HeroLive video={featured} isInWatchlist={wlIds.has(featured.id)} onToggle={() => toggleWatchlist(featured.id)} />
      ) : (
        <EmptyHero isAdmin={isAdmin} />
      )}

      {/* Toolbar : recherche + nav catégories + admin */}
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "8px 24px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
      }}>
        <Link href="/jesus-daily/recherche" style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
          background: T.card, border: `1px solid ${T.border}`, color: T.textSoft,
          borderRadius: 999, fontWeight: 600, fontSize: 13, textDecoration: "none",
          minWidth: 220,
        }}>🔎 Rechercher une vidéo…</Link>
        {isAdmin ? (
          <Link href="/jesus-daily/admin" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px",
            background: T.violetSoft, border: `1px solid ${T.violet}`, color: T.text,
            borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>⚙️ Espace admin JDTV</Link>
        ) : null}
      </div>

      {/* Nav catégories cliquable */}
      {categories.length > 0 ? (
        <div className="jdtv-cat-nav" style={{
          maxWidth: 1400, margin: "0 auto",
          padding: "12px 24px 0", display: "flex", gap: 8, overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {categories.map((c) => (
            <Link key={c.id} href={`/jesus-daily/categorie/${c.slug}`} style={{
              flex: "0 0 auto", padding: "8px 14px",
              background: "rgba(255,255,255,0.04)", color: T.textSoft,
              border: `1px solid ${T.border}`, borderRadius: 999,
              fontSize: 12.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
            }}>{c.icon ?? "📂"} {c.name}</Link>
          ))}
          <style jsx global>{`
            .jdtv-cat-nav::-webkit-scrollbar { display: none; }
          `}</style>
        </div>
      ) : null}

      {/* Dernières vidéos YouTube CCB (fetch /api/youtube, cache 1h) */}
      <YouTubeRail />

      {/* Continue watching */}
      {continueVideos.length > 0 ? (
        <Rail
          title="🔥 Reprends où tu étais"
          videos={continueVideos}
          progressMap={progressByVideo}
          wlIds={wlIds}
          onToggleWl={toggleWatchlist}
        />
      ) : null}

      {/* My list */}
      {watchlistVideos.length > 0 ? (
        <Rail
          title="❤️ Ma liste"
          videos={watchlistVideos}
          progressMap={progressByVideo}
          wlIds={wlIds}
          onToggleWl={toggleWatchlist}
        />
      ) : null}

      {/* Nouveautés */}
      {recentVideos.length > 0 ? (
        <Rail
          title="✨ Nouveautés"
          videos={recentVideos}
          progressMap={progressByVideo}
          wlIds={wlIds}
          onToggleWl={toggleWatchlist}
        />
      ) : null}

      {/* Catégories */}
      {categories.map((cat) => {
        const catVideos = videosByCategory.get(cat.id) ?? [];
        if (catVideos.length === 0) return null;
        return (
          <Rail
            key={cat.id}
            title={`${cat.icon ?? "📺"}  ${cat.name}`}
            subtitle={cat.description}
            videos={catVideos}
            progressMap={progressByVideo}
            wlIds={wlIds}
            onToggleWl={toggleWatchlist}
            href={`/jesus-daily/categorie/${cat.slug}`}
          />
        );
      })}

      {/* Empty global */}
      {videos.length === 0 ? (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>📺</div>
          <h2 style={{ fontFamily: F.title, fontSize: 28, margin: "0 0 8px" }}>Bientôt en ligne</h2>
          <p style={{ color: T.textMuted, fontSize: 15, margin: 0 }}>
            Jesus Daily TV se prépare. Les premières vidéos seront publiées très bientôt.
          </p>
        </div>
      ) : null}

      <div style={{ height: 60 }} />
    </div>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────
function HeroLive({ video, isInWatchlist, onToggle }: { video: JdtvVideo; isInWatchlist: boolean; onToggle: () => void; }) {
  const heroImg = video.hero_url || video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  const embed = getEmbedUrl(video.video_url);
  const showLivePlayer = video.is_live && embed?.provider === "youtube";

  return (
    <div style={{
      position: "relative", width: "100%", overflow: "hidden",
      minHeight: "min(620px, 80vh)", background: "#000",
    }}>
      {/* Background image / live player */}
      {showLivePlayer ? (
        <iframe
          src={`${embed!.src}&autoplay=1&mute=1&controls=0&loop=1`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
        />
      ) : heroImg ? (
        <img src={heroImg} alt={video.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})` }} />
      )}

      {/* Vignettage */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(10,10,15,0.25) 0%, rgba(10,10,15,0.6) 60%, rgba(10,10,15,0.96) 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.35) 50%, rgba(10,10,15,0) 80%)",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2, maxWidth: 1400, margin: "0 auto",
        padding: "120px 24px 60px", display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {video.is_live ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6, background: T.live, color: "#fff",
              fontWeight: 800, fontSize: 12, letterSpacing: 1.2,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 999, background: "#fff",
                animation: "jdtvPulse 1.4s ease-in-out infinite",
              }} />
              EN DIRECT
            </span>
          ) : null}
          {video.is_premium ? (
            <span style={{
              padding: "6px 12px", borderRadius: 6, background: T.goldSoft, color: T.gold,
              fontWeight: 800, fontSize: 12, letterSpacing: 1, border: `1px solid ${T.gold}`,
            }}>👑 PREMIUM</span>
          ) : null}
          <span style={{
            padding: "6px 12px", borderRadius: 6, background: T.violetSoft, color: "#fff",
            fontWeight: 700, fontSize: 12, letterSpacing: 1, border: `1px solid ${T.violet}`,
          }}>📺 JESUS DAILY TV</span>
        </div>

        <h1 style={{
          fontFamily: F.title, fontSize: "clamp(34px, 6vw, 64px)", lineHeight: 1.05,
          margin: 0, fontWeight: 800, textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          maxWidth: 800,
        }}>
          {video.title}
        </h1>
        {video.subtitle ? (
          <p style={{ fontSize: "clamp(15px, 1.6vw, 18px)", color: T.textSoft, margin: 0, maxWidth: 700, lineHeight: 1.5 }}>
            {video.subtitle}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", color: T.textMuted, fontSize: 14 }}>
          {video.speaker ? <span>🎙️ {video.speaker}</span> : null}
          {video.duration_secs ? <span>⏱️ {formatVideoDuration(video.duration_secs)}</span> : null}
          {video.view_count ? <span>👁️ {formatViewCount(video.view_count)} vues</span> : null}
          {video.scripture ? <span>📖 {video.scripture}</span> : null}
        </div>

        {video.description ? (
          <p style={{
            color: T.textSoft, fontSize: 15, lineHeight: 1.6,
            margin: "4px 0 0", maxWidth: 720,
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden",
          }}>
            {video.description}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <Link
            href={`/jesus-daily/video/${video.slug}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px",
              background: "#fff", color: "#000", borderRadius: 8, fontWeight: 800, fontSize: 16,
              textDecoration: "none", boxShadow: T.shadowMd,
            }}>
            ▶ Regarder
          </Link>
          <button
            onClick={onToggle}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 24px",
              background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}>
            {isInWatchlist ? "✓ Dans ma liste" : "＋ Ma liste"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes jdtvPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function EmptyHero({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div style={{
      position: "relative", padding: "120px 24px 80px",
      background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📺</div>
      <h1 style={{ fontFamily: F.title, fontSize: "clamp(34px, 6vw, 56px)", margin: "0 0 12px" }}>Jesus Daily TV</h1>
      <p style={{ color: T.textSoft, fontSize: 17, maxWidth: 600, margin: "0 auto" }}>
        La TV chrétienne premium du Centre Chrétien Berakah. Bientôt en ligne.
      </p>
      {isAdmin ? (
        <Link href="/jesus-daily/admin" style={{
          display: "inline-flex", marginTop: 22, gap: 8, padding: "12px 22px",
          background: "#fff", color: T.violetDark, borderRadius: 999, fontWeight: 800, textDecoration: "none",
        }}>⚙️ Publier la première vidéo</Link>
      ) : null}
    </div>
  );
}

// ─── RAIL (carousel horizontal) ─────────────────────────────────────
function Rail({
  title, subtitle, videos, progressMap, wlIds, onToggleWl, href,
}: {
  title: string;
  subtitle?: string | null;
  videos: JdtvVideo[];
  progressMap: Map<string, JdtvWatchProgress>;
  wlIds: Set<string>;
  onToggleWl: (id: string) => void;
  href?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  }

  const TitleEl = href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <h2 style={{ fontFamily: F.title, fontSize: 22, margin: 0, fontWeight: 700 }}>{title} <span style={{ color: T.textMuted, fontSize: 16 }}>›</span></h2>
    </Link>
  ) : (
    <h2 style={{ fontFamily: F.title, fontSize: 22, margin: 0, fontWeight: 700 }}>{title}</h2>
  );

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 8px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        <div>
          {TitleEl}
          {subtitle ? <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13 }}>{subtitle}</p> : null}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => scroll(-1)} aria-label="Précédent" style={railBtn}>‹</button>
          <button onClick={() => scroll(1)} aria-label="Suivant" style={railBtn}>›</button>
        </div>
      </div>

      <div
        ref={ref}
        className="jdtv-rail"
        style={{
          display: "flex", gap: 14, overflowX: "auto", overflowY: "hidden",
          scrollSnapType: "x mandatory", paddingBottom: 16, scrollbarWidth: "none",
        }}>
        {videos.map((v) => (
          <VideoCard key={v.id} video={v}
            progress={progressMap.get(v.id) ?? null}
            isInWatchlist={wlIds.has(v.id)}
            onToggleWl={() => onToggleWl(v.id)}
          />
        ))}
      </div>

      <style jsx global>{`
        .jdtv-rail::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}

const railBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: "rgba(255,255,255,0.08)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)", fontSize: 20, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

// ─── CARD ───────────────────────────────────────────────────────────
function VideoCard({
  video, progress, isInWatchlist, onToggleWl,
}: {
  video: JdtvVideo;
  progress: JdtvWatchProgress | null;
  isInWatchlist: boolean;
  onToggleWl: () => void;
}) {
  const [hover, setHover] = useState(false);
  const thumb = video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  const pct = progress && video.duration_secs
    ? Math.min(100, Math.round((progress.watched_secs / video.duration_secs) * 100))
    : 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: "0 0 auto", scrollSnapAlign: "start",
        width: "clamp(220px, 26vw, 300px)",
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
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWl(); }}
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
