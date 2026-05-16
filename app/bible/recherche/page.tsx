import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SearchClient from "./SearchClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rechercher dans la Bible — CCB" };

export default async function BibleSearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/recherche");
  return <SearchClient />;
}
