import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch last 50 notifications, mark all as read in background
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark all unread as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return <NotificationsClient notifications={notifications ?? []} />;
}
