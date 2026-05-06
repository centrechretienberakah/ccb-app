import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let profile = null;
  let userProfile = null;

  try {
    const [{ data: p }, { data: up }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, role").eq("id", user.id).single(),
      supabase.from("user_profiles").select("display_name, avatar_url, bio").eq("user_id", user.id).single(),
    ]);
    profile = p;
    userProfile = up;
  } catch {}

  const displayName =
    (userProfile as any)?.display_name ||
    (profile as any)?.full_name ||
    user?.email?.split("@")[0] ||
    "Bien-aimé(e)";

  const avatarUrl =
    (userProfile as any)?.avatar_url ||
    (profile as any)?.avatar_url ||
    null;

  const role = (profile as any)?.role ?? "member";

  return (
    <DashboardClient
      displayName={displayName}
      avatarUrl={avatarUrl}
      email={user.email ?? null}
      role={role}
    />
  );
}
