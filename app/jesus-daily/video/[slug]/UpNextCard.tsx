"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  JDTV_THEME as T,
  type JdtvVideo,
  formatVideoDuration,
  getYoutubeThumbnail,
} from "@/lib/jdtv/theme";

interface Props {
  nextVideo: JdtvVideo;
  onCancel: () => void;
  /** Countdown in seconds, defaults to 10. */
  countdownSecs?: number;
}

export default function UpNextCard({ nextVideo, onCancel, countdownSecs = 10 }: Props) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number>(countdownSecs);
  const thumb = nextVideo.thumbnail_url || getYoutubeThumbnail(nextVideo.video_url);

  useEffect(() => {
    if (remaining <= 0) {
      router.push(`/jesus-daily/video/${nextVideo.slug}`);
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, router, nextVideo.slug]);

  const pct = ((countdownSecs - remaining) / countdownSecs) * 100;

  return (
    <div
      role="dialog"
      aria-label="Vidéo suivante"
      style={{
        position: "fixed", right: 20, bottom: 24, zIndex: 60,
        width: "min(420px, calc(100vw - 32px))",
        background: T.card, border: `1px solid ${T.violet}`, borderRadius: 14,
        boxShadow: T.shadowMd, overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000" }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
          }}>📺</div>
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)",
          display: "flex", alignItems: "flex-end", padding: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: T.gold, fontWeight: 800, marginBottom: 4 }}>
              SUIVANT DANS {remaining}s
            </div>
            <div style={{
              fontWeight: 700, color: "#fff", fontSize: 15, lineHeight: 1.3,
              display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden",
            }}>{nextVideo.title}</div>
            {nextVideo.duration_secs ? (
              <div style={{ color: T.textSoft, fontSize: 12, marginTop: 4 }}>
                ⏱️ {formatVideoDuration(nextVideo.duration_secs)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{
        padding: 12, display: "flex", gap: 8, alignItems: "center",
        background: T.surface2,
      }}>
        <button
          onClick={() => router.push(`/jesus-daily/video/${nextVideo.slug}`)}
          style={{
            flex: 1, padding: "10px 16px", background: T.violet, color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
          ▶ Regarder maintenant
        </button>
        <button
          onClick={onCancel}
          aria-label="Annuler"
          style={{
            padding: "10px 14px", background: "transparent", color: T.textSoft,
            border: `1px solid ${T.border}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
          Annuler
        </button>
      </div>

      {/* progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: T.gold,
          transition: "width 1s linear",
        }} />
      </div>

      <style jsx>{`
        @media (max-width: 600px) {
          div[role="dialog"] {
            right: 12px !important;
            bottom: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
