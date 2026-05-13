import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BibliothequeClient from "./BibliothequeClient";

export const metadata: Metadata = { title: "Bibliothèque — CCB" };

export default async function BibliothequePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: resources } = await supabase
    .from("media_library")
    .select("id, title, description, type, url, thumbnail_url, duration_secs, is_premium, download_count, created_at, tags")
    .order("created_at", { ascending: false });

  let isPremium = false;
  if (user) {
    const { data: p } = await supabase.from("user_profiles").select("is_premium").eq("user_id", user.id).single();
    isPremium = p?.is_premium ?? false;
  }

  return <BibliothequeClient resources={resources ?? []} isPremium={isPremium} userId={user?.id ?? null} />;
}
