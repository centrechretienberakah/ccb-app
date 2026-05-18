import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MeetingClient from "./MeetingClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `Réunion : ${(data as { name: string }).name} — CCB` : "Réunion" };
}

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}/meeting`);

  // Vérifie que le groupe existe et que l'utilisateur peut y accéder
  const { data: groupData } = await supabase
    .from("groups")
    .select("id, name, type, description")
    .eq("id", id)
    .maybeSingle();
  if (!groupData) return notFound();
  const group = groupData as { id: string; name: string; type: "public" | "private"; description: string | null };

  // Vérifie membership pour les groupes privés
  if (group.type === "private") {
    const { data: gm } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", id).eq("user_id", user.id).maybeSingle();
    if (!gm) redirect(`/community/groups/${id}`);
  }

  // Profil utilisateur pour pré-remplir le pseudo
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <MeetingClient
      group={group}
      displayName={(profile as { display_name: string | null } | null)?.display_name || "Membre CCB"}
      avatarUrl={(profile as { avatar_url: string | null } | null)?.avatar_url || ""}
      userEmail={user.email || ""}
    />
  );
}
