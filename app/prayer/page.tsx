import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrayerClient from "./PrayerClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intercession — CCB" };

export default async function PrayerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/prayer");

  let prayers: any[] = [];
  let currentUserProfile: any = null;
  let myIntercessedIds: string[] = [];

  try {
    // Profil courant
    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single();
    currentUserProfile = myProfile;

    // Requêtes de prière (60 dernières)
    const { data: prayersData } = await supabase
      .from("prayer_requests")
      .select("id, user_id, content, is_anonymous, is_answered, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    prayers = prayersData || [];

    // Intercessions (comptage + vérif user courant)
    const { data: intercessions } = await supabase
      .from("prayer_intercessions")
      .select("prayer_id, user_id");

    const interMap: Record<string, number> = {};
    const mySet = new Set<string>();
    for (const i of intercessions || []) {
      interMap[i.prayer_id] = (interMap[i.prayer_id] || 0) + 1;
      if (i.user_id === user.id) mySet.add(i.prayer_id);
    }
    myIntercessedIds = [...mySet];

    // Profils des auteurs (sauf anonymes)
    const authorIds = [...new Set(
      prayers.filter((p) => !p.is_anonymous).map((p) => p.user_id)
    )];
    let profilesMap: Record<string, any> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds);
      profilesMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );
    }

    // Enrichir avec profils + compte intercessions
    prayers = prayers.map((p) => ({
      ...p,
      intercessionsCount: interMap[p.id] || 0,
      user_profiles: p.is_anonymous ? null : (profilesMap[p.user_id] || null),
    }));
  } catch (e) {
    console.error("Prayer fetch error:", e);
  }

  return (
    <PrayerClient
      prayers={prayers}
      currentUserId={user.id}
      currentUserProfile={currentUserProfile}
      myIntercessedIds={myIntercessedIds}
    />
  );
}
