import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TemoignagesClient from "./TemoignagesClient";

export const metadata: Metadata = { title: "Témoignages — CCB" };

export default async function TemoignagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Témoignages featured (Bootcamp 2025, etc.) — gérés via /admin
  const { data: featured } = await supabase
    .from("testimonies")
    .select("id, title, content, category, author_name, author_role, author_country, author_initial, author_photo, is_featured, created_at")
    .eq("is_approved", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false });

  // Témoignages soumis par les membres (posts table)
  const { data: temoignages } = await supabase
    .from("posts")
    .select("id, content, user_id, created_at, likes_count, category")
    .eq("category", "temoignage")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <TemoignagesClient
      temoignages={temoignages ?? []}
      featured={(featured ?? []) as Parameters<typeof TemoignagesClient>[0]["featured"]}
      userId={user?.id ?? null}
    />
  );
}
