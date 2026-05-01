import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata = {
  title: "Admin — CCB",
};

export default async function AdminPage() {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin");

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch all devotions
  const { data: devotions } = await supabase
    .from("daily_devotions")
    .select("*")
    .order("devotion_date", { ascending: true });

  // Fetch all members
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, spiritual_level, created_at")
    .order("created_at", { ascending: false });

  // Stats
  const today = new Date().toISOString().split("T")[0];

  let todayReads = 0;
  let totalReads = 0;

  try {
    // Total reads
    const { count: total } = await supabase
      .from("user_devotion_progress")
      .select("*", { count: "exact", head: true });
    totalReads = total || 0;

    // Today's reads
    const { data: todayDevotion } = await supabase
      .from("daily_devotions")
      .select("id")
      .eq("devotion_date", today)
      .single();

    if (todayDevotion?.id) {
      const { count } = await supabase
        .from("user_devotion_progress")
        .select("*", { count: "exact", head: true })
        .eq("devotion_id", todayDevotion.id);
      todayReads = count || 0;
    }
  } catch {
    // Tables may not exist
  }

  const stats = {
    totalMembers: members?.length || 0,
    totalDevotions: devotions?.length || 0,
    todayReads,
    totalReads,
  };

  return (
    <AdminClient
      devotions={devotions || []}
      members={members || []}
      stats={stats}
    />
  );
}
