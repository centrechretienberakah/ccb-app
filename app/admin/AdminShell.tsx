"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminClient from "./AdminClient";

export default function AdminShell() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { router.replace("/auth/login?redirect=/admin"); return; }

        const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).single();
        if (roleRow?.role !== "admin" && roleRow?.role !== "leader") { router.replace("/dashboard"); return; }

        const { data: profile } = await sb.from("user_profiles").select("display_name, full_name").eq("user_id", user.id).single();
        const adminName = profile?.display_name || profile?.full_name || "Admin";

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const [
          { count: totalMembers },
          { count: newMembersWeek },
          { count: totalPosts },
          { count: openPrayers },
          { count: totalEvents },
          { count: totalDevotions },
        ] = await Promise.all([
          sb.from("user_profiles").select("*", { count: "exact", head: true }),
          sb.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
          sb.from("posts").select("*", { count: "exact", head: true }),
          sb.from("prayer_request").select("*", { count: "exact", head: true }).eq("is_answered", false),
          sb.from("events").select("*", { count: "exact", head: true }).gte("event_date", monthStart),
          sb.from("devotions").select("*", { count: "exact", head: true }),
        ]);

        const { data: members } = await sb.from("user_profiles")
          .select("user_id, display_name, full_name, spiritual_level, created_at, country, city, is_premium")
          .order("created_at", { ascending: false }).limit(100);

        const { data: allRoles } = await sb.from("user_roles").select("user_id, role");
        const rolesMap: Record<string, string> = {};
        for (const r of allRoles || []) rolesMap[r.user_id] = r.role;
        const membersWithRole = (members || []).map((m: any) => ({
          ...m, id: m.user_id,
          full_name: m.display_name || m.full_name || "—",
          role: rolesMap[m.user_id] || "member",
        }));

        const { data: recentPosts } = await sb.from("posts")
          .select("id, content, created_at, user_id, is_pinned, post_type")
          .order("created_at", { ascending: false }).limit(30);

        const { data: recentPrayers } = await sb.from("prayer_request")
          .select("id, title, content, is_answered, created_at, user_id, is_anonymous, category")
          .order("created_at", { ascending: false }).limit(30);

        const { data: devotions } = await sb.from("devotions")
          .select("id, date, title, verse_reference, verse_text, content")
          .order("date", { ascending: false }).limit(30);

        const { data: events } = await sb.from("events")
          .select("id, title, event_date, event_type, is_published, status")
          .order("event_date", { ascending: false }).limit(20);

        const postUserIds = [...new Set((recentPosts ?? []).map((p: any) => p.user_id))];
        const { data: postProfiles } = postUserIds.length > 0
          ? await sb.from("user_profiles").select("user_id, display_name, full_name").in("user_id", postUserIds)
          : { data: [] };

        const prayerUserIds = [...new Set((recentPrayers ?? []).map((p: any) => p.user_id))];
        const { data: prayerProfiles } = prayerUserIds.length > 0
          ? await sb.from("user_profiles").select("user_id, display_name, full_name").in("user_id", prayerUserIds)
          : { data: [] };

        const normalize = (arr: any[]) => (arr || []).map((p) => ({
          id: p.user_id, full_name: p.display_name || p.full_name || "Membre",
        }));

        setData({
          adminName,
          stats: {
            totalMembers: totalMembers ?? 0, newMembersWeek: newMembersWeek ?? 0,
            totalPosts: totalPosts ?? 0, openPrayers: openPrayers ?? 0,
            totalEvents: totalEvents ?? 0, totalDevotions: totalDevotions ?? 0,
          },
          members: membersWithRole,
          posts: recentPosts ?? [],
          postProfiles: normalize(postProfiles ?? []),
          prayers: recentPrayers ?? [],
          prayerProfiles: normalize(prayerProfiles ?? []),
          devotions: (devotions ?? []).map((d: any) => ({ ...d, devotion_date: d.date })),
          events: events ?? [],
        });
      } catch (e: any) {
        setError(e.message || "Erreur inattendue");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
      <div style={{ width: 48, height: 48, border: "3px solid var(--border)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement du panel admin...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#f87171" }}>
      Erreur : {error}
    </div>
  );

  if (!data) return null;

  return <AdminClient {...data} />;
}
