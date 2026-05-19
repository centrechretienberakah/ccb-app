import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminInstitutClient from "./AdminInstitutClient";
import type { Category, Subcategory, Course, Module, Lesson } from "@/lib/institut/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Institut Berakah" };

export default async function InstitutAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/institut/admin");

  // Vérifie rôle modérateur+
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes(roleRow.role as string)) {
    redirect("/institut");
  }

  // Fetch toute la hiérarchie en parallèle
  const [{ data: cats }, { data: subs }, { data: courses }, { data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("institut_categories")
      .select("id, slug, name, description, icon, cover_url, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabase.from("institut_subcategories")
      .select("id, category_id, slug, name, description, icon, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabase.from("institut_courses")
      .select("id, category_id, subcategory_id, slug, title, subtitle, description, thumbnail_url, trailer_url, level, duration_mins, instructor, is_published, is_premium, order_index")
      .order("order_index", { ascending: true }),
    supabase.from("institut_modules")
      .select("id, course_id, slug, title, description, order_index")
      .order("order_index", { ascending: true }),
    supabase.from("institut_lessons")
      .select("id, module_id, course_id, slug, title, description, content_md, video_url, audio_url, pdf_url, duration_secs, order_index, is_premium")
      .order("order_index", { ascending: true }),
  ]);

  return (
    <AdminInstitutClient
      currentUserId={user.id}
      categories={(cats ?? []) as Category[]}
      subcategories={(subs ?? []) as Subcategory[]}
      courses={(courses ?? []) as Course[]}
      modules={(modules ?? []) as Module[]}
      lessons={(lessons ?? []) as Lesson[]}
    />
  );
}
