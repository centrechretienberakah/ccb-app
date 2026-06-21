"use client";

import Link from "next/link";
import DevotionHomeCard from "./DevotionHomeCard";
import OngoingCallBanner from "./OngoingCallBanner";
import type { UnifiedDevotion } from "@/lib/devotion/fetch";

export interface ContinueData {
  bible: { book: string; chapter: number; pct: number } | null;
  plan: { title: string; emoji: string; pct: number; day: number; total: number } | null;
  course: { title: string; slug: string } | null;
}
export interface StreakData { current: number; longest: number; chaptersRead: number }
export interface JdtvLite { id: string; slug: string; title: string; thumbnail_url: string | null; speaker?: string | null }

interface Props {
  displayName: string;
  role?: string;
  devotion: UnifiedDevotion;
  devotionRead: boolean;
  userId: string | null;
  cont: ContinueData;
  streak: StreakData;
  recentJdtv: JdtvLite[];
}

const ESSENTIALS = [
  { href: "/bible",       emoji: "📖", label: "Bible",      accent: "#2563EB" },
  { href: "/jesus-daily", emoji: "🎥", label: "JDTV",       accent: "#7C3AED" },
  { href: "/institut",    emoji: "🎓", label: "Institut",   accent: "#B45309" },
  { href: "/community",   emoji: "👥", label: "Communauté", accent: "#16A34A" },
];

const EVENTS = [
  { icon: "🎓", title: "Bootcamp CCB 2026", date: "26 – 28 Juin 2026", place: "Douala & En ligne", tag: "Bootcamp", href: "https://bootcamp.centrechretienberakah.com", grad: "linear-gradient(135deg,#4C1D95,#7C3AED 60%,#D4AF37)" },
  { icon: "⛪", title: "Culte du Dimanche", date: "Chaque dim. · 17h30", place: "Belgique & En ligne", tag: "Culte", href: "/events", grad: "linear-gradient(135deg,#1e3a8a,#2563EB 70%)" },
  { icon: "🌙", title: "Nuit de Prière", date: "29 Mai · 23h30", place: "En ligne", tag: "Prière", href: "/community/prions-ensemble", grad: "linear-gradient(135deg,#3b0764,#7C3AED 75%)" },
];

