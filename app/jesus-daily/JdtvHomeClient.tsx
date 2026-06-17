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

/** Image avec skeleton + fondu à l'apparition (perf + douceur). */
function FadeImg({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      loading="lazy" decoding="async" src={src} alt={alt} onLoad={() => setLoaded(true)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity .4s ease", ...style }}
    />
  );
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

  const recentVideos = useMemo(() => videos.slice(0, 14), [videos]);
  const popularVideos = useMemo(
    () => [...videos].filter((v) => (v.view_count ?? 0) > 0).sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 14),
    [videos],
  );
  const featuredCat = useMemo(
    () => (featured ? categories.find((c) => c.id === featured.category_id) ?? null : null),
    [featured, categories],
  );

  async function toggleWatchlist(videoId: string) {
    if (busy) return;
    if (!isAuth) { router.push("/auth/login?redirect=/jesus-daily"); return; }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); router.push("/auth/login?redirect=/jesus-daily"); return; }
    if (wlIds.has(videoId)) {
      await supabase.from("jdtv_user_watchlist").delete().eq("user_id", user.id).eq("video_id", videoId);
      const next = new Set(wlIds); next.delete(videoId); setWlIds(next);
    } else {
      await supabase.from("jdtv_user_watchlist").insert({ user_id: user.id, video_id: videoId });
      const next = new Set(wlIds); next.add(videoId); setWlIds(next);
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* HERO */}
      {featured ? (
        <Hero video={featured} categoryName={featuredCat?.name ?? null} isInWatchlist={wlIds.has(featured.id)} onToggle={() => toggleWatchlist(featured.id)} />
      ) : (
        <EmptyHero isAdmin={isAdmin} />
      )}

      {/* Accès admin (discret) */}
      {isAdmin ? (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 20px 0", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/jesus-daily/admin" style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px",
            background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, color: T.textSoft,
            borderRadius: 999, fontWeight: 600, fontSize: 12.5, textDecoration: "none",
          }}>⚙️ Espace admin</Link>
        </div>
      ) : null}

      <YouTubeRail />

      {continueVideos.length > 0 ? (
        <Rail title="Reprendre" videos={continueVideos} progressMap={progressByVideo} wlIds={wlIds} onToggleWl={toggleWatchlist} />
      ) : null}

      {watchlistVideos.length > 0 ? (
        <Rail title="Ma liste" videos={watchlistVideos} progressMap={progressByVideo} wlIds={wlIds} onToggleWl={toggleWatchlist} />
      ) : null}

      {recentVideos.length > 0 ? (
        <Rail title="Nouveautés" videos={recentVideos} progressMap={progressByVideo} wlIds={wlIds} onToggleWl={toggleWatchlist} />
      ) : null}

      {categories.map((cat) => {
        const catVideos = videosByCategory.get(cat.id) ?? [];
        if (catVideos.length === 0) return null;
        return (
          <Rail key={cat.id} title={cat.name} videos={catVideos} progressMap={progressByVideo}
            wlIds={wlIds} onToggleWl={toggleWatchlist} href={`/jesus-daily/categorie/${cat.slug}`} />
        );
      })}

      {popularVideos.length > 0 ? (
        <Rail title="Vidéos populaires" videos={popularVideos} progressMap={progressByVideo} wlIds={wlIds} onToggleWl={toggleWatchlist} />
      ) : null}

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

// ─── HERO (minimal, façon Netflix) ──────────────────────────────────
function Hero({ video, categoryName, isInWatchlist, onToggle }: { video: JdtvVideo; categoryName: string | null; isInWatchlist: boolean; onToggle: () => void; }) {
  const heroImg = video.hero_url || video.thumbnail_url || getYoutubeThumbnail(video.video_url);
  const embed = getEmbedUrl(video.video_url);
  const showLivePlayer = video.is_live && embed?.provider === "youtube";

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden", minHeight: "min(60vh, 560px)", background: "#000", display: "flex" }}>
      {showLivePlayer ? (
        <iframe src={`${embed!.src}&autoplay=1&mute=1&controls=0&loop=1`} title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", pointerEvents: "none" }} />
      ) : heroImg ? (
        <FadeImg src={heroImg} alt={video.title} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})` }} />
      )}

      {/* Dégradés (lisibilité, pas décoratif) */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,15,0.15) 0%, rgba(10,10,15,0.55) 62%, rgba(10,10,15,0.98) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,10,15,0.8) 0%, rgba(10,10,15,0.2) 55%, rgba(10,10,15,0) 85%)" }} />

      {/* Contenu — ancré en bas, minimal */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1400, margin: "0 auto", padding: "0 22px 40px", alignSelf: "flex-end", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {video.is_live ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 6, background: T.live, color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 1.2 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#fff", animation: "jdtvPulse 1.4s ease-in-out infinite" }} />
              EN DIRECT
            </span>
          ) : (
            <span style={{ padding: "5px 12px", borderRadius: 6, background: T.violetSoft, color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: 1.4, border: `1px solid ${T.violet}`, textTransform: "uppercase" }}>
              {categoryName || "À la une"}
            </span>
          )}
        </div>

        <h1 style={{ fontFamily: F.title, fontSize: "clamp(32px, 6vw, 48px)", lineHeight: 1.05, margin: 0, fontWeight: 800, textShadow: "0 4px 24px rgba(0,0,0,0.6)", maxWidth: 760 }}>
          {video.title}
        </h1>
        {video.subtitle ? (
          <p style={{ fontSize: "clamp(14px, 1.5vw, 17px)", color: T.textSoft, margin: 0, maxWidth: 560, lineHeight: 1.45, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
            {video.subtitle}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <Link href={`/jesus-daily/video/${video.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 30px", background: "#fff", color: "#000", borderRadius: 8, fontWeight: 800, fontSize: 15.5, textDecoration: "none" }}>
            ▶ Regarder
          </Link>
          <button onClick={onToggle} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 24px", background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 8, fontWeight: 700, fontSize: 14.5, cursor: "pointer", backdropFilter: "blur(6px)" }}>
            {isInWatchlist ? "✓ Ma liste" : "＋ Ma liste"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes jdtvPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.85); } }
      `}</style>
    </div>
  );
}

function EmptyHero({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div style={{ position: "relative", padding: "110px 24px 80px", background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`, textAlign: "center" }}>
      <div style={{ fontSize: 60, marginBottom: 14 }}>📺</div>
      <h1 style={{ fontFamily: F.title, fontSize: "clamp(32px, 6vw, 52px)", margin: "0 0 12px" }}>Jesus Daily TV</h1>
      <p style={{ color: T.textSoft, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
        La TV chrétienne premium du Centre Chrétien Berakah. Bientôt en ligne.
      </p>
      {isAdmin ? (
        <Link href="/jesus-daily/admin" style={{ display: "inline-flex", marginTop: 20, gap: 8, padding: "11px 22px", background: "#fff", color: T.violetDark, borderRadius: 999, fontWeight: 800, textDecoration: "none" }}>⚙️ Publier la première vidéo</Link>
      ) : null}
    </div>
  );
}

