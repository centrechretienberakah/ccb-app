import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityClient from "./CommunityClient";

export const metadata = { title: "Communauté — CCB" };

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community");

  let members: any[] = [];
  let memberMilestones: Record<string, string[]> = {};
  let isAdmin = false;

  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, testimony")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    members = data || [];

    // Charger tous les jalons spirituels (admins ont accès en lecture)
    const { data: milestones } = await supabase
      .from("spiritual_milestones")
      .select("user_id, milestone");
    for (const m of milestones || []) {
      if (!memberMilestones[m.user_id]) memberMilestones[m.user_id] = [];
      memberMilestones[m.user_id].push(m.milestone);
    }

    // Vérifier rôle admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    isAdmin = roleData?.role === "admin";
  } catch {
    // Tables may not exist yet
  }

  return (
    <CommunityClient
      members={members}
      currentUserId={user.id}
      isAdmin={isAdmin}
      memberMilestones={memberMilestones}
    />
  );
}
