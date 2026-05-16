import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { THEMED_PLANS } from "@/lib/bible/themed-plans";
import ThemesListClient from "./ThemesListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans thématiques — CCB" };

export default async function ThemesIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible/theme");

  // Récupère les plans actifs ("theme:xxx") pour montrer progression
  const { data: activeRows } = await supabase
    .from("user_bible_plans")
    .select("plan_id, completed_days")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .like("plan_id", "theme:%");

  const activeMap: Record<string, number> = {};
  (activeRows ?? []).forEach((r) => {
    const row = r as { plan_id: string; completed_days: number[] };
    const id = row.plan_id.replace(/^theme:/, "");
    activeMap[id] = (row.completed_days ?? []).length;
  });

  return (
    <ThemesListClient
      themes={THEMED_PLANS.map((p) => ({
        id: p.id, title: p.title, description: p.description,
        emoji: p.emoji, totalDays: p.totalDays,
      }))}
      activeMap={activeMap}
    />
  );
}
