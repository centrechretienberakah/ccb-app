import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import HistoryClient, { type SessionRow, type ProfileLite } from "./HistoryClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `Historique des appels — ${(data as { name: string }).name}` : "Historique" };
}

export default async function MeetingHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}/meeting/history`);

  const { data: groupData } = await supabase
    .from("groups")
    .select("id, name, type")
    .eq("id", id).maybeSingle();
  if (!groupData) return notFound();
  const group = groupData as { id: string; name: string; type: "public" | "private" };

  // Membership check pour les groupes privés
  if (group.type === "private") {
    const { data: gm } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", id).eq("user_id", user.id).maybeSingle();
    if (!gm) {
      // Laisse passer si mod+ global
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (!role || !["owner", "admin", "leader", "moderator"].includes(role)) {
        redirect(`/community/groups/${id}`);
      }
    }
  }

  // Fetch sessions des 60 derniers jours via la vue stats
  let sessions: SessionRow[] = [];
  let sqlReady = true;
  try {
    const { data, error } = await supabase
      .from("meet_sessions_with_stats")
      .select("id, group_id, room_name, mode, started_by, started_at, ended_at, total_seconds, participant_count_peak, participant_count_total, recording_url, is_active, active_count")
      .eq("group_id", id)
      .gte("started_at", new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString())
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    sessions = (data ?? []) as SessionRow[];
  } catch {
    sqlReady = false;
  }

  // Charge les profils des starters + des derniers participants
  const userIds = new Set<string>();
  sessions.forEach((s) => userIds.add(s.started_by));

  // Pour chaque session, on récupère les participants (limite raisonnable)
  type PartRow = { session_id: string; user_id: string; joined_at: string; total_seconds: number | null };
  let participants: PartRow[] = [];
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    try {
      const { data } = await supabase
        .from("meet_session_participants")
        .select("session_id, user_id, joined_at, total_seconds")
        .in("session_id", sessionIds);
      participants = (data ?? []) as PartRow[];
      participants.forEach((p) => userIds.add(p.user_id));
    } catch { /* noop */ }
  }

  let profiles: ProfileLite[] = [];
  if (userIds.size > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", Array.from(userIds));
    profiles = ((data ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>);
  }

  return (
    <HistoryClient
      group={group}
      sessions={sessions}
      participants={participants}
      profiles={profiles}
      sqlReady={sqlReady}
    />
  );
}
