import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";
import type { Category, Subcategory, Course } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("institut_categories")
    .select("name")
    .eq("slug", slug).maybeSingle();
  return { title: data ? `${(data as { name: string }).name} — Institut Berakah` : "Catégorie" };
}

interface CourseLite extends Course {
  total_lessons: number;
  completed_lessons: number;
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/institut/categorie/${slug}`);

  const { data: catData } = await supabase
    .from("institut_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("slug", slug).eq("is_published", true)
    .maybeSingle();
  if (!catData) return notFound();
  const category = catData as Category;

  // Sous-catégories
  const { data: subData } = await supabase
    .from("institut_subcategories")
    .select("id, category_id, slug, name, description, icon, order_index, is_published")
    .eq("category_id", category.id)
    .eq("is_published", true)
    .order("order_index", { ascending: true });
  const subcategories = (subData ?? []) as Subcategory[];

  // Cours de la catégorie (publiés)
  const { data: courseData } = await supabase
    .from("institut_courses")
    .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
    .eq("category_id", category.id)
    .eq("is_published", true)
    .order("order_index", { ascending: true });
  const courseRows = (courseData ?? []) as Course[];

  // Stats
  const courseIds = courseRows.map((c) => c.id);
  const lessonCountByCourse: Record<string, number> = {};
  const completedByCourse: Record<string, number> = {};

  if (courseIds.length > 0) {
    const { data: lessons } = await supabase
      .from("institut_lessons")
      .select("id, course_id")
      .in("course_id", courseIds);
    const allLessonIds: string[] = [];
    for (const l of (lessons ?? []) as Array<{ id: string; course_id: string }>) {
      lessonCountByCourse[l.course_id] = (lessonCountByCourse[l.course_id] || 0) + 1;
      allLessonIds.push(l.id);
    }
    if (allLessonIds.length > 0) {
      const { data: prog } = await supabase
        .from("institut_user_progress")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .in("lesson_id", allLessonIds);
      for (const p of (prog ?? []) as Array<{ course_id: string }>) {
        completedByCourse[p.course_id] = (completedByCourse[p.course_id] || 0) + 1;
      }
    }
  }

  const courses: CourseLite[] = courseRows.map((c) => ({
    ...c,
    total_lessons: lessonCountByCourse[c.id] ?? 0,
    completed_lessons: completedByCourse[c.id] ?? 0,
  }));

  return <CategoryClient category={category} subcategories={subcategories} courses={courses} />;
}
