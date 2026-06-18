"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  getEmbedUrl,
  type Lesson, type Course, type Module, type Category, type QuizQuestion,
} from "@/lib/institut/theme";

interface LessonNav { id: string; slug: string; title: string }

interface Props {
  lesson: Lesson;
  course: Course;
  module: Module | null;
  category: Category | null;
  prevLesson: LessonNav | null;
  nextLesson: LessonNav | null;
  isCompleted: boolean;
  quizScore?: number | null;
  quizMax?: number | null;
  lessonIndex: number;
  totalLessons: number;
  canAccessPremium?: boolean;
}

export default function LessonClient({
  lesson, course, module, category, prevLesson, nextLesson,
  isCompleted: initialCompleted, quizScore: initialQuizScore = null, quizMax: initialQuizMax = null,
  lessonIndex, totalLessons, canAccessPremium = true,
}: Props) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  const video = lesson.video_url ? getEmbedUrl(lesson.video_url) : null;
  const isPremiumLocked = !canAccessPremium && (lesson.is_premium || course.is_premium);
  const hasQuiz = Array.isArray(lesson.quiz_questions) && lesson.quiz_questions.length > 0;

  async function toggleCompleted() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (isCompleted) {
      // Marquer non complétée
      await supabase.from("institut_user_progress")
        .update({ is_completed: false, completed_at: null, last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id).eq("lesson_id", lesson.id);
      setIsCompleted(false);
    } else {
      // Marquer complétée (upsert)
      const now = new Date().toISOString();
      await supabase.from("institut_user_progress").upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        is_completed: true,
        completed_at: now,
        last_seen_at: now,
      }, { onConflict: "user_id,lesson_id" });
      setIsCompleted(true);
    }
    setSaving(false);
  }

  async function markAndNext() {
    if (!isCompleted) await toggleCompleted();
    if (nextLesson) router.push(`/institut/lecon/${nextLesson.slug}`);
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 80 }}>
      <style>{`
        .lesson-layout { max-width: 980px; margin: 0 auto; padding: 14px 14px 40px; }
      `}</style>

      {/* Hero compact */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "16px 18px 14px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowSoft,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", fontSize: 10 }}>
            <Link href="/institut" style={breadLink}>Institut</Link>
            {category && (
              <Link href={`/institut/categorie/${category.slug}`} style={breadLink}>
                {category.name}
              </Link>
            )}
            <Link href={`/institut/cours/${course.slug}`} style={breadLink}>
              {course.title}
            </Link>
          </div>

          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
            fontWeight: 700, margin: "0 0 4px", letterSpacing: "0.02em",
            lineHeight: 1.3,
          }}>
            {lesson.title}
          </h1>
          <div style={{ fontSize: 11, opacity: 0.85, fontStyle: "italic" }}>
            {module && <span>📚 {module.title}</span>}
            {module && <span style={{ margin: "0 6px" }}>·</span>}
            <span>Leçon {lessonIndex} / {totalLessons}</span>
          </div>
        </div>
      </div>

      <div className="lesson-layout">

        {/* Premium gate */}
        {isPremiumLocked && (
          <div style={{
            background: T.card, border: `2px solid ${T.gold}`,
            borderRadius: 16, padding: "40px 24px", textAlign: "center",
            marginBottom: 16, boxShadow: T.shadowMd,
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>👑</div>
            <h2 style={{
              fontFamily: F.title, fontSize: 22, fontWeight: 700,
              color: T.violet, margin: "0 0 8px",
            }}>
              Contenu Premium
            </h2>
            <p style={{
              fontSize: 14, color: T.textSoft, lineHeight: 1.6,
              maxWidth: 480, margin: "0 auto 22px",
            }}>
              Cette leçon fait partie d&apos;une formation Premium réservée aux membres
              {course.is_premium ? " du programme complet" : " du contenu avancé"}.
              Rejoins le programme pour débloquer toutes les leçons.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/premium" style={{
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                color: "#111", padding: "11px 24px", borderRadius: 999,
                fontWeight: 700, fontSize: 13, fontFamily: F.body,
                textDecoration: "none",
                boxShadow: "0 4px 18px rgba(212,175,55,0.4)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                👑 Devenir Premium
              </Link>
              <Link href={`/institut/cours/${course.slug}`} style={{
                background: T.bg, color: T.violet,
                border: `1px solid ${T.violet}`,
                padding: "11px 22px", borderRadius: 999,
                fontWeight: 700, fontSize: 13, fontFamily: F.body,
                textDecoration: "none",
              }}>
                ← Retour au cours
              </Link>
            </div>
          </div>
        )}

        {/* Vidéo — responsive (plein-bord mobile, centrée + plafonnée desktop/tablette) */}
        {!isPremiumLocked && video && (
          <div className="ibb-video ibb-video--bleed">
            {video.provider === "youtube" || video.provider === "vimeo" ? (
              <iframe src={video.src} title={lesson.title} loading="lazy" allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            ) : (
              <video src={video.src} controls playsInline />
            )}
          </div>
        )}

        {/* Audio standalone */}
        {!isPremiumLocked && !video && lesson.audio_url && (
          <div style={{
            marginBottom: 16, padding: 14,
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, boxShadow: T.shadowSoft,
          }}>
            <div style={{
              fontFamily: F.title, fontSize: 13, fontWeight: 700,
              color: T.violet, marginBottom: 8,
            }}>
              🎵 Écouter
            </div>
            <audio src={lesson.audio_url} controls style={{ width: "100%" }} />
          </div>
        )}

        {/* Description courte */}
        {!isPremiumLocked && lesson.description && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: 16, marginBottom: 16,
            boxShadow: T.shadowSoft,
          }}>
            <p style={{
              margin: 0, fontSize: 14, color: T.textSoft,
              lineHeight: 1.7, whiteSpace: "pre-wrap",
            }}>
              {lesson.description}
            </p>
          </div>
        )}

        {/* Contenu markdown */}
        {!isPremiumLocked && lesson.content_md && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "18px 22px", marginBottom: 16,
            boxShadow: T.shadowSoft,
          }}>
            <h2 style={sectionTitle}>📖 Contenu de la leçon</h2>
            <div style={{
              fontSize: 14, color: T.textSoft, lineHeight: 1.75,
              whiteSpace: "pre-wrap", fontFamily: F.body,
            }}>
              {lesson.content_md}
            </div>
          </div>
        )}

        {/* PDF + Audio compagnon */}
        {!isPremiumLocked && (lesson.pdf_url || (video && lesson.audio_url)) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {lesson.pdf_url && (
              <a href={lesson.pdf_url} target="_blank" rel="noopener"
                style={resourceCard}>
                <span style={{ fontSize: 28 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                    Support PDF de la leçon
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>
                    Clique pour ouvrir / télécharger
                  </div>
                </div>
                <span style={{ color: T.violet, fontSize: 16 }}>↗</span>
              </a>
            )}
            {video && lesson.audio_url && (
              <div style={resourceCard}>
                <span style={{ fontSize: 28 }}>🎵</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                    Audio
                  </div>
                  <audio src={lesson.audio_url} controls style={{ width: "100%", marginTop: 4 }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aucune ressource */}
        {!isPremiumLocked && !video && !lesson.audio_url && !lesson.content_md && !lesson.description && !lesson.pdf_url && (
          <div style={{
            background: T.card, border: `1px dashed ${T.border}`,
            borderRadius: 14, padding: 40, textAlign: "center", marginBottom: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ color: T.textMuted, fontSize: 13 }}>
              Cette leçon n&apos;a pas encore de contenu publié.
            </div>
          </div>
        )}

        {/* Quiz */}
        {!isPremiumLocked && hasQuiz && (
          <QuizBlock
            lessonId={lesson.id}
            courseId={lesson.course_id}
            questions={lesson.quiz_questions as QuizQuestion[]}
            initialScore={initialQuizScore}
            initialMax={initialQuizMax}
          />
        )}

        {/* Action principale */}
        {!isPremiumLocked && <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 16, marginBottom: 16,
          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
          boxShadow: T.shadowSoft,
        }}>
          <button onClick={toggleCompleted} disabled={saving} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isCompleted ? T.completed : T.violetSoft,
            border: `1px solid ${isCompleted ? T.completed : T.violet}`,
            color: isCompleted ? "#fff" : T.violet,
            borderRadius: 999, padding: "10px 18px",
            fontWeight: 700, fontSize: 13,
            cursor: saving ? "wait" : "pointer", fontFamily: F.body,
            opacity: saving ? 0.7 : 1,
          }}>
            {isCompleted ? "✓ Leçon terminée" : "○ Marquer comme terminée"}
          </button>

          {nextLesson && (
            <button onClick={markAndNext} disabled={saving} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: "#111", border: "none",
              borderRadius: 999, padding: "10px 20px",
              fontWeight: 700, fontSize: 13,
              cursor: saving ? "wait" : "pointer", fontFamily: F.body,
              marginLeft: "auto",
              boxShadow: "0 2px 12px rgba(212,175,55,0.35)",
            }}>
              Leçon suivante →
            </button>
          )}
        </div>}

        {/* Nav prev/next */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {prevLesson ? (
            <Link href={`/institut/lecon/${prevLesson.slug}`} style={{
              ...navCard, textAlign: "left",
            }}>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ← Leçon précédente
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 4, lineHeight: 1.35 }}>
                {prevLesson.title}
              </div>
            </Link>
          ) : <div />}
          {nextLesson ? (
            <Link href={`/institut/lecon/${nextLesson.slug}`} style={{
              ...navCard, textAlign: "right",
            }}>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Leçon suivante →
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 4, lineHeight: 1.35 }}>
                {nextLesson.title}
              </div>
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

