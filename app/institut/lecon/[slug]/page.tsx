import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import LessonClient from "./LessonClient";
import type { Lesson, Course, Module, Category } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("institut_lessons").select("title").eq("slug", slug).maybeSingle();
  return { title: data ? `${(data as { title: string }).title} — Institut Biblique Berakah` : "Leçon" };
}

interface LessonNavLite {
  id: string;
  slug: string;
  title: string;
  module_id: string;
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/institut/lecon/${slug}`);

  const { data: lessonData } = await supabase
    .from("institut_lessons")
    .select("id, module_id, course_id, slug, title, description, content_md, video_url, audio_url, pdf_url, duration_secs, order_index, is_premium, quiz_questions")
    .eq("slug", slug).maybeSingle();
  if (!lessonData) return notFound();
  const lesson = lessonData as Lesson;

  // Course context
  const { data: courseRow } = await supabase
    .from("institut_courses")
    .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
    .eq("id", lesson.course_id).maybeSingle();
  if (!courseRow) return notFound();
  const course = courseRow as Course;

  // Module
  const { data: moduleRow } = await supabase
    .from("institut_modules")
    .select("id, course_id, slug, title, description, order_index")
    .eq("id", lesson.module_id).maybeSingle();
  const lessonModule = (moduleRow ?? null) as Module | null;

  // Category
  const { data: catRow } = await supabase
    .from("institut_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("id", course.category_id).maybeSingle();
  const category = (catRow ?? null) as Category | null;

  // Toutes les leçons du cours pour navigation prev/next
  const { data: allLessonsData } = await supabase
    .from("institut_lessons")
    .select("id, slug, title, module_id")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  const allLessons = (allLessonsData ?? []) as LessonNavLite[];
  const idx = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = idx > 0 ? allLessons[idx - 1] : null;
  const nextLesson = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  // Progression actuelle + quiz
  const { data: progRow } = await supabase
    .from("institut_user_progress")
    .select("is_completed, watched_secs, quiz_score, quiz_max, quiz_completed_at")
    .eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle();
  const progress = (progRow ?? null) as {
    is_completed: boolean; watched_secs: number;
    quiz_score: number | null; quiz_max: number | null; quiz_completed_at: string | null;
  } | null;

  // Premium gate : si lesson ou cours est premium, vérifier le rôle de l'utilisateur
  // Les rôles staff (owner/admin/leader/moderator) bypassent le premium
  // Les autres : nécessite un is_premium sur user_profiles (à implémenter plus tard)
  const isPremiumContent = !!(lesson.is_premium || course.is_premium);
  let canAccessPremium = !isPremiumContent;
  if (isPremiumContent) {
    try {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) {
        canAccessPremium = true;
      } else {
        // Vérifie aussi user_profiles.is_premium si la colonne existe
        try {
          const { data: profRow } = await supabase
            .from("user_profiles").select("is_premium").eq("user_id", user.id).maybeSingle();
          if ((profRow as { is_premium: boolean } | null)?.is_premium) canAccessPremium = true;
        } catch { /* colonne is_premium pas dispo */ }
      }
    } catch { /* noop */ }
  }

  return (
    <LessonClient
      lesson={lesson}
      course={course}
      module={lessonModule}
      category={category}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      isCompleted={progress?.is_completed ?? false}
      quizScore={progress?.quiz_score ?? null}
      quizMax={progress?.quiz_max ?? null}
      lessonIndex={idx + 1}
      totalLessons={allLessons.length}
      canAccessPremium={canAccessPremium}
    />
  );
}
