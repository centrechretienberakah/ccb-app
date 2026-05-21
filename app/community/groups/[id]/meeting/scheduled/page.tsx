import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ScheduledClient, { type ScheduledRow, type ProfileLite } from "./ScheduledClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data ? `Réunions programmées — ${(data as { name: string }).name}` : "Réunions" };
}

export default async function ScheduledPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirect=/community/groups/${id}/meeting/scheduled`);

  const { data: groupData } = await supabase
    .from("groups")
    .select("id, name, type")
    .eq("id", id).maybeSingle();
  if (!groupData) return notFound();
  const group = groupData as { id: string; name: string; type: "public" | "private" };

  // Membership check pour les groupes privés
  let isMember = false;
  let myRole: "owner" | "admin" | "member" | null = null;
  if (true) {
    const { data: gm } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", id).eq("user_id", user.id).maybeSingle();
    if (gm) {
      isMember = true;
      myRole = (gm as { role: "owner" | "admin" | "member" }).role;
    }
  }

  // Mod+ global passe outre
  let isStaff = false;
  try {
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = (roleRow as { role: string } | null)?.role;
    if (role && ["owner", "admin", "leader", "moderator"].includes(role)) isStaff = true;
  } catch { /* noop */ }

  if (group.type === "private" && !isMember && !isStaff) {
    redirect(`/community/groups/${id}`);
  }

  // Fetch les réunions programmées (sauf cancellées + sauf trop anciennes terminées)
  let scheduled: ScheduledRow[] = [];
  let sqlReady = true;
  try {
    const { data, error } = await supabase
      .from("meet_scheduled_with_stats")
      .select("id, group_id, title, description, mode, scheduled_at, duration_minutes, created_by, status, session_id, started_at, cancelled_at, is_upcoming, is_now, seconds_until_start")
      .eq("group_id", id)
      .neq("status", "cancelled")
      .gte("scheduled_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);
    if (error) throw error;
    scheduled = (data ?? []) as ScheduledRow[];
  } catch { sqlReady = false; }

  // Profils des créateurs
  const creatorIds = Array.from(new Set(scheduled.map((s) => s.created_by)));
  let profiles: ProfileLite[] = [];
  if (creatorIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", creatorIds);
    profiles = ((data ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>);
  }

  return (
    <ScheduledClient
      group={group}
      initialScheduled={scheduled}
      profiles={profiles}
      currentUserId={user.id}
      myRole={myRole}
      isStaff={isStaff}
      sqlReady={sqlReady}
    />
  );
}