export default function DashboardClient({ displayName, devotion, devotionRead, userId, cont, streak, recentJdtv }: Props) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  })();

  const hasContinue = !!(cont.bible || cont.plan || cont.course);
  const streakGoal = Math.max(7, streak.longest || 7);
  const streakPct = Math.min(100, Math.round((streak.current / streakGoal) * 100));

  return (
    <div className="dashboard-page">
      <style>{`
        @keyframes ccb-dash-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .dash-anim { animation: ccb-dash-in .5s ease both; }
        .dash-press { transition: transform .12s ease, box-shadow .15s ease; }
        .dash-press:active { transform: scale(0.96); }
        .dash-essentials { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 600px) { .dash-essentials { grid-template-columns: repeat(4, 1fr); } }
        .dash-rail { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 14px 8px; margin: 0 -14px; -webkit-overflow-scrolling: touch; }
        .dash-rail::-webkit-scrollbar { display: none; }
        .dash-rail > * { scroll-snap-align: start; flex-shrink: 0; }
        @keyframes ccb-bar { from { width: 0; } }
        .dash-bar-fill { animation: ccb-bar .8s ease both; }
        /* Photo en arrière-plan de TOUTE la page d'accueil (fixe) + voile sombre
           immersif (flyer « Semblable à Christ ») — l'app est dark-only, donc
           le voile est toujours sombre, teinté violet/nuit. */
        .dash-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            radial-gradient(ellipse 85% 50% at 50% -6%, rgba(90,44,160,0.45) 0%, transparent 62%),
            linear-gradient(rgba(10,8,18,0.74), rgba(15,10,30,0.86)),
            url('/hero-accueil.webp');
          background-size: cover; background-position: center;
        }
        .dash-content { position: relative; z-index: 1; }
        /* Titres de sections contrastés (texte clair sur photo sombre) */
        .dash-content .dashboard-section-title { text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
      `}</style>
      <div className="dash-bg" aria-hidden="true" />
      <div className="dash-content">

      {/* HERO SPIRITUEL — bandeau image + dégradé violet + glassmorphism.
          Dépose ton visuel dans public/hero-accueil.jpg (paysage ~1600×900, < 300 Ko).
          En son absence, le dégradé violet sert de repli premium. */}
      <div style={{
        position: "relative", overflow: "hidden",
        backgroundColor: "#4C1D95",
        backgroundImage: "linear-gradient(135deg, rgba(76,29,149,0.90) 0%, rgba(91,33,182,0.74) 50%, rgba(58,28,112,0.92) 100%), url('/hero-accueil.webp')",
        backgroundSize: "cover", backgroundPosition: "center",
        color: "#fff",
        padding: "calc(20px + env(safe-area-inset-top, 0px)) 18px 22px",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--gold), transparent)" }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-title)", fontWeight: 800, fontSize: "clamp(1.15rem, 4.6vw, 1.55rem)", lineHeight: 1.15 }}>
            {greeting} {displayName} <span aria-hidden="true">👋</span>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.92, fontStyle: "italic", color: "#EDE7FA" }}>
            Que le Seigneur vous bénisse aujourd&apos;hui.
          </p>
          {devotion?.verse_ref && (
            <div style={{
              marginTop: 13, display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.14)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)",
              border: "1px solid rgba(255,255,255,0.22)", borderRadius: 999, padding: "6px 13px",
              fontSize: 12.5, fontWeight: 600, maxWidth: "100%",
            }}>
              <span aria-hidden="true">📖</span>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Verset du jour · {devotion.verse_ref}</span>
            </div>
          )}
        </div>
      </div>

      <OngoingCallBanner />

      {/* HERO SPIRITUEL — Méditation du jour (carte premium existante) */}
      <div className="dash-anim"><DevotionHomeCard devotion={devotion} userId={userId} initialRead={devotionRead} /></div>

      {/* MON PARCOURS — Reprendre où j'étais */}
      {hasContinue && (
        <div className="dashboard-section dash-anim" style={{ animationDelay: ".05s" }}>
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Reprendre où j&apos;étais</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cont.bible && (
              <ContinueCard
                href={`/bible/read/${encodeURIComponent(cont.bible.book)}/${cont.bible.chapter}`}
                emoji="📖" accent="#2563EB"
                title="Lecture biblique" sub={`${cont.bible.book} ${cont.bible.chapter}`}
                pct={cont.bible.pct} cta="Continuer"
              />
            )}
            {cont.plan && (
              <ContinueCard
                href="/plan-biblique" emoji={cont.plan.emoji} accent="#16A34A"
                title="Plan de lecture" sub={`${cont.plan.title} · Jour ${cont.plan.day}/${cont.plan.total}`}
                pct={cont.plan.pct} cta="Reprendre"
              />
            )}
            {cont.course && (
              <ContinueCard
                href={`/institut/cours/${cont.course.slug}`} emoji="🎓" accent="#B45309"
                title="Formation en cours" sub={cont.course.title}
                pct={null} cta="Reprendre"
              />
            )}
          </div>
        </div>
      )}

      {/* MES ESSENTIELS — 4 gros boutons */}
      <div className="dashboard-section dash-anim" style={{ animationDelay: ".1s" }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Mes essentiels</h3>
          <span className="dashboard-section-sub">L&apos;essentiel, en un geste</span>
        </div>
        <div className="dash-essentials">
          {ESSENTIALS.map((e) => (
            <Link key={e.href} href={e.href} className="dash-press" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 18,
              padding: "18px 10px", textDecoration: "none", color: "var(--text-primary)",
              boxShadow: "var(--shadow-sm)", minHeight: 104,
            }}>
              <span style={{
                width: 54, height: 54, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, background: `${e.accent}1a`,
              }}>{e.emoji}</span>
              <span style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 13.5 }}>{e.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ACTIVITÉ SPIRITUELLE — série / streak */}
      <div className="dashboard-section dash-anim" style={{ animationDelay: ".15s" }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Mon activité spirituelle</h3>
        </div>
        <div style={{
          background: "linear-gradient(135deg, var(--violet-dark, #4C1D95), var(--violet, #5B21B6))",
          borderRadius: 18, padding: 18, color: "#fff", boxShadow: "0 8px 24px rgba(91,33,182,0.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>🔥</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-title)", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                {streak.current} jour{streak.current > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
                de lecture consécutifs {streak.longest > 0 && <>· 🏆 record {streak.longest}</>}
              </div>
            </div>
            <Link href="/bible/lire" className="dash-press" style={{
              flexShrink: 0, background: "var(--gold)", color: "#1A1230", borderRadius: 999,
              padding: "8px 16px", fontWeight: 800, fontSize: 12.5, textDecoration: "none",
            }}>Lire</Link>
          </div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
            <div className="dash-bar-fill" style={{ width: `${streakPct}%`, height: "100%", background: "linear-gradient(90deg, #FBBF24, var(--gold))", borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, opacity: 0.85 }}>
            <span>📖 {streak.chaptersRead} chapitre{streak.chaptersRead > 1 ? "s" : ""} lus</span>
            <span>Objectif : {streakGoal} jours</span>
          </div>
        </div>
      </div>

      {/* ÉVÉNEMENTS CCB — carousel */}
      <div className="dashboard-section dash-anim" style={{ animationDelay: ".2s" }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Événements CCB</h3>
          <Link href="/events" className="dashboard-see-all">Voir tout</Link>
        </div>
        <div className="dash-rail">
          {EVENTS.map((ev) => (
            <Link key={ev.title} href={ev.href} className="dash-press" style={{
              width: 270, borderRadius: 18, overflow: "hidden", textDecoration: "none",
              background: ev.grad, color: "#fff", boxShadow: "0 8px 24px rgba(31,20,60,0.18)",
              padding: 16, display: "flex", flexDirection: "column", gap: 6, minHeight: 132,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 30 }}>{ev.icon}</span>
                <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "3px 10px", fontSize: 10.5, fontWeight: 800 }}>{ev.tag}</span>
              </div>
              <div style={{ fontFamily: "var(--font-title)", fontWeight: 800, fontSize: 16, marginTop: "auto", lineHeight: 1.2 }}>{ev.title}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>📅 {ev.date}</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>📍 {ev.place}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* DERNIERS CONTENUS — JDTV */}
      {recentJdtv.length > 0 && (
        <div className="dashboard-section dash-anim" style={{ animationDelay: ".25s", paddingBottom: 32 }}>
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Derniers contenus</h3>
            <Link href="/jesus-daily" className="dashboard-see-all">Voir tout</Link>
          </div>
          <div className="dash-rail">
            {recentJdtv.map((v) => (
              <Link key={v.id} href="/jesus-daily" className="dash-press" style={{
                width: 150, textDecoration: "none", color: "var(--text-primary)",
              }}>
                <div style={{
                  width: "100%", aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden",
                  background: v.thumbnail_url ? `#000 url(${v.thumbnail_url}) center/cover` : "linear-gradient(135deg,#4C1D95,#7C3AED)",
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)",
                  position: "relative",
                }}>
                  {!v.thumbnail_url && <span style={{ fontSize: 30 }}>🎥</span>}
                  <span style={{ position: "absolute", right: 6, bottom: 6, background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 999, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>▶</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{v.title}</div>
                {v.speaker && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{v.speaker}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function ContinueCard({ href, emoji, accent, title, sub, pct, cta }: {
  href: string; emoji: string; accent: string; title: string; sub: string; pct: number | null; cta: string;
}) {
  return (
    <Link href={href} className="dash-press" style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 16,
      padding: "12px 14px", textDecoration: "none", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)",
    }}>
      <span style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: `${accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
        <div style={{ fontFamily: "var(--font-title)", fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{sub}</div>
        {pct !== null && (
          <div style={{ marginTop: 6, height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
            <div className="dash-bar-fill" style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 999 }} />
          </div>
        )}
      </div>
      <span style={{ flexShrink: 0, background: accent, color: "#fff", borderRadius: 999, padding: "7px 14px", fontWeight: 700, fontSize: 12.5 }}>{cta}</span>
    </Link>
  );
}
