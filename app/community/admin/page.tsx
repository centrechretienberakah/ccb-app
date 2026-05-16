import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminModerationClient from "./AdminModerationClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modération — Communauté CCB" };

interface ReportRow {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  user_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
}

interface PostLite {
  id: string; content: string; user_id: string; post_kind: string | null; created_at: string;
}

interface CommentLite {
  id: string; content: string; post_id: string; user_id: string;
}

interface ProfileLite {
  user_id: string; display_name: string | null; avatar_url: string | null;
}

export default async function CommunityAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/admin");

  // Vérifie le rôle modérateur
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const allowed = ["owner", "admin", "leader", "moderator"];
  if (!roleRow || !allowed.includes(roleRow.role as string)) {
    redirect("/community");
  }

  // Tous les signalements (pending en premier)
  const { data: reportsData } = await supabase
    .from("post_reports")
    .select("id, post_id, comment_id, user_id, reason, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  const reports = (reportsData ?? []) as ReportRow[];

  // Posts et commentaires concernés
  const postIds = reports.map((r) => r.post_id).filter(Boolean) as string[];
  const commentIds = reports.map((r) => r.comment_id).filter(Boolean) as string[];
  const reporterIds = reports.map((r) => r.user_id);

  const [{ data: postsData }, { data: commentsData }] = await Promise.all([
    postIds.length > 0
      ? supabase.from("posts").select("id, content, user_id, post_kind, created_at").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length > 0
      ? supabase.from("post_comments").select("id, content, post_id, user_id").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const posts = (postsData as PostLite[] | null) ?? [];
  const comments = (commentsData as CommentLite[] | null) ?? [];

  // Profils (auteurs posts/comments + reporters)
  const authorIds = [...new Set([
    ...posts.map((p) => p.user_id),
    ...comments.map((c) => c.user_id),
    ...reporterIds,
  ])];
  let profiles: ProfileLite[] = [];
  if (authorIds.length > 0) {
    const { data: pf } = await supabase
      .from("user_profiles").select("user_id, display_name, avatar_url")
      .in("user_id", authorIds);
    profiles = (pf as ProfileLite[] | null) ?? [];
  }

  return (
    <AdminModerationClient
      reports={reports}
      posts={posts}
      comments={comments}
      profiles={profiles}
      currentUserId={user.id}
    />
  );
}
