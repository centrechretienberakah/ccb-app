"use client";
import { useEffect, useRef, useState } from "react";
import { JDTV_THEME as T, JDTV_FONTS as F } from "@/lib/jdtv/theme";

interface YouTubeThumb { url: string; width?: number; height?: number }
interface YouTubeSnippet {
  publishedAt: string;
  title: string;
  description: string;
  thumbnails?: {
    default?: YouTubeThumb;
    medium?: YouTubeThumb;
    high?: YouTubeThumb;
    standard?: YouTubeThumb;
    maxres?: YouTubeThumb;
  };
  channelTitle?: string;
}
interface YouTubeItem {
  id: { kind: string; videoId?: string };
  snippet: YouTubeSnippet;
}
interface YouTubeResponse {
  items?: YouTubeItem[];
  error?: string;
}

function relativePublishedAt(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Hier";
  if (d < 7) return `Il y a ${d} jours`;
  if (d < 30) return `Il y a ${Math.floor(d / 7)} sem`;
  if (d < 365) return `Il y a ${Math.floor(d / 30)} mois`;
  return `Il y a ${Math.floor(d / 365)} an${Math.floor(d / 365) > 1 ? "s" : ""}`;
}

export default function YouTubeRail() {
  const [items, setItems] = useState<YouTubeItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/youtube");
        if (!res.ok) { setStatus("error"); return; }
        const data = (await res.json()) as YouTubeResponse;
        if (cancelled) return;
        const list = (data.items ?? []).filter((it) => it.id?.videoId);
        if (list.length === 0) { setStatus("empty"); return; }
        setItems(list);
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function scroll(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  }

  if (status === "error" || status === "empty") return null;

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 8px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: F.title, fontSize: 22, margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#FF0000" }}>▶</span> Dernières vidéos YouTube
          </h2>
          <p style={{ margin: "4px 0 0", color: T.textMuted, fontSize: 13 }}>
            En direct de la chaîne <a href="https://www.youtube.com/channel/UCFwp158Jrg_AKlYm6Wdg4kw" target="_blank" rel="noopener noreferrer" style={{ color: T.violet, textDecoration: "none", fontWeight: 600 }}>@CentreChrétienBerakah ↗</a>
          </p>
        </div>
        {status === "ok" && items.length > 1 ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => scroll(-1)} aria-label="Précédent" style={navBtn}>‹</button>
            <button onClick={() => scroll(1)} aria-label="Suivant" style={navBtn}>›</button>
          </div>
        ) : null}
      </div>

      {status === "loading" ? (
        <div style={{ display: "flex", gap: 14, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              flex: "0 0 280px",
              aspectRatio: "16/9",
              background: `linear-gradient(110deg, ${T.surface2}, ${T.card}, ${T.surface2})`,
              backgroundSize: "200% 100%",
              borderRadius: 12,
              animation: "ytShimmer 1.6s linear infinite",
            }} />
          ))}
          <style>{`@keyframes ytShimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }`}</style>
        </div>
      ) : (
        <div
          ref={railRef}
          className="yt-rail"
          style={{
            display: "flex", gap: 14, overflowX: "auto", overflowY: "hidden",
            scrollSnapType: "x mandatory", paddingBottom: 16, scrollbarWidth: "none",
          }}>
          {items.map((it) => {
            const vid = it.id.videoId!;
            const thumb = it.snippet.thumbnails?.maxres?.url
              ?? it.snippet.thumbnails?.high?.url
              ?? it.snippet.thumbnails?.medium?.url
              ?? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
            return (
              <a
                key={vid}
                href={`https://www.youtube.com/watch?v=${vid}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  flex: "0 0 280px", scrollSnapAlign: "start",
                  textDecoration: "none", color: "inherit",
                  display: "block",
                }}>
                <div style={{
                  position: "relative", aspectRatio: "16/9",
                  background: "#000", borderRadius: 12, overflow: "hidden",
                  boxShadow: T.shadowSoft,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={it.snippet.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {/* Badge YouTube */}
                  <span style={{
                    position: "absolute", top: 8, left: 8,
                    padding: "3px 8px", borderRadius: 4,
                    background: "#FF0000", color: "#fff",
                    fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>▶ YOUTUBE</span>
                  {/* Hover play overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.65))",
                    opacity: 0, transition: "opacity 180ms ease",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                    <span style={{
                      width: 50, height: 50, borderRadius: "50%",
                      background: "rgba(255,255,255,0.95)", color: "#FF0000",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 800,
                    }}>▶</span>
                  </div>
                </div>
                <div style={{ padding: "10px 4px 0" }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14, color: T.text,
                    display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2,
                    overflow: "hidden", lineHeight: 1.3, minHeight: 36,
                  }}>{it.snippet.title}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>
                    📅 {relativePublishedAt(it.snippet.publishedAt)}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <style>{`.yt-rail::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}

const navBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: T.card, border: `1px solid ${T.border}`,
  color: T.text, fontSize: 18, cursor: "pointer", fontWeight: 700,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
