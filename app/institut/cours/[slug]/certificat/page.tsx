import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CertificatClient from "./CertificatClient";
import type { Course, Category } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("institut_courses").select("title").eq("slug", slug).maybeSingle();
  return { title: data ? `Certificat — ${(data as { title: string }).title}` : "Certificat" };
}

export default async function CertificatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/institut/cours/${slug}/certificat`);

  const { data: courseData } = await supabase
    .from("institut_courses")
    .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
    .eq("slug", slug).maybeSingle();
  if (!courseData) return notFound();
  const course = courseData as Course;

  // Vérifie que 100% complété
  const { count: totalLessons } = await supabase
    .from("institut_lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course.id);
  const { count: completedLessons } = await supabase
    .from("institut_user_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("is_completed", true);

  const totalCount = totalLessons ?? 0;
  const completedCount = completedLessons ?? 0;
  const isFullyComplete = totalCount > 0 && completedCount >= totalCount;

  if (!isFullyComplete) {
    // Rediriger si pas terminé
    redirect(`/institut/cours/${slug}`);
  }

  // Profil pour le nom
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, full_name")
    .eq("user_id", user.id).maybeSingle();
  const studentName = ((profile as { display_name: string | null; full_name: string | null } | null)?.display_name)
    || ((profile as { display_name: string | null; full_name: string | null } | null)?.full_name)
    || (user.email?.split("@")[0] ?? "Disciple CCB");

  // Faculté
  const { data: catRow } = await supabase
    .from("institut_categories")
    .select("id, slug, name, description, icon, cover_url, order_index, is_published")
    .eq("id", course.category_id).maybeSingle();
  const category = (catRow ?? null) as Category | null;

  // Date la plus récente complétée
  const { data: lastProg } = await supabase
    .from("institut_user_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false })
    .limit(1).maybeSingle();
  const completedDate = (lastProg as { completed_at: string } | null)?.completed_at ?? new Date().toISOString();

  return (
    <CertificatClient
      course={course}
      category={category}
      studentName={studentName}
      completedAt={completedDate}
      totalLessons={totalCount}
    />
  );
}
