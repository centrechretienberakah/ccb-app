import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanBibliqueClient from "./PlanBibliqueClient";
import { ALL_PLANS } from "@/lib/bible/plans";

export const metadata: Metadata = { title: "Plan Biblique — CCB" };

export default async function PlanBibliquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Active plan
  const { data: activePlan } = await supabase
    .from("user_bible_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  // All user plans (to know which were previously started)
  const { data: userPlans } = await supabase
    .from("user_bible_plans")
    .select("plan_id, start_date, is_active")
    .eq("user_id", user.id);

  // Reading progress for active plan
  let progress: { day_number: number; book_name: string; chapter: number }[] = [];
  if (activePlan) {
    const { data } = await supabase
      .from("user_reading_progress")
      .select("day_number, book_name, chapter")
      .eq("user_id", user.id)
      .eq("plan_id", activePlan.plan_id)
      .order("day_number", { ascending: true });
    progress = data ?? [];
  }

  return (
    <PlanBibliqueClient
      userId={user.id}
      plans={ALL_PLANS}
      activePlan={activePlan ?? null}
      userPlans={userPlans ?? []}
      progress={progress}
    />
  );
}
