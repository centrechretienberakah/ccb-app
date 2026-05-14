import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleHubClient from "./BibleHubClient";

export const metadata = { title: "Ma Bible — CCB" };

export default async function BiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible");

  return <BibleHubClient />;
}
