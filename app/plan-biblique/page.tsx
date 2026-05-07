import { createClient } from "@/lib/supabase/server";
import PlanBibliqueClient from "./PlanBibliqueClient";

export const metadata = { title: "Plan de Lecture — CCB" };

export default async function PlanBibliquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let activePlans: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_bible_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("started_at", { ascending: false });
    activePlans = data ?? [];
  }

  return <PlanBibliqueClient user={user} activePlans={activePlans} />;
}
