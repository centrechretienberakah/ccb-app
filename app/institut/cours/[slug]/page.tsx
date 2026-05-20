import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CourseClient from "./CourseClient";
import type { Course, Module, Lesson, Category } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("institut_courses").select("title").eq("slug", slug).maybeSingle();
  return { title: data ? `${(data as { title: string }).title} — Institut Berakah` : "Formation" };
}

interface LessonLite extends Lesson {
  is_completed: boolean;
  watched_secs: number;
}

interface ModuleWithLessons extends Module {
  lessons: LessonLite[];
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/institut/cours/${slug}`);

  const { data: courseData } = await supabase
    .from("institut_courses")
    .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
    .eq("slug", slug).eq("is_published", true)
    .maybeSingle();
  if (!courseData) return notFound();
  const course = courseData as Course;

  // Catégorie pour breadcrumb
  const { data: catRow } = await supabase
    .from("institut_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("id", course.category_id).maybeSingle();
  const category = (catRow ?? null) as Category | null;

  // Modules + Lessons + Progress
  const { data: modData } = await supabase
    .from("institut_modules")
    .select("id, course_id, slug, title, description, order_index")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  const modules = (modData ?? []) as Module[];

  const { data: lessonData } = await supabase
    .from("institut_lessons")
    .select("id, module_id, course_id, slug, title, description, content_md, video_url, audio_url, pdf_url, duration_secs, order_index, is_premium")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  const lessons = (lessonData ?? []) as Lesson[];

  const { data: progData } = await supabase
    .from("institut_user_progress")
    .select("lesson_id, is_completed, watched_secs")
    .eq("user_id", user.id)
    .eq("course_id", course.id);
  const progMap: Record<string, { is_completed: boolean; watched_secs: number }> = {};
  for (const p of (progData ?? []) as Array<{ lesson_id: string; is_completed: boolean; watched_secs: number }>) {
    progMap[p.lesson_id] = { is_completed: p.is_completed, watched_secs: p.watched_secs };
  }

  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    ...m,
    lessons: lessons
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        ...l,
        is_completed: progMap[l.id]?.is_completed ?? false,
        watched_secs: progMap[l.id]?.watched_secs ?? 0,
      })),
  }));

  const totalLessons = lessons.length;
  const completedLessons = Object.values(progMap).filter((p) => p.is_completed).length;

  // Favori ?
  let isFavorite = false;
  try {
    const { data: fav } = await supabase
      .from("institut_user_favorites")
      .select("id")
      .eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
    isFavorite = !!fav;
  } catch { /* table v25 may not exist */ }

  return (
    <CourseClient
      course={course}
      category={category}
      modules={modulesWithLessons}
      totalLessons={totalLessons}
      completedLessons={completedLessons}
      isFavorite={isFavorite}
    />
  );
}
