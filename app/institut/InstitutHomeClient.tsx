"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { INSTITUT_THEME as T, INSTITUT_FONTS as F, formatDuration, getLevelDef, type Category, type Course } from "@/lib/institut/theme";
import HeroParticles from "@/components/ui/HeroParticles";

interface CourseLite extends Course {
  category_slug: string;
  category_name: string;
  total_lessons: number;
  completed_lessons: number;
  last_seen_at?: string | null;
  is_favorite?: boolean;
}

interface Props {
  categories: Category[];
  popularCourses: CourseLite[];
  myCourses: CourseLite[];
  continueWatching?: CourseLite[];
  favorites?: CourseLite[];
  isAdmin?: boolean;
}

export default function InstitutHomeClient({
  categories, popularCourses, myCourses,
  continueWatching = [], favorites = [],
  isAdmin = false,
}: Props) {
  const [tab, setTab] = useState<"discover" | "mine">("discover");

  const filtered = useMemo(
    () => (tab === "mine" ? myCourses : popularCourses),
    [popularCourses, myCourses, tab]
  );

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 60 }}>
      {/* Hero */}
      <style>{`
        .institut-hero { padding: 18px 14px 16px; }
        .institut-title { font-size: clamp(1.15rem, 4.8vw, 1.6rem); margin: 0 0 4px; white-space: nowrap; }
        .institut-tagline { font-size: clamp(10px, 2.8vw, 12.5px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (min-width: 768px) {
          .institut-hero { padding: 28px 24px 24px; }
        }
        .institut-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .institut-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .institut-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .institut-cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (min-width: 640px) { .institut-cat-grid { grid-template-columns: 1fr 1fr 1fr; } }
        @media (min-width: 1024px) { .institut-cat-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>

      <div className="institut-hero" style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <HeroParticles />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
          zIndex: 1,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          {isAdmin && (
            <Link href="/institut/admin" style={{
              position: "absolute", top: 0, right: 0,
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 999, padding: "6px 14px",
              color: "#fff", fontSize: 11, fontWeight: 700,
              textDecoration: "none",
            }}>
              🛡️ Admin
            </Link>
          )}
          <span className="section-tag">✦ Formation biblique ✦</span>
          <h1 className="institut-title" style={{
            fontFamily: F.title, fontWeight: 700, letterSpacing: "0.04em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          }}>
            <span aria-hidden="true">🎓</span>
            <span>INSTITUT BIBLIQUE <span className="text-gold">BERAKAH</span></span>
          </h1>
          <div className="gold-divider" style={{ margin: "12px auto" }} />
          <p className="institut-tagline" style={{
            margin: 0, opacity: 0.92, fontStyle: "italic", color: T.lavender,
          }}>
            Former des disciples · Transformer des vies
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 14px 40px" }}>

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={sectionTitle}>🔥 Reprends où tu étais</h2>
            <div className="institut-grid">
              {continueWatching.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}

        {/* Favoris */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={sectionTitle}>❤️ Mes favoris</h2>
            <div className="institut-grid">
              {favorites.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}

        {/* Facultés */}
        <h2 style={sectionTitle}>📚 Explore par faculté</h2>
        {categories.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>📚</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucune faculté pour l&apos;instant. Les premières formations arrivent bientôt !
            </div>
          </div>
        ) : (
          <div className="institut-cat-grid" style={{ marginBottom: 32 }}>
            {categories.map((c) => (
              <Link key={c.id} href={`/institut/categorie/${c.slug}`} style={{
                textDecoration: "none", color: T.text,
              }}>
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 14, padding: "16px 14px",
                  textAlign: "center", cursor: "pointer",
                  boxShadow: T.shadowSoft,
                  transition: "transform 0.15s, box-shadow 0.15s",
                  height: "100%",
                  display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6,
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = T.shadowMd; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadowSoft; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 2 }}>{c.icon ?? "📚"}</div>
                  <div style={{
                    fontFamily: F.title, fontSize: 14, fontWeight: 700,
                    color: T.text,
                  }}>
                    {c.name}
                  </div>
                  {c.description && (
                    <div style={{
                      fontSize: 11, color: T.textMuted, lineHeight: 1.4,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                    }}>
                      {c.description}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`,
          marginBottom: 16, marginTop: 8,
        }}>
          {([
            { id: "discover", label: "🌟 Découvrir", count: popularCourses.length },
            { id: "mine",     label: "🎯 Mes formations", count: myCourses.length },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 16px", background: "none", border: "none",
              borderBottom: `2px solid ${tab === t.id ? T.violet : "transparent"}`,
              color: tab === t.id ? T.violet : T.textMuted,
              fontWeight: tab === t.id ? 700 : 500, fontSize: 13,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: F.body,
            }}>
              {t.label} · {t.count}
            </button>
          ))}
        </div>

        {/* Liste cours */}
        {filtered.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎓</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              {tab === "mine"
                ? "Tu n'as pas encore démarré de formation."
                : "Aucune formation pour l'instant. Reviens bientôt !"}
            </div>
          </div>
        ) : (
          <div className="institut-grid">
            {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: CourseLite }) {
  const level = getLevelDef(course.level);
  const progress = course.total_lessons > 0
    ? Math.round((course.completed_lessons / course.total_lessons) * 100)
    : 0;
  const isDone = progress === 100;

  return (
    <Link href={`/institut/cours/${course.slug}`} style={{
      textDecoration: "none", color: T.text, display: "block",
    }}>
      <div style={{
        background: T.card, border: `1px solid ${isDone ? T.completed : T.border}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: T.shadowSoft,
        height: "100%", display: "flex", flexDirection: "column",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = T.shadowMd; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadowSoft; }}
      >
        {/* Thumbnail */}
        <div style={{
          height: 140,
          background: course.thumbnail_url
            ? `url(${course.thumbnail_url}) center/cover`
            : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          position: "relative",
        }}>
          {course.is_premium && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: T.gold, color: "#111",
              padding: "3px 9px", borderRadius: 999,
              fontSize: 9, fontWeight: 700,
            }}>
              👑 Premium
            </div>
          )}
          {isDone && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: T.completed, color: "#fff",
              padding: "3px 9px", borderRadius: 999,
              fontSize: 9, fontWeight: 700,
            }}>
              ✓ Complété
            </div>
          )}
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(0,0,0,0.5)", color: "#fff",
            padding: "3px 9px", borderRadius: 999,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {level.emoji} {level.label}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {course.category_name && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.gold,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {course.category_name}
            </div>
          )}
          <h3 style={{
            fontFamily: F.title, fontSize: 15, fontWeight: 700,
            color: T.text, margin: 0, lineHeight: 1.35,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
          }}>
            {course.title}
          </h3>
          {course.subtitle && (
            <div style={{
              fontSize: 12, color: T.textMuted, lineHeight: 1.45,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
            }}>
              {course.subtitle}
            </div>
          )}
          <div style={{
            display: "flex", gap: 10, fontSize: 11, color: T.textMuted,
            marginTop: "auto", paddingTop: 8,
          }}>
            <span>📖 {course.total_lessons} leçon{course.total_lessons > 1 ? "s" : ""}</span>
            {course.duration_mins && <span>⏱ {formatDuration(course.duration_mins)}</span>}
          </div>
          {course.total_lessons > 0 && course.completed_lessons > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{
                height: 5, background: T.surface2, borderRadius: 3, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: isDone ? T.completed : T.violet,
                  transition: "width 0.3s",
                }} />
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, fontWeight: 700 }}>
                {course.completed_lessons}/{course.total_lessons} · {progress}%
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: F.title, fontSize: 14, fontWeight: 700,
  color: T.textMuted, textTransform: "uppercase",
  letterSpacing: "0.1em", margin: "0 0 14px",
};

const emptyState: React.CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 14, padding: "50px 20px", textAlign: "center", marginBottom: 32,
};
