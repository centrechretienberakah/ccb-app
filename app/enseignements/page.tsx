import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EnseignementsClient, { Sermon } from "./EnseignementsClient";

export const metadata: Metadata = { title: "Enseignements — CCB" };

export default async function EnseignementsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: sermons } = await supabase
    .from("sermons")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  let isPremiumUser = false;
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_premium")
      .eq("user_id", user.id)
      .single();
    isPremiumUser = profile?.is_premium ?? false;

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    isAdmin = role?.role === "admin" || role?.role === "leader";
  }

  return (
    <EnseignementsClient
      sermons={(sermons ?? []) as Sermon[]}
      isPremiumUser={isPremiumUser}
      isAdmin={isAdmin}
    />
  );
}
