import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminPrayerClient from "./AdminPrayerClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modération Prions ensemble — CCB" };

interface ReportRow {
  id: string;
  prayer_id: string | null;
  comment_id: string | null;
  user_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
}

interface PrayerLite {
  id: string;
  content: string;
  title: string | null;
  user_id: string;
  category: string | null;
  created_at: string;
}

interface CommentLite {
  id: string;
  content: string;
  prayer_id: string;
  user_id: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function PrayerAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/prayer/admin");

  // Vérifie rôle modérateur+
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes(roleRow.role as string)) {
    redirect("/prayer");
  }

  const { data: reportsData } = await supabase
    .from("prayer_reports")
    .select("id, prayer_id, comment_id, user_id, reason, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  const reports = (reportsData ?? []) as ReportRow[];

  const prayerIds = reports.map((r) => r.prayer_id).filter(Boolean) as string[];
  const commentIds = reports.map((r) => r.comment_id).filter(Boolean) as string[];
  const reporterIds = reports.map((r) => r.user_id);

  const [{ data: prayers }, { data: comments }] = await Promise.all([
    prayerIds.length > 0
      ? supabase.from("prayer_requests").select("id, content, title, user_id, category, created_at").in("id", prayerIds)
      : Promise.resolve({ data: [] }),
    commentIds.length > 0
      ? supabase.from("prayer_comments").select("id, content, prayer_id, user_id").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const prayersTyped = (prayers as PrayerLite[] | null) ?? [];
  const commentsTyped = (comments as CommentLite[] | null) ?? [];

  const authorIds = [...new Set([
    ...prayersTyped.map((p) => p.user_id),
    ...commentsTyped.map((c) => c.user_id),
    ...reporterIds,
  ])];
  let profiles: Profile[] = [];
  if (authorIds.length > 0) {
    const { data: pf } = await supabase
      .from("user_profiles").select("user_id, display_name, avatar_url")
      .in("user_id", authorIds);
    profiles = (pf as Profile[] | null) ?? [];
  }

  return (
    <AdminPrayerClient
      reports={reports}
      prayers={prayersTyped}
      comments={commentsTyped}
      profiles={profiles}
    />
  );
}
