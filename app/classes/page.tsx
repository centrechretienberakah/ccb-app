import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ClassesClient from "./ClassesClient";

export const metadata: Metadata = { title: "Classes Bibliques — CCB" };

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, level, category, thumbnail_url, lesson_count, duration_hours, is_premium, is_published, instructor_name, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  let isPremium = false;
  if (user) {
    const { data: p } = await supabase.from("user_profiles").select("is_premium").eq("user_id", user.id).single();
    isPremium = p?.is_premium ?? false;
  }

  return <ClassesClient courses={courses ?? []} isPremium={isPremium} userId={user?.id ?? null} />;
}