// ─── RAIL (carousel horizontal) ─────────────────────────────────────
function Rail({ title, videos, progressMap, wlIds, onToggleWl, href }: {
  title: string;
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
      <h2 style={{ fontFamily: F.title, fontSize: "clamp(20px, 3vw, 26px)", margin: 0, fontWeight: 700 }}>{title} <span style={{ color: T.textMuted, fontSize: 16 }}>›</span></h2>
    </Link>
  ) : (
    <h2 style={{ fontFamily: F.title, fontSize: "clamp(20px, 3vw, 26px)", margin: 0, fontWeight: 700 }}>{title}</h2>
  );

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "26px 20px 4px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        {TitleEl}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => scroll(-1)} aria-label="Précédent" style={railBtn}>‹</button>
          <button onClick={() => scroll(1)} aria-label="Suivant" style={railBtn}>›</button>
        </div>
      </div>

      <div ref={ref} className="jdtv-rail" style={{ display: "flex", gap: 16, overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", paddingBottom: 12, scrollbarWidth: "none" }}>
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} progress={progressMap.get(v.id) ?? null} isInWatchlist={wlIds.has(v.id)} onToggleWl={() => onToggleWl(v.id)} />
        ))}
      </div>

      <style jsx global>{`.jdtv-rail::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}

const railBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 999,
  background: "rgba(255,255,255,0.07)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.1)", fontSize: 19, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

// ─── CARD (affiche portrait 2:3) ────────────────────────────────────
function VideoCard({ video, progress, isInWatchlist, onToggleWl }: {
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
        width: "clamp(132px, 33vw, 168px)", position: "relative",
        transform: hover ? "scale(1.04)" : "none", transition: "transform 220ms ease",
        zIndex: hover ? 2 : 1,
      }}>
      <Link href={`/jesus-daily/video/${video.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {/* Affiche 2:3, coins 12px, sans bordure */}
        <div style={{
          position: "relative", paddingBottom: "150%", background: T.card,
          borderRadius: 12, overflow: "hidden",
          boxShadow: hover ? T.shadowMd : "none",
        }}>
          {thumb ? (
            <FadeImg src={thumb} alt={video.title} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📺</div>
          )}

          {/* Badges minimalistes */}
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", justifyContent: "space-between", gap: 6, pointerEvents: "none" }}>
            {video.is_live ? (
              <span style={{ padding: "3px 8px", borderRadius: 4, background: T.live, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>🔴 LIVE</span>
            ) : <span />}
            {video.duration_secs ? (
              <span style={{ padding: "3px 7px", borderRadius: 4, background: "rgba(0,0,0,0.72)", color: "#fff", fontSize: 10.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatVideoDuration(video.duration_secs)}</span>
            ) : null}
          </div>

          {/* Progression */}
          {pct > 0 ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "rgba(0,0,0,0.4)" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: T.violet }} />
            </div>
          ) : null}

          {/* Overlay au survol */}
          {hover ? (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.8) 100%)", display: "flex", alignItems: "flex-end", padding: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "#fff", color: "#000", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, marginRight: 8 }}>▶</div>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWl(); }}
                aria-label={isInWatchlist ? "Retirer de ma liste" : "Ajouter à ma liste"}
                style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
                {isInWatchlist ? "✓" : "＋"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Titre sous l'affiche */}
        <div style={{ padding: "8px 2px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: T.text, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", lineHeight: 1.3 }}>{video.title}</div>
          {video.speaker ? <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{video.speaker}</div> : null}
        </div>
      </Link>
    </div>
  );
}
