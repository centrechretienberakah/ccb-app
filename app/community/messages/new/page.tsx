import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewGroupClient from "./NewGroupClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouveau groupe — Messages CCB" };

export interface MemberPick {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function NewGroupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/messages/new");

  let members: MemberPick[] = [];
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("display_name", { ascending: true })
      .limit(500);
    members = (data ?? []) as MemberPick[];
  } catch { /* noop */ }

  return <NewGroupClient members={members} />;
}
