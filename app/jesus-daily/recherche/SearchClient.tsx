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
import VideoGridCard from "../_components/VideoGridCard";

type DurationFilter = "any" | "short" | "medium" | "long";
type PremiumFilter = "all" | "free" | "premium";
type SortMode = "relevance" | "recent" | "popular";

interface Props {
  initialQuery: string;
  initialCategorySlug: string;
  categories: JdtvCategory[];
  videos: JdtvVideo[];
  watchlistIds: string[];
  progressMap: Record<string, JdtvWatchProgress>;
  isAuth: boolean;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function SearchClient({
  initialQuery, initialCategorySlug, categories, videos, watchlistIds, progressMap, isAuth,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [catSlug, setCatSlug] = useState(initialCategorySlug);
  const [premium, setPremium] = useState<PremiumFilter>("all");
  const [duration, setDuration] = useState<DurationFilter>("any");
  const [liveOnly, setLiveOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("relevance");

  const wlSet = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  const catsBySlug = useMemo(() => {
    const m = new Map<string, JdtvCategory>();
    categories.forEach((c) => m.set(c.slug, c));
    return m;
  }, [categories]);
  const catsById = useMemo(() => {
    const m = new Map<string, JdtvCategory>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const qNorm = norm(query.trim());
    const selectedCat = catSlug ? catsBySlug.get(catSlug) ?? null : null;

    const arr = videos.filter((v) => {
      if (selectedCat && v.category_id !== selectedCat.id) return false;
      if (premium === "free" && v.is_premium) return false;
      if (premium === "premium" && !v.is_premium) return false;
      if (liveOnly && !v.is_live) return false;
      if (duration !== "any" && v.duration_secs) {
        const d = v.duration_secs;
        if (duration === "short"  && d > 10 * 60) return false;
        if (duration === "medium" && (d <= 10 * 60 || d > 30 * 60)) return false;
        if (duration === "long"   && d <= 30 * 60) return false;
      }
      if (!qNorm) return true;
      const hay = norm(
        `${v.title} ${v.subtitle ?? ""} ${v.description ?? ""} ${v.speaker ?? ""} ${v.scripture ?? ""} ${(v.tags ?? []).join(" ")}`
      );
      return hay.includes(qNorm);
    });

    // Sort
    if (sort === "recent") {
      arr.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sort === "popular") {
      arr.sort((a, b) => b.view_count - a.view_count);
    } else {
      // relevance : titre match boost
      if (qNorm) {
        const score = (v: JdtvVideo) => {
          let s = 0;
          if (norm(v.title).includes(qNorm)) s += 5;
          if (norm(v.speaker ?? "").includes(qNorm)) s += 3;
          if (norm(v.scripture ?? "").includes(qNorm)) s += 2;
          if ((v.tags ?? []).some((t) => norm(t).includes(qNorm))) s += 2;
          s += v.view_count * 0.0001;
          return -s;
        };
        arr.sort((a, b) => score(a) - score(b));
      } else {
        arr.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      }
    }

    return arr;
  }, [videos, query, catSlug, catsBySlug, premium, liveOnly, duration, sort]);

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 6,
        background: "rgba(10,10,15,0.92)", borderBottom: `1px solid ${T.border}`,
        backdropFilter: "blur(10px)",
        padding: "14px 24px",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/jesus-daily" style={{ color: T.textMuted, textDecoration: "none", fontSize: 22 }}>‹</Link>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔎 Titre, intervenant, verset, thème…"
              style={{
                width: "100%", padding: "12px 16px 12px 16px",
                background: T.card, color: T.text, border: `1px solid ${T.border}`,
                borderRadius: 999, fontSize: 15,
              }}
            />
            {query ? (
              <button onClick={() => setQuery("")} aria-label="Effacer" style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                width: 28, height: 28, borderRadius: 999, border: "none",
                background: "rgba(255,255,255,0.06)", color: T.text, cursor: "pointer",
              }}>×</button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "14px 24px 0",
        display: "flex", gap: 8, flexWrap: "wrap",
      }}>
        <FilterChip active={!catSlug} onClick={() => setCatSlug("")}>📺 Toutes catégories</FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={catSlug === c.slug} onClick={() => setCatSlug(c.slug)}>
            {c.icon ?? "📂"} {c.name}
          </FilterChip>
        ))}
      </div>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "10px 24px 10px",
        display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
      }}>
        <FilterChip active={premium === "all"}     onClick={() => setPremium("all")}>Tout</FilterChip>
        <FilterChip active={premium === "free"}    onClick={() => setPremium("free")}>🆓 Gratuit</FilterChip>
        <FilterChip active={premium === "premium"} onClick={() => setPremium("premium")}>👑 Premium</FilterChip>
        <span style={{ width: 1, height: 18, background: T.border, margin: "0 4px" }} />
        <FilterChip active={duration === "any"}    onClick={() => setDuration("any")}>⏱️ Toutes durées</FilterChip>
        <FilterChip active={duration === "short"}  onClick={() => setDuration("short")}>≤ 10 min</FilterChip>
        <FilterChip active={duration === "medium"} onClick={() => setDuration("medium")}>10–30 min</FilterChip>
        <FilterChip active={duration === "long"}   onClick={() => setDuration("long")}>≥ 30 min</FilterChip>
        <span style={{ width: 1, height: 18, background: T.border, margin: "0 4px" }} />
        <FilterChip active={liveOnly} onClick={() => setLiveOnly((v) => !v)}>🔴 Live</FilterChip>
        <span style={{ flex: 1 }} />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} style={{
          padding: "7px 12px",
          background: T.card, color: T.text, border: `1px solid ${T.border}`,
          borderRadius: 999, fontSize: 12.5, cursor: "pointer",
        }}>
          <option value="relevance">⭐ Pertinence</option>
          <option value="recent">✨ Récent</option>
          <option value="popular">🔥 Populaire</option>
        </select>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 24px 0" }}>
        <p style={{ color: T.textMuted, fontSize: 13, margin: "12px 0 8px" }}>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          {query ? <> pour <strong style={{ color: T.text }}>&ldquo;{query}&rdquo;</strong></> : null}
        </p>
      </div>

      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px",
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
            <h3 style={{ fontFamily: F.title, margin: "0 0 6px", fontSize: 18 }}>Aucun résultat</h3>
            <p style={{ margin: 0, fontSize: 13 }}>Essaie d&apos;autres mots-clés ou élargis les filtres.</p>
          </div>
        ) : filtered.map((v) => (
          <div key={v.id}>
            <VideoGridCard video={v}
              progress={progressMap[v.id] ?? null}
              isInWatchlist={wlSet.has(v.id)}
              isAuth={isAuth}
            />
            {v.category_id && catsById.get(v.category_id) ? (
              <Link href={`/jesus-daily/categorie/${catsById.get(v.category_id)!.slug}`}
                style={{
                  display: "inline-block", marginTop: 6, fontSize: 11,
                  color: T.textMuted, textDecoration: "none",
                }}>
                {catsById.get(v.category_id)!.icon} {catsById.get(v.category_id)!.name}
              </Link>
            ) : null}
          </div>
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