// ─── QuizBlock ────────────────────────────────────────────────────────
function QuizBlock({ lessonId, courseId, questions, initialScore, initialMax }: {
  lessonId: string;
  courseId: string;
  questions: QuizQuestion[];
  initialScore: number | null;
  initialMax: number | null;
}) {
  // answers[questionIdx] = selectedOptionIdx (number) ou null
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(initialScore !== null && initialMax !== null);
  const [score, setScore] = useState<number | null>(initialScore);
  const [busy, setBusy] = useState(false);

  function selectOption(qIdx: number, oIdx: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => i === qIdx ? oIdx : a));
  }

  async function submitQuiz() {
    if (busy || submitted) return;
    // Vérifie que toutes les questions sont répondues
    if (answers.some((a) => a === null)) {
      alert("Réponds à toutes les questions avant de soumettre.");
      return;
    }
    setBusy(true);
    let correct = 0;
    questions.forEach((q, i) => {
      const selected = answers[i];
      if (selected !== null && q.options[selected]?.correct) correct += 1;
    });
    setScore(correct);
    setSubmitted(true);

    // Sauvegarde
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const now = new Date().toISOString();
        await supabase.from("institut_user_progress").upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          quiz_score: correct,
          quiz_max: questions.length,
          quiz_completed_at: now,
          last_seen_at: now,
        }, { onConflict: "user_id,lesson_id" });
      }
    } catch { /* noop */ }
    setBusy(false);
  }

  function resetQuiz() {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
    setScore(null);
  }

  const maxScore = questions.length;
  const successRate = score !== null ? Math.round((score / maxScore) * 100) : 0;
  const isPassing = successRate >= 70;

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 18, marginBottom: 16,
      boxShadow: T.shadowSoft,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{
          fontFamily: F.title, fontSize: 16, fontWeight: 700,
          color: T.violet, margin: 0, letterSpacing: 0.04,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🧠 Quiz de la leçon
        </h2>
        {submitted && score !== null && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isPassing ? "rgba(46,155,71,0.1)" : T.surface2,
            border: `1px solid ${isPassing ? T.completed : T.border}`,
            color: isPassing ? T.completed : T.textSoft,
            borderRadius: 999, padding: "5px 12px",
            fontSize: 12, fontWeight: 700,
          }}>
            {isPassing ? "✓" : "○"} {score}/{maxScore} · {successRate}%
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, qIdx) => {
          const selected = answers[qIdx];
          return (
            <div key={qIdx}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: T.text,
                marginBottom: 8, fontFamily: F.body,
              }}>
                Q{qIdx + 1}. {q.q}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {q.options.map((opt, oIdx) => {
                  const isSelected = selected === oIdx;
                  let bg: string = T.bg;
                  let border: string = T.border;
                  let color: string = T.textSoft;
                  if (submitted) {
                    if (opt.correct) {
                      bg = "rgba(46,155,71,0.1)";
                      border = T.completed;
                      color = T.completed;
                    } else if (isSelected) {
                      bg = "rgba(194,75,122,0.1)";
                      border = "#C24B7A";
                      color = "#C24B7A";
                    }
                  } else if (isSelected) {
                    bg = T.violetSoft;
                    border = T.violet;
                    color = T.violet;
                  }
                  return (
                    <button key={oIdx} onClick={() => selectOption(qIdx, oIdx)} disabled={submitted}
                      style={{
                        textAlign: "left", padding: "10px 14px",
                        background: bg, border: `1.5px solid ${border}`,
                        color, fontSize: 13, fontWeight: isSelected || (submitted && opt.correct) ? 700 : 500,
                        borderRadius: 10,
                        cursor: submitted ? "default" : "pointer",
                        fontFamily: F.body, display: "flex", alignItems: "center", gap: 8,
                      }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${border}`,
                        background: isSelected ? border : "transparent",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {submitted && opt.correct ? (
                          <span style={{ color: "#fff", fontSize: 10 }}>✓</span>
                        ) : submitted && isSelected && !opt.correct ? (
                          <span style={{ color: "#fff", fontSize: 10 }}>✕</span>
                        ) : null}
                      </span>
                      <span style={{ flex: 1 }}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: "flex", gap: 8, justifyContent: "flex-end",
        marginTop: 16, flexWrap: "wrap",
      }}>
        {submitted ? (
          <>
            <div style={{
              flex: 1, padding: "6px 0", fontSize: 12,
              color: isPassing ? T.completed : T.textMuted,
              fontWeight: 600, fontStyle: isPassing ? "normal" : "italic",
            }}>
              {isPassing ? "🎉 Bravo, tu as validé le quiz !" : "Tu peux réessayer pour améliorer ton score."}
            </div>
            <button onClick={resetQuiz} style={{
              background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "9px 18px",
              color: T.textMuted, cursor: "pointer", fontSize: 12,
              fontFamily: F.body,
            }}>
              ↻ Recommencer
            </button>
          </>
        ) : (
          <button onClick={submitQuiz} disabled={busy} style={{
            background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
            border: "none", borderRadius: 10, padding: "10px 22px",
            color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: busy ? "wait" : "pointer", fontFamily: F.body,
          }}>
            {busy ? "Calcul…" : "✓ Soumettre mes réponses"}
          </button>
        )}
      </div>
    </div>
  );
}

const breadLink: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 6, padding: "3px 8px",
  color: "#fff", fontSize: 10, fontWeight: 600,
  textDecoration: "none",
};
const sectionTitle: React.CSSProperties = {
  fontFamily: F.title, fontSize: 12, fontWeight: 700,
  color: T.violet, textTransform: "uppercase",
  letterSpacing: "0.08em", margin: "0 0 12px",
};
const resourceCard: React.CSSProperties = {
  display: "flex", gap: 12, alignItems: "center",
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, padding: 14,
  textDecoration: "none", color: T.text,
  boxShadow: T.shadowSoft,
};
const navCard: React.CSSProperties = {
  background: T.card, border: `1px solid ${T.border}`,
  borderRadius: 12, padding: "10px 14px",
  textDecoration: "none", color: T.text,
  boxShadow: T.shadowSoft,
};
