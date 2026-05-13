import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LiveClient from "./LiveClient";

export const metadata: Metadata = { title: "Live — Cultes en Direct · CCB" };

export default async function LivePage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, event_date, location, cover_image_url")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(5);

  return <LiveClient upcomingEvents={events ?? []} />;
}
