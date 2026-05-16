import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes notifications — Communauté CCB" };

interface NotifRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  source_type: string;
  source_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface ActorProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default async function CommunityNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/community/notifications");

  const { data: notifData } = await supabase
    .from("user_notifications")
    .select("id, user_id, actor_id, type, source_type, source_id, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const notifications = (notifData ?? []) as NotifRow[];

  const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter(Boolean))] as string[];
  let actors: ActorProfile[] = [];
  if (actorIds.length > 0) {
    const { data: ap } = await supabase
      .from("user_profiles").select("user_id, display_name, avatar_url")
      .in("user_id", actorIds);
    actors = (ap as ActorProfile[] | null) ?? [];
  }

  return (
    <NotificationsClient
      notifications={notifications}
      actors={actors}
    />
  );
}
