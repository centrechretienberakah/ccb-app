"use client";
import Link from "next/link";
import { JDTV_THEME as T, JDTV_FONTS as F, formatViewCount } from "@/lib/jdtv/theme";

export interface GlobalKpis {
  published_videos: number;
  live_now: number;
  premium_videos: number;
  total_views: number;
  total_comments: number;
  total_reactions: number;
  unique_viewers_rows: number;
  watchlist_total: number;
  unique_viewers: number;
  published_categories: number;
}

export interface VideoStat {
  video_id: string;
  slug: string;
  title: string;
  speaker: string | null;
  view_count: number;
  viewers: number;
  completed_viewers: number;
  completion_pct: number;
  comment_count: number;
  reaction_count: number;
  is_live: boolean;
  is_premium: boolean;
}

export interface SpeakerStat {
  speaker: string;
  video_count: number;
  total_views: number;
}

export interface CategoryEngagement {
  category_id: string;
  slug: string;
  name: string;
  icon: string | null;
  video_count: number;
  total_views: number;
  total_comments: number;
  total_reactions: number;
  avg_completion_pct: number;
}

export interface ActivityDay {
  day: string;
  new_videos: number;
  comments: number;
  active_viewers: number;
}

interface Props {
  kpis: GlobalKpis;
  topVideos: VideoStat[];
  topCompletion: VideoStat[];
  speakers: SpeakerStat[];
  activity: ActivityDay[];
  catEngagement: CategoryEngagement[];
  sqlReady: boolean;
}

