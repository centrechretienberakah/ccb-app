import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GalerieClient from "./GalerieClient";

export const metadata: Metadata = { title: "Galerie — CCB" };

export default async function GaleriePage() {
  const supabase = await createClient();
  const { data: albums } = await supabase
    .from("photo_albums")
    .select("id, title, description, cover_url, created_at")
    .order("created_at", { ascending: false });
  const { data: photos } = await supabase
    .from("photos")
    .select("id, url, caption, album_id, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  return <GalerieClient albums={albums ?? []} photos={photos ?? []} />;
}
