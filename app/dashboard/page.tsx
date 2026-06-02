import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { getTodayDevotion } from "@/lib/devotion/fetch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Méditation du jour (date Europe/Paris) — affichée en tête de l'accueil
  const todayDevotion = await getTodayDevotion(supabase);

  // L'utilisateur a-t-il déjà marqué la méditation du jour comme lue ?
  let devotionRead = false;
  if (todayDevotion.id) {
    try {
      const { data: prog } = await supabase
        .from("devotion_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("devotion_id", todayDevotion.id)
        .maybeSingle();
      devotionRead = !!prog;
    } catch { /* table absente → non lu */ }
  }

  interface ProfileMin { full_name?: string | null; avatar_url?: string | null; role?: string | null }
  interface UserProfileMin { display_name?: string | null; avatar_url?: string | null; bio?: string | null }

  let profile: ProfileMin | null = null;
  let userProfile: UserProfileMin | null = null;

  try {
    const [{ data: p }, { data: up }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, role").eq("id", user.id).single(),
      supabase.from("user_profiles").select("display_name, avatar_url, bio").eq("user_id", user.id).single(),
    ]);
    profile = p as ProfileMin | null;
    userProfile = up as UserProfileMin | null;
  } catch {}

  const displayName =
    userProfile?.display_name ||
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Bien-aimé(e)";

  const avatarUrl =
    userProfile?.avatar_url ||
    profile?.avatar_url ||
    null;

  const role = profile?.role ?? "member";

  return (
    <DashboardClient
      displayName={displayName}
      avatarUrl={avatarUrl}
      email={user.email ?? null}
      role={role}
      devotion={todayDevotion}
      devotionRead={devotionRead}
      userId={user.id}
    />
  );
}