export default function AnalyticsClient({
  kpis, topVideos, topCompletion, speakers, activity, catEngagement, sqlReady,
}: Props) {
  const maxActivity = Math.max(
    1,
    ...activity.map((d) => Math.max(d.new_videos, d.comments, d.active_viewers))
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bgGrad, color: T.text, fontFamily: F.body }}>
      <header style={{ padding: "26px 24px 12px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
          <Link href="/jesus-daily" style={{ color: T.textMuted, textDecoration: "none" }}>📺 Jesus Daily TV</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/jesus-daily/admin" style={{ color: T.textMuted, textDecoration: "none" }}>Admin</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Analytics</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: F.title, fontSize: 28, margin: 0 }}>📊 Analytics</h1>
          <Link href="/jesus-daily/admin" style={{
            padding: "8px 14px", background: "rgba(255,255,255,0.06)",
            border: `1px solid ${T.border}`, color: T.text,
            borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>← Retour à la console</Link>
        </div>
      </header>

      {!sqlReady ? (
        <div style={{
          maxWidth: 900, margin: "0 auto 18px", padding: 18,
          background: T.card, border: `1px dashed ${T.live}`, borderRadius: 12,
          color: T.textSoft, fontSize: 14, lineHeight: 1.5,
        }}>
          ⚠️ Les vues analytics ne sont pas disponibles. Exécute{" "}
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
            supabase/jdtv_phase7_v31.sql
          </code>{" "}
          dans Supabase SQL Editor pour activer le dashboard.
        </div>
      ) : null}

      {/* KPI cards */}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14,
      }}>
        <Kpi icon="🎬" label="Vidéos publiées" value={kpis.published_videos} />
        <Kpi icon="🔴" label="Live en cours"   value={kpis.live_now} accent={T.live} />
        <Kpi icon="👁️" label="Vues totales"    value={formatViewCount(kpis.total_views)} />
        <Kpi icon="👥" label="Spectateurs uniques" value={formatViewCount(kpis.unique_viewers)} />
        <Kpi icon="💬" label="Commentaires"     value={kpis.total_comments} />
        <Kpi icon="❤️" label="Réactions"        value={kpis.total_reactions} />
        <Kpi icon="❤️" label="Ajouts Ma Liste" value={kpis.watchlist_total} />
        <Kpi icon="👑" label="Premium"          value={kpis.premium_videos} accent={T.gold} />
      </section>

      {/* Activité 30j */}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px" }}>
        <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>📈 Activité 30 derniers jours</h2>
        <div style={{
          padding: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        }}>
          {activity.length === 0 ? (
            <p style={{ color: T.textMuted, fontSize: 13, margin: 0, textAlign: "center" }}>Pas encore de données.</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 12, color: T.textMuted, fontSize: 12, flexWrap: "wrap" }}>
                <LegendDot color={T.violet} label="Spectateurs actifs" />
                <LegendDot color={T.gold}   label="Commentaires" />
                <LegendDot color={T.live}   label="Nouvelles vidéos" />
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${activity.length}, minmax(0, 1fr))`,
                gap: 2,
                height: 160,
                alignItems: "end",
              }}>
                {activity.map((d) => (
                  <div key={d.day} title={`${d.day} — ${d.active_viewers} actifs / ${d.comments} comments / ${d.new_videos} nouvelles vidéos`}
                    style={{
                      display: "flex", flexDirection: "column-reverse",
                      gap: 1, height: "100%",
                    }}>
                    <div style={{ height: `${(d.active_viewers / maxActivity) * 100}%`, background: T.violet, borderRadius: "2px 2px 0 0", minHeight: d.active_viewers > 0 ? 1 : 0 }} />
                    <div style={{ height: `${(d.comments / maxActivity) * 100}%`,       background: T.gold,   minHeight: d.comments > 0 ? 1 : 0 }} />
                    <div style={{ height: `${(d.new_videos / maxActivity) * 100}%`,     background: T.live,   minHeight: d.new_videos > 0 ? 1 : 0 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: T.textMuted, fontSize: 11 }}>
                <span>{fmtDay(activity[0]?.day)}</span>
                <span>aujourd&apos;hui</span>
              </div>
            </>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18,
      }} className="jdtv-analytics-grid">
        {/* Top vidéos vues */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🔥 Top 10 — Plus vues</h2>
          <RankList rows={topVideos} mode="views" empty="Aucune vidéo encore vue." />
        </section>

        {/* Top complétion */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🎯 Top 10 — Taux de complétion</h2>
          <RankList rows={topCompletion} mode="completion" empty="Aucune vidéo encore complétée." />
        </section>

        {/* Engagement par catégorie */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>📂 Engagement par catégorie</h2>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
            overflow: "hidden",
          }}>
            {catEngagement.length === 0 ? (
              <Empty>Pas encore de catégorie.</Empty>
            ) : catEngagement.map((c) => (
              <Link key={c.category_id} href={`/jesus-daily/categorie/${c.slug}`}
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                  padding: "12px 14px", borderBottom: `1px solid ${T.border}`,
                  textDecoration: "none", color: T.text,
                }}>
                <span style={{ fontSize: 22 }}>{c.icon ?? "📂"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    {c.video_count} vid · {formatViewCount(c.total_views)} vues · {c.total_comments} 💬 · {c.total_reactions} ❤️
                  </div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 999,
                  background: T.violetSoft, border: `1px solid ${T.violet}`,
                  fontSize: 11, fontWeight: 700,
                }}>{c.avg_completion_pct}% complétion</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Top intervenants */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🎙️ Top intervenants</h2>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden",
          }}>
            {speakers.length === 0 ? (
              <Empty>Pas encore de vidéos.</Empty>
            ) : speakers.map((s, i) => {
              const max = speakers[0].total_views || 1;
              const pct = Math.round((Number(s.total_views) / Number(max)) * 100);
              return (
                <div key={s.speaker} style={{
                  position: "relative", padding: "12px 14px",
                  borderBottom: `1px solid ${T.border}`, overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${pct}%`,
                    background: `linear-gradient(90deg, ${T.violetSoft}, transparent)`, opacity: 0.7,
                  }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 999,
                        background: i < 3 ? T.gold : "rgba(255,255,255,0.08)",
                        color: i < 3 ? "#000" : "#fff",
                        fontWeight: 800, fontSize: 11,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.speaker}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{s.video_count} vidéo{s.video_count > 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>👁️ {formatViewCount(Number(s.total_views))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div style={{ height: 40 }} />
      <style jsx global>{`
        @media (max-width: 800px) {
          .jdtv-analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      padding: 16, background: T.card, border: `1px solid ${accent ?? T.border}`,
      borderRadius: 12, display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, fontSize: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      </div>
      <div style={{ fontFamily: F.title, fontSize: 28, fontWeight: 800, color: accent ?? T.text }}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}
    </span>
  );
}

function RankList({ rows, mode, empty }: { rows: VideoStat[]; mode: "views" | "completion"; empty: string }) {
  if (rows.length === 0) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <Empty>{empty}</Empty>
      </div>
    );
  }
  const max = mode === "views"
    ? Math.max(1, ...rows.map((r) => r.view_count))
    : 100;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      {rows.map((v, i) => {
        const value = mode === "views" ? v.view_count : v.completion_pct;
        const pct = Math.round((value / max) * 100);
        return (
          <div key={v.video_id} style={{
            position: "relative", padding: "12px 14px", borderBottom: `1px solid ${T.border}`, overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, width: `${pct}%`,
              background: `linear-gradient(90deg, ${mode === "views" ? T.goldSoft : T.violetSoft}, transparent)`,
            }} />
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "26px 1fr auto", gap: 10, alignItems: "center" }}>
              <span style={{
                width: 22, height: 22, borderRadius: 999,
                background: i < 3 ? (mode === "views" ? T.gold : T.violet) : "rgba(255,255,255,0.08)",
                color: i < 3 ? (mode === "views" ? "#000" : "#fff") : "#fff",
                fontWeight: 800, fontSize: 10,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <Link href={`/jesus-daily/video/${v.slug}`} style={{
                  fontWeight: 600, fontSize: 13, color: T.text, textDecoration: "none",
                  display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{v.title}</Link>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {v.speaker ? <span>🎙️ {v.speaker}</span> : null}
                  <span>💬 {v.comment_count}</span>
                  <span>❤️ {v.reaction_count}</span>
                  {v.viewers > 0 ? <span>👥 {v.viewers}</span> : null}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, textAlign: "right", whiteSpace: "nowrap" }}>
                {mode === "views" ? formatViewCount(v.view_count) : `${v.completion_pct}%`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "30px 14px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      {children}
    </div>
  );
}

function fmtDay(day: string | undefined): string {
  if (!day) return "";
  try {
    return new Date(day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch { return day; }
}
