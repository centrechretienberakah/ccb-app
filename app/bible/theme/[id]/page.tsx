import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ThemePlanClient from "./ThemePlanClient";
import { getThemedPlan, THEMED_PLANS } from "@/lib/bible/themed-plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = getThemedPlan(id);
  return { title: plan ? `${plan.title} — Plan thématique CCB` : "Plan thématique" };
}

interface ActivePlanRow {
  id: string;
  plan_id: string;
  completed_days: number[];
  started_at: string;
}

export default async function ThemePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = getThemedPlan(id);
  if (!plan) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/bible/theme/${id}`);

  // Plan id qu'on stocke en DB : prefixé "theme:"
  const dbPlanId = `theme:${id}`;

  const { data: activeRow } = await supabase
    .from("user_bible_plans")
    .select("id, plan_id, completed_days, started_at")
    .eq("user_id", user.id)
    .eq("plan_id", dbPlanId)
    .eq("is_active", true)
    .maybeSingle();

  return (
    <ThemePlanClient
      plan={plan}
      active={activeRow as ActivePlanRow | null}
      userId={user.id}
      dbPlanId={dbPlanId}
      allThemes={THEMED_PLANS.map((p) => ({ id: p.id, title: p.title, emoji: p.emoji }))}
    />
  );
}
