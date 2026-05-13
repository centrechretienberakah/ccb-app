import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AnnoncesClient from "./AnnoncesClient";

export const metadata: Metadata = { title: "Annonces — CCB" };

export default async function AnnoncesPage() {
  const supabase = await createClient();
  const { data: annonces } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return <AnnoncesClient annonces={annonces ?? []} />;
}
