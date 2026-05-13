import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TemoignagesClient from "./TemoignagesClient";

export const metadata: Metadata = { title: "Témoignages — CCB" };

export default async function TemoignagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Try to fetch from posts table with tag 'temoignage', or from a dedicated table
  const { data: temoignages } = await supabase
    .from("posts")
    .select("id, content, user_id, created_at, likes_count, category")
    .eq("category", "temoignage")
    .order("created_at", { ascending: false })
    .limit(30);

  return <TemoignagesClient temoignages={temoignages ?? []} userId={user?.id ?? null} />;
}
