import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FollowListView, { type FollowMember } from "../FollowListView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abonnés — Communauté CCB" };

export default async function AbonnesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/profil/${id}/abonnes`);

  let members: FollowMember[] = [];
  try {
    // Abonnés = ceux qui suivent ce profil (following_id = id)
    const { data: rows } = await supabase
      .from("follows").select("follower_id").eq("following_id", id);
    const ids = ((rows ?? []) as Array<{ follower_id: string }>).map((r) => r.follower_id);
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
      title={`Abonnés (${members.length})`}
      members={members}
      backHref={`/community/profil/${id}`}
      emptyLabel="Aucun abonné pour le moment."
    />
  );
}
