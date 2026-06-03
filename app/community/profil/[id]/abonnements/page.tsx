import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FollowListView, { type FollowMember } from "../FollowListView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abonnements — Communauté CCB" };

export default async function AbonnementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/profil/${id}/abonnements`);

  let members: FollowMember[] = [];
  try {
    // Abonnements = ceux que ce profil suit (follower_id = id)
    const { data: rows } = await supabase
      .from("follows").select("following_id").eq("follower_id", id);
    const ids = ((rows ?? []) as Array<{ following_id: string }>).map((r) => r.following_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url, bio")
        .in("user_id", ids);
      members = (profs ?? []) as FollowMember[];
    }
  } catch { /* table v52 pas migrée → liste vide */ }

  return (
    <FollowListView
      title={`Abonnements (${members.length})`}
      members={members}
      backHref={`/community/profil/${id}`}
      emptyLabel="Aucun abonnement pour le moment."
    />
  );
}
