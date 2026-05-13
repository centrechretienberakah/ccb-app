import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GroupesClient from "./GroupesClient";

export const metadata: Metadata = { title: "Groupes — CCB" };

export default async function GroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, type, member_count, is_private, cover_url, created_at")
    .order("member_count", { ascending: false });

  let myGroupIds: string[] = [];
  if (user) {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    myGroupIds = (memberships ?? []).map(m => m.group_id);
  }

  return <GroupesClient groups={groups ?? []} myGroupIds={myGroupIds} userId={user?.id ?? null} />;
}
