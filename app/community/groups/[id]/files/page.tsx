import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import GroupFilesClient from "./GroupFilesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `Fichiers : ${(data as { name: string }).name} — CCB` : "Fichiers" };
}

export interface FileRow {
  message_id: string;
  user_id: string;
  url: string;
  type: "image" | "pdf" | "audio" | "video" | "other" | null;
  name: string | null;
  size: number | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function GroupFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}/files`);

  const { data: groupData } = await supabase
    .from("groups").select("id, name, type").eq("id", id).maybeSingle();
  if (!groupData) return notFound();
  const group = groupData as { id: string; name: string; type: "public" | "private" };

  // Vérifie membership pour les groupes privés
  if (group.type === "private") {
    const { data: gm } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", id).eq("user_id", user.id).maybeSingle();
    if (!gm) redirect(`/community/groups/${id}`);
  }

  // Fetch messages avec attachment (avec fallback si colonnes pas présentes)
  let files: FileRow[] = [];
  try {
    const { data: msg, error } = await supabase
      .from("group_messages")
      .select("id, user_id, attachment_url, attachment_type, attachment_name, attachment_size, created_at")
      .eq("group_id", id)
      .not("attachment_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const rows = ((msg ?? []) as Array<{
      id: string; user_id: string;
      attachment_url: string; attachment_type: FileRow["type"];
      attachment_name: string | null; attachment_size: number | null;
      created_at: string;
    }>);

    // Profils
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const profMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: pf } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      for (const p of (pf ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>) {
        profMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      }
    }

    files = rows.map((r) => ({
      message_id: r.id,
      user_id: r.user_id,
      url: r.attachment_url,
      type: r.attachment_type,
      name: r.attachment_name,
      size: r.attachment_size,
      created_at: r.created_at,
      display_name: profMap[r.user_id]?.display_name ?? null,
      avatar_url: profMap[r.user_id]?.avatar_url ?? null,
    }));
  } catch {
    // Colonnes pas encore présentes → liste vide
    files = [];
  }

  return <GroupFilesClient group={group} files={files} />;
}
