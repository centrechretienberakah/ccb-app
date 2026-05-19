"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  getEmbedUrl,
  type Lesson, type Course, type Module, type Category,
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
  lessonIndex: number;
  totalLessons: number;
}

export default function LessonClient({
  lesson, course, module, category, prevLesson, nextLesson,
  isCompleted: initialCompleted, lessonIndex, totalLessons,
}: Props) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  const video = lesson.video_url ? getEmbedUrl(lesson.video_url) : null;

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

        {/* Vidéo */}
        {video && (
          <div style={{
            marginBottom: 16, borderRadius: 14, overflow: "hidden",
            aspectRatio: "16/9", background: "#000",
            boxShadow: T.shadowSoft,
          }}>
            {video.provider === "youtube" || video.provider === "vimeo" ? (
              <iframe src={video.src} width="100%" height="100%"
                style={{ border: 0, display: "block" }} allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            ) : (
              <video src={video.src} controls style={{ width: "100%", height: "100%" }} />
            )}
          </div>
        )}

        {/* Audio standalone */}
        {!video && lesson.audio_url && (
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
        {lesson.description && (
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
        {lesson.content_md && (
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
        {(lesson.pdf_url || (video && lesson.audio_url)) && (
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
        {!video && !lesson.audio_url && !lesson.content_md && !lesson.description && !lesson.pdf_url && (
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

        {/* Action principale */}
        <div style={{
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
        </div>

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
