"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  JDTV_THEME as T,
  JDTV_FONTS as F,
  type JdtvCategory,
  type JdtvVideo,
  type JdtvWatchProgress,
} from "@/lib/jdtv/theme";
import VideoGridCard from "../../_components/VideoGridCard";

type SortMode = "recent" | "popular" | "oldest" | "duration";

interface Props {
  category: JdtvCategory;
  videos: JdtvVideo[];
  watchlistIds: string[];
  progressMap: Record<string, JdtvWatchProgress>;
  isAuth: boolean;
}

export default function CategoryClient({ category, videos, watchlistIds, progressMap, isAuth }: Props) {
  const [sort, setSort] = useState<SortMode>("recent");
  const [filterPremium, setFilterPremium] = useState<"all" | "free" | "premium">("all");
  const [filterLive, setFilterLive] = useState(false);

  const wlSet = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  const filtered = useMemo(() => {
    let arr = videos.slice();
    if (filterPremium === "free") arr = arr.filter((v) => !v.is_premium);
    if (filterPremium === "premium") arr = arr.filter((v) => v.is_premium);
    if (filterLive) arr = arr.filter((v) => v.is_live);
    switch (sort) {
      case "popular":  arr.sort((a, b) => b.view_count - a.view_count); break;
      case "oldest":   arr.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()); break;
      case "duration": arr.sort((a, b) => (b.duration_secs ?? 0) - (a.duration_secs ?? 0)); break;
      default:         arr.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }
    return arr;
  }, [videos, sort, filterPremium, filterLive]);

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      {/* Hero category */}
      <div style={{
        position: "relative", padding: "60px 24px 32px", overflow: "hidden",
      }}>
        {category.cover_url ? (
          <>
            { }
            <img loading="lazy" decoding="async" src={category.cover_url} alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px)" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(10,10,15,0.65), rgba(10,10,15,0.95))",
            }} />
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${T.violetDark}, ${T.violet})`, opacity: 0.4,
          }} />
        )}

        <div style={{ position: "relative", maxWidth: 1400, margin: "0 auto" }}>
          <Link href="/jesus-daily" style={{ color: T.textMuted, textDecoration: "none", fontSize: 13 }}>
            ← Jesus Daily TV
          </Link>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 56 }}>{category.icon ?? "📺"}</div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h1 style={{
                fontFamily: F.title, fontSize: "clamp(28px, 4.5vw, 44px)",
                margin: 0, lineHeight: 1.1, fontWeight: 800,
              }}>{category.name}</h1>
              {category.description ? (
                <p style={{ color: T.textSoft, fontSize: 15, margin: "8px 0 0", maxWidth: 700, lineHeight: 1.5 }}>
                  {category.description}
                </p>
              ) : null}
              <p style={{ color: T.textMuted, fontSize: 13, margin: "10px 0 0" }}>
                {videos.length} vidéo{videos.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5,
        background: "rgba(10,10,15,0.92)", borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto",
          padding: "12px 24px", display: "flex", gap: 10, alignItems: "center",
          flexWrap: "wrap",
        }}>
          <FilterChip active={sort === "recent"}   onClick={() => setSort("recent")}>✨ Récent</FilterChip>
          <FilterChip active={sort === "popular"}  onClick={() => setSort("popular")}>🔥 Populaire</FilterChip>
          <FilterChip active={sort === "duration"} onClick={() => setSort("duration")}>⏱️ Plus long</FilterChip>
          <FilterChip active={sort === "oldest"}   onClick={() => setSort("oldest")}>📜 Ancien</FilterChip>
          <span style={{ width: 1, height: 22, background: T.border, margin: "0 4px" }} />
          <FilterChip active={filterPremium === "all"}     onClick={() => setFilterPremium("all")}>Tous</FilterChip>
          <FilterChip active={filterPremium === "free"}    onClick={() => setFilterPremium("free")}>🆓 Gratuit</FilterChip>
          <FilterChip active={filterPremium === "premium"} onClick={() => setFilterPremium("premium")}>👑 Premium</FilterChip>
          <FilterChip active={filterLive} onClick={() => setFilterLive((v) => !v)}>🔴 Live uniquement</FilterChip>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        maxWidth: 1400, margin: "0 auto", padding: "26px 24px 80px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 18,
      }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1", padding: "60px 24px", textAlign: "center",
            color: T.textMuted, background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔎</div>
            <h3 style={{ fontFamily: F.title, margin: "0 0 6px", fontSize: 18 }}>Aucune vidéo</h3>
            <p style={{ margin: 0, fontSize: 13 }}>Aucun contenu ne correspond à ces filtres.</p>
          </div>
        ) : filtered.map((v) => (
          <VideoGridCard key={v.id} video={v}
            progress={progressMap[v.id] ?? null}
            isInWatchlist={wlSet.has(v.id)}
            isAuth={isAuth}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px",
      background: active ? T.violet : "rgba(255,255,255,0.06)",
      color: active ? "#fff" : T.textSoft,
      border: `1px solid ${active ? T.violet : T.border}`,
      borderRadius: 999, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}
