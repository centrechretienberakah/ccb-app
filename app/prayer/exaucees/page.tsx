import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExauceesClient from "./ExauceesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "🎉 Prières exaucées — CCB" };

interface AnsweredPrayer {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  category: string | null;
  is_anonymous: boolean;
  answered_at: string | null;
  answered_with: string | null;
  created_at: string;
  user_profiles: { user_id: string; display_name: string | null; avatar_url: string | null } | null;
  intercessionsCount: number;
}

export default async function ExauceesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/prayer/exaucees");

  let prayers: AnsweredPrayer[] = [];
  try {
    const { data } = await supabase
      .from("prayer_requests")
      .select("id, user_id, title, content, category, is_anonymous, answered_at, answered_with, created_at")
      .eq("is_answered", true)
      .order("answered_at", { ascending: false, nullsFirst: false })
      .limit(60);
    const rows = (data ?? []) as Array<Omit<AnsweredPrayer, "user_profiles" | "intercessionsCount">>;

    // Intercessions counts
    const ids = rows.map((r) => r.id);
    const { data: inter } = await supabase
      .from("prayer_intercessions")
      .select("prayer_id");
    const interMap: Record<string, number> = {};
    for (const i of (inter ?? []) as Array<{ prayer_id: string }>) {
      if (ids.includes(i.prayer_id)) {
        interMap[i.prayer_id] = (interMap[i.prayer_id] || 0) + 1;
      }
    }

    // Profiles (non-anonymes)
    const authorIds = [...new Set(rows.filter((p) => !p.is_anonymous).map((p) => p.user_id))];
    const profilesMap: Record<string, AnsweredPrayer["user_profiles"]> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);
      for (const p of (profiles ?? []) as NonNullable<AnsweredPrayer["user_profiles"]>[]) {
        profilesMap[p.user_id] = p;
      }
    }

    prayers = rows.map((p) => ({
      ...p,
      user_profiles: p.is_anonymous ? null : (profilesMap[p.user_id] ?? null),
      intercessionsCount: interMap[p.id] ?? 0,
    }));
  } catch { /* fallback empty */ }

  return <ExauceesClient prayers={prayers} />;
}
