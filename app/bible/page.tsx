import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BibleClient from "./BibleClient";
import { ALL_PLANS } from "@/lib/bible/plans";

export const metadata = {
  title: "Plan de lecture — CCB",
};

export default async function BiblePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible");

  // Active plan
  let activePlan: any = null;
  let progressDays: number[] = [];
  let notes: any[] = [];
  let savedVerses: any[] = [];

  try {
    const { data: planRow } = await supabase
      .from("user_bible_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    activePlan = planRow || null;

    if (activePlan) {
      // Progress: which day_numbers have been fully logged
      const { data: progress } = await supabase
        .from("user_reading_progress")
        .select("day_number")
        .eq("user_id", user.id)
        .eq("plan_id", activePlan.plan_id);

      if (progress) {
        const daySet = new Set(progress.map((p: any) => p.day_number));
        progressDays = Array.from(daySet) as number[];
      }
    }

    // Notes
    const { data: notesData } = await supabase
      .from("user_bible_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    notes = notesData || [];

    // Saved verses
    const { data: versesData } = await supabase
      .from("user_saved_verses")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });
    savedVerses = versesData || [];
  } catch {
    // Tables may not exist yet
  }

  return (
    <BibleClient
      user={user}
      activePlan={activePlan}
      progressDays={progressDays}
      allPlans={ALL_PLANS}
      notes={notes}
      savedVerses={savedVerses}
    />
  );
}
