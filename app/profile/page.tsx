import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Mon Profil — CCB" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/profile");

  // Profil existant
  let profile: any = null;
  let milestones: any[] = [];
  let stats = { chaptersRead: 0, versesSaved: 0, readingDates: [] as string[] };

  try {
    const { data: p } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    profile = p;

    const { data: m } = await supabase
      .from("spiritual_milestones")
      .select("*")
      .eq("user_id", user.id);
    milestones = m || [];

    // Chapitres lus
    const { count: chapters } = await supabase
      .from("user_reading_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    stats.chaptersRead = chapters || 0;

    // Versets sauvegardés
    const { count: verses } = await supabase
      .from("user_saved_verses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    stats.versesSaved = verses || 0;

    // Dates de lecture pour streak
    const { data: progressDates } = await supabase
      .from("user_reading_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });
    stats.readingDates = (progressDates || []).map((p: any) => p.completed_at);
  } catch {
    // Tables may not exist yet
  }

  return (
    <ProfileClient
      user={user}
      profile={profile}
      milestones={milestones}
      stats={stats}
    />
  );
}
