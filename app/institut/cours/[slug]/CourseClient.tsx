"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  formatDuration, formatLessonDuration, getLevelDef, getEmbedUrl,
  type Course, type Category, type Module, type Lesson,
} from "@/lib/institut/theme";

interface LessonLite extends Lesson {
  is_completed: boolean;
  watched_secs: number;
}

interface ModuleWithLessons extends Module {
  lessons: LessonLite[];
}

interface Props {
  course: Course;
  category: Category | null;
  modules: ModuleWithLessons[];
  totalLessons: number;
  completedLessons: number;
  isFavorite?: boolean;
}

export default function CourseClient({ course, category, modules, totalLessons, completedLessons, isFavorite: initialFav = false }: Props) {
  const level = getLevelDef(course.level);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isDone = progress === 100;
  const [openModuleId, setOpenModuleId] = useState<string | null>(modules[0]?.id ?? null);
  const [isFavorite, setIsFavorite] = useState(initialFav);
  const [favBusy, setFavBusy] = useState(false);

  async function toggleFavorite() {
    if (favBusy) return;
    setFavBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFavBusy(false); return; }
    if (isFavorite) {
      await supabase.from("institut_user_favorites")
        .delete().eq("user_id", user.id).eq("course_id", course.id);
      setIsFavorite(false);
    } else {
      await supabase.from("institut_user_favorites")
        .insert({ user_id: user.id, course_id: course.id });
      setIsFavorite(true);
    }
    setFavBusy(false);
  }

  // Détermine la "prochaine leçon" à reprendre
  const nextLesson = useMemo(() => {
    for (const m of modules) {
      for (const l of m.lessons) {
        if (!l.is_completed) return l;
      }
    }
    return modules[0]?.lessons[0] ?? null;
  }, [modules]);

  const trailer = course.trailer_url ? getEmbedUrl(course.trailer_url) : null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 50 }}>
      <style>{`
        .course-layout { max-width: 1080px; margin: 0 auto; padding: 16px 14px 40px; }
        @media (min-width: 1024px) {
          .course-layout-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
            gap: 28px;
            align-items: start;
          }
        }
      `}</style>

      {/* Hero */}
      <div style={{
        background: course.thumbnail_url
          ? `linear-gradient(135deg, rgba(91, 33, 182,0.85), rgba(62,28,112,0.85)), url(${course.thumbnail_url}) center/cover`
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
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <Link href="/institut" style={breadLink}>← Institut</Link>
            {category && (
              <Link href={`/institut/categorie/${category.slug}`} style={breadLink}>
                {category.icon ?? "📚"} {category.name}
              </Link>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{
              background: "rgba(0,0,0,0.4)", padding: "3px 10px",
              borderRadius: 999, fontSize: 11, fontWeight: 700,
            }}>
              {level.emoji} {level.label}
            </span>
            {course.is_premium && (
              <span style={{
                background: T.gold, color: "#111",
                padding: "3px 10px", borderRadius: 999,
                fontSize: 11, fontWeight: 700,
              }}>👑 Premium</span>
            )}
            {isDone && (
              <span style={{
                background: T.completed, color: "#fff",
                padding: "3px 10px", borderRadius: 999,
                fontSize: 11, fontWeight: 700,
              }}>✓ Complété</span>
            )}
          </div>

          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 700, margin: "0 0 6px", letterSpacing: "0.02em",
            lineHeight: 1.25,
          }}>
            {course.title}
          </h1>
          {course.subtitle && (
            <p style={{
              margin: "0 0 8px", fontSize: 14, opacity: 0.92,
              color: T.lavender, lineHeight: 1.5,
            }}>
              {course.subtitle}
            </p>
          )}

          <div style={{
            display: "flex", gap: 14, fontSize: 12, color: "rgba(255,255,255,0.85)",
            flexWrap: "wrap",
          }}>
            <span>📖 {totalLessons} leçon{totalLessons > 1 ? "s" : ""}</span>
            {course.duration_mins && <span>⏱ {formatDuration(course.duration_mins)}</span>}
            {course.instructor && <span>🎙️ {course.instructor}</span>}
          </div>

          {/* Action bar dans le hero */}
          <div style={{
            display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap",
          }}>
            <button onClick={toggleFavorite} disabled={favBusy} style={{
              background: isFavorite ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.3)",
              border: `1px solid ${isFavorite ? "transparent" : "rgba(255,255,255,0.3)"}`,
              borderRadius: 999, padding: "7px 14px",
              color: isFavorite ? "#C24B7A" : "#fff",
              fontWeight: 700, fontSize: 12, cursor: favBusy ? "wait" : "pointer",
              fontFamily: F.body,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              {isFavorite ? "❤️ Favori" : "🤍 Ajouter aux favoris"}
            </button>

            {isDone && (
              <Link href={`/institut/cours/${course.slug}/certificat`} style={{
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                color: "#111",
                borderRadius: 999, padding: "7px 14px",
                fontWeight: 700, fontSize: 12, fontFamily: F.body,
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 12px rgba(212,175,55,0.4)",
              }}>
                🏆 Voir mon certificat
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Layout grid : (gauche) description + bouton CTA / (droite) modules accordion */}
      <div className="course-layout">
        <div className="course-layout-grid">

          {/* Colonne gauche : Trailer + Description + CTA */}
          <div>
            {trailer && (
              <div className="ibb-video">
                {trailer.provider === "youtube" || trailer.provider === "vimeo" ? (
                  <iframe src={trailer.src} title={course.title} loading="lazy" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                ) : (
                  <video src={trailer.src} controls playsInline />
                )}
              </div>
            )}

            {/* CTA */}
            {nextLesson && (
              <Link href={`/institut/lecon/${nextLesson.slug}`} style={{
                display: "block", textAlign: "center",
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                color: "#111", padding: "14px 20px", borderRadius: 12,
                fontWeight: 700, fontSize: 14, fontFamily: F.body,
                textDecoration: "none", marginBottom: 18,
                boxShadow: "0 4px 18px rgba(212,175,55,0.35)",
              }}>
                {completedLessons === 0 ? "▶ Commencer la formation" : "▶ Reprendre la leçon suivante"}
              </Link>
            )}

            {/* Progression */}
            {totalLessons > 0 && (
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: 14, marginBottom: 18,
                boxShadow: T.shadowSoft,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: T.gold,
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
                }}>
                  📊 Ta progression
                </div>
                <div style={{ height: 10, background: T.surface2, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{
                    height: "100%", width: `${progress}%`,
                    background: isDone ? T.completed : `linear-gradient(90deg, ${T.violet}, ${T.gold})`,
                    transition: "width 0.4s",
                  }} />
                </div>
                <div style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>
                  {completedLessons}/{totalLessons} leçons · {progress}%
                </div>
              </div>
            )}

            {/* Description */}
            {course.description && (
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: 18, marginBottom: 18,
                boxShadow: T.shadowSoft,
              }}>
                <h2 style={sectionTitle}>📝 À propos de cette formation</h2>
                <p style={{
                  margin: 0, fontSize: 14, color: T.textSoft,
                  lineHeight: 1.7, whiteSpace: "pre-wrap",
                }}>
                  {course.description}
                </p>
              </div>
            )}
          </div>

          {/* Colonne droite : Modules accordion */}
          <div>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: T.shadowSoft,
            }}>
              <div style={{
                padding: "14px 18px",
                background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                color: "#fff",
              }}>
                <div style={{
                  fontFamily: F.title, fontSize: 14, fontWeight: 700,
                  letterSpacing: "0.05em",
                }}>
                  📚 PROGRAMME
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                  {modules.length} module{modules.length > 1 ? "s" : ""} · {totalLessons} leçon{totalLessons > 1 ? "s" : ""}
                </div>
              </div>

              {modules.length === 0 ? (
                <div style={{
                  padding: 30, textAlign: "center", color: T.textMuted, fontSize: 13,
                }}>
                  Aucun module disponible pour l&apos;instant.
                </div>
              ) : (
                <div>
                  {modules.map((m, mi) => {
                    const open = openModuleId === m.id;
                    const modCompleted = m.lessons.filter((l) => l.is_completed).length;
                    return (
                      <div key={m.id} style={{
                        borderTop: mi === 0 ? "none" : `1px solid ${T.borderSoft}`,
                      }}>
                        <button onClick={() => setOpenModuleId(open ? null : m.id)} style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "12px 16px", background: "transparent",
                          border: "none", textAlign: "left", cursor: "pointer", fontFamily: F.body,
                        }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: modCompleted === m.lessons.length && m.lessons.length > 0 ? T.completed : T.violetSoft,
                            color: modCompleted === m.lessons.length && m.lessons.length > 0 ? "#fff" : T.violet,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {modCompleted === m.lessons.length && m.lessons.length > 0 ? "✓" : mi + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: F.title, fontSize: 14, fontWeight: 700,
                              color: T.text, marginBottom: 2,
                            }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>
                              {m.lessons.length} leçon{m.lessons.length > 1 ? "s" : ""}
                              {m.lessons.length > 0 && ` · ${modCompleted}/${m.lessons.length} terminée${modCompleted > 1 ? "s" : ""}`}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, color: T.gold }}>{open ? "▴" : "▾"}</span>
                        </button>

                        {open && m.lessons.length > 0 && (
                          <div style={{ borderTop: `1px solid ${T.borderSoft}`, background: T.surface2 }}>
                            {m.lessons.map((l, li) => (
                              <Link key={l.id} href={`/institut/lecon/${l.slug}`} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 16px 10px 52px",
                                textDecoration: "none", color: T.text,
                                borderTop: li === 0 ? "none" : `1px solid ${T.borderSoft}`,
                                transition: "background 0.15s",
                              }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = T.violetSoft)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <span style={{
                                  width: 22, height: 22, borderRadius: "50%",
                                  background: l.is_completed ? T.completed : "transparent",
                                  border: l.is_completed ? `2px solid ${T.completed}` : `2px solid ${T.border}`,
                                  color: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                  {l.is_completed ? "✓" : ""}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 13, fontWeight: l.is_completed ? 500 : 600,
                                    color: l.is_completed ? T.textMuted : T.text,
                                  }}>
                                    {l.title}
                                  </div>
                                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                                    {l.video_url && "🎬 "}
                                    {l.audio_url && "🎵 "}
                                    {l.pdf_url && "📄 "}
                                    {l.duration_secs && ` · ${formatLessonDuration(l.duration_secs)}`}
                                  </div>
                                </div>
                                {l.is_premium && (
                                  <span style={{ fontSize: 12 }} title="Premium">👑</span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const breadLink: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 8, padding: "5px 10px",
  color: "#fff", fontSize: 11, fontWeight: 700,
  textDecoration: "none",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: F.title, fontSize: 12, fontWeight: 700,
  color: T.gold, textTransform: "uppercase",
  letterSpacing: "0.08em", margin: "0 0 12px",
};
