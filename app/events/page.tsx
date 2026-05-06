import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventsClient from "./EventsClient";

export const metadata: Metadata = { title: "Événements CCB" };

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all published events (upcoming first, then past)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, event_type, event_date, end_date, location, is_online, link_url, stream_url, image_url, is_published, status, created_by, created_at")
    .eq("is_published", true)
    .order("event_date", { ascending: true });

  // Fetch current user RSVPs
  const { data: rsvps } = await supabase
    .from("event_rsvp")
    .select("event_id, status")
    .eq("user_id", user.id);

  // Fetch RSVP counts per event
  const { data: rsvpCounts } = await supabase
    .from("event_rsvp")
    .select("event_id, status");

  // Check if admin
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  const userRsvpMap: Record<string, string> = {};
  for (const r of rsvps ?? []) userRsvpMap[r.event_id] = r.status;

  const countMap: Record<string, { going: number; maybe: number }> = {};
  for (const r of rsvpCounts ?? []) {
    if (!countMap[r.event_id]) countMap[r.event_id] = { going: 0, maybe: 0 };
    if (r.status === "going") countMap[r.event_id].going++;
    if (r.status === "maybe") countMap[r.event_id].maybe++;
  }

  return (
    <EventsClient
      events={events ?? []}
      userRsvpMap={userRsvpMap}
      rsvpCountMap={countMap}
      currentUserId={user.id}
      isAdmin={!!roleRow}
    />
  );
}
