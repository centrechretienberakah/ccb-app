"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  formatDuration, getLevelDef,
  type Category, type Subcategory, type Course,
} from "@/lib/institut/theme";

interface CourseLite extends Course {
  total_lessons: number;
  completed_lessons: number;
}

interface Props {
  category: Category;
  subcategories: Subcategory[];
  courses: CourseLite[];
}

export default function CategoryClient({ category, subcategories, courses }: Props) {
  const [filterSub, setFilterSub] = useState<string>("");

  const filtered = useMemo(() => {
    if (!filterSub) return courses;
    return courses.filter((c) => c.subcategory_id === filterSub);
  }, [courses, filterSub]);

  // Cours sans sous-faculté
  const orphanCourses = courses.filter((c) => !c.subcategory_id);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 50 }}>
      <style>{`
        .institut-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .institut-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .institut-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      {/* Hero spécifique faculté */}
      <div style={{
        background: category.cover_url
          ? `linear-gradient(135deg, rgba(91, 33, 182,0.85), rgba(62,28,112,0.85)), url(${category.cover_url}) center/cover`
          : `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "28px 18px 24px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Link href="/institut" style={{
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8, padding: "6px 12px",
            color: "#fff", fontSize: 12, fontWeight: 700,
            textDecoration: "none", display: "inline-block", marginBottom: 12,
          }}>← Institut Biblique Berakah</Link>
          <div style={{ fontSize: 38, marginBottom: 4 }}>{category.icon ?? "📚"}</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.4rem, 5vw, 2rem)",
            fontWeight: 700, margin: "0 0 6px", letterSpacing: "0.04em",
          }}>
            {category.name.toUpperCase()}
          </h1>
          {category.description && (
            <p style={{
              margin: 0, fontSize: 14, opacity: 0.92,
              color: T.lavender, lineHeight: 1.5,
            }}>
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 14px 40px" }}>

        {/* Sous-facultés en chips */}
        {subcategories.length > 0 && (
          <div style={{
            display: "flex", gap: 6, marginBottom: 18,
            overflowX: "auto", paddingBottom: 4,
          }}>
            <button onClick={() => setFilterSub("")} style={chipStyle(filterSub === "")}>
              📚 Toutes ({courses.length})
            </button>
            {subcategories.map((s) => {
              const count = courses.filter((c) => c.subcategory_id === s.id).length;
              if (count === 0) return null;
              return (
                <button key={s.id} onClick={() => setFilterSub(filterSub === s.id ? "" : s.id)}
                  style={chipStyle(filterSub === s.id)}>
                  {s.icon ?? "🔖"} {s.name} ({count})
                </button>
              );
            })}
            {orphanCourses.length > 0 && (
              <button onClick={() => setFilterSub("none")} style={chipStyle(filterSub === "none")}>
                Sans sous-faculté ({orphanCourses.length})
              </button>
            )}
          </div>
        )}

        {/* Liste cours */}
        {filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "50px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎓</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucune formation dans cette section pour l&apos;instant.
            </div>
          </div>
        ) : (
          <div className="institut-grid">
            {(filterSub === "none"
              ? orphanCourses
              : filterSub
                ? filtered.filter((c) => c.subcategory_id === filterSub)
                : filtered
            ).map((c) => <CourseCard key={c.id} course={c} />)}
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
            }}>👑 Premium</div>
          )}
          {isDone && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: T.completed, color: "#fff",
              padding: "3px 9px", borderRadius: 999,
              fontSize: 9, fontWeight: 700,
            }}>✓ Complété</div>
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

        <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
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
              <div style={{ height: 5, background: T.surface2, borderRadius: 3, overflow: "hidden" }}>
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

function chipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: "6px 12px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
    whiteSpace: "nowrap",
  };
}
