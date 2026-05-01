import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CommunityClient from "./CommunityClient";

export const metadata = { title: "Communauté — CCB" };

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community");

  let members: any[] = [];

  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url, bio, cell_group, testimony")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    members = data || [];
  } catch {
    // Table may not exist yet
  }

  return <CommunityClient members={members} currentUserId={user.id} />;
}
