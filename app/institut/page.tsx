import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InstitutHomeClient from "./InstitutHomeClient";
import type { Category, Course } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Institut Berakah — CCB" };

interface CourseLite extends Course {
  category_slug: string;
  category_name: string;
  total_lessons: number;
  completed_lessons: number;
  last_seen_at: string | null;
  is_favorite: boolean;
}

export default async function InstitutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/institut");

  let categories: Category[] = [];
  let popularCourses: CourseLite[] = [];
  let myCourses: CourseLite[] = [];
  let continueWatching: CourseLite[] = [];
  let favorites: CourseLite[] = [];
  let isAdmin = false;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleRow?.role as string | undefined;
    isAdmin = !!role && ["owner", "admin", "leader", "moderator"].includes(role);
  } catch { /* noop */ }

  try {
    const { data: catData } = await supabase
      .from("institut_categories")
      .select("id, slug, name, description, icon, cover_url, order_index, is_published")
      .eq("is_published", true)
      .order("order_index", { ascending: true });
    categories = (catData ?? []) as Category[];

    const { data: courses } = await supabase
      .from("institut_courses")
      .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
      .eq("is_published", true)
      .order("order_index", { ascending: true });
    const courseRows = (courses ?? []) as Course[];

    const catBySlug: Record<string, { slug: string; name: string }> = {};
    for (const c of categories) catBySlug[c.id] = { slug: c.slug, name: c.name };

    const courseIds = courseRows.map((c) => c.id);
    const lessonCountByCourse: Record<string, number> = {};
    const completedByCourse: Record<string, number> = {};
    const lastSeenByCourse: Record<string, string> = {};

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
        const { data: progress } = await supabase
          .from("institut_user_progress")
          .select("course_id, is_completed, last_seen_at")
          .eq("user_id", user.id)
          .in("lesson_id", allLessonIds);
        for (const p of (progress ?? []) as Array<{ course_id: string; is_completed: boolean; last_seen_at: string }>) {
          if (p.is_completed) {
            completedByCourse[p.course_id] = (completedByCourse[p.course_id] || 0) + 1;
          }
          if (!lastSeenByCourse[p.course_id] || p.last_seen_at > lastSeenByCourse[p.course_id]) {
            lastSeenByCourse[p.course_id] = p.last_seen_at;
          }
        }
      }
    }

    // Favoris user
    const favoriteIds = new Set<string>();
    try {
      const { data: favs } = await supabase
        .from("institut_user_favorites")
        .select("course_id")
        .eq("user_id", user.id);
      for (const f of (favs ?? []) as Array<{ course_id: string }>) {
        favoriteIds.add(f.course_id);
      }
    } catch { /* table v25 may not exist yet */ }

    const enriched: CourseLite[] = courseRows.map((c) => {
      const cat = catBySlug[c.category_id] ?? { slug: "", name: "" };
      return {
        ...c,
        category_slug: cat.slug,
        category_name: cat.name,
        total_lessons: lessonCountByCourse[c.id] ?? 0,
        completed_lessons: completedByCourse[c.id] ?? 0,
        last_seen_at: lastSeenByCourse[c.id] ?? null,
        is_favorite: favoriteIds.has(c.id),
      };
    });

    popularCourses = enriched.slice(0, 12);
    myCourses = enriched.filter((c) => c.completed_lessons > 0 || c.last_seen_at);

    // Continue watching : cours commencés mais pas finis, triés par last_seen DESC
    continueWatching = enriched
      .filter((c) => c.last_seen_at && c.total_lessons > 0 && c.completed_lessons < c.total_lessons)
      .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))
      .slice(0, 6);

    // Favorites
    favorites = enriched.filter((c) => c.is_favorite).slice(0, 8);
  } catch (e) {
    console.error("Institut fetch error:", e);
  }

  return (
    <InstitutHomeClient
      categories={categories}
      popularCourses={popularCourses}
      myCourses={myCourses}
      continueWatching={continueWatching}
      favorites={favorites}
      isAdmin={isAdmin}
    />
  );
}
