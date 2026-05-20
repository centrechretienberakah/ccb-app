import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminJdtvClient from "./AdminJdtvClient";
import type { JdtvCategory, JdtvVideo } from "@/lib/jdtv/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Jesus Daily TV" };

export default async function JdtvAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/jesus-daily/admin");

  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes((roleRow as { role: string }).role)) {
    redirect("/jesus-daily");
  }

  const [{ data: cats }, { data: vids }] = await Promise.all([
    supabase.from("jdtv_categories")
      .select("id, slug, name, description, icon, cover_url, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabase.from("jdtv_videos")
      .select("id, category_id, slug, title, subtitle, description, thumbnail_url, hero_url, video_url, duration_secs, speaker, scripture, published_at, is_published, is_premium, is_live, is_featured, view_count, order_index, tags, intro_end_secs, outro_start_secs, next_video_id, chapters, transcript_md")
      .order("published_at", { ascending: false }),
  ]);

  return (
    <AdminJdtvClient
      currentUserId={user.id}
      categories={(cats ?? []) as JdtvCategory[]}
      videos={(vids ?? []) as JdtvVideo[]}
    />
  );
}
