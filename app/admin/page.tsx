"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminClient from "./AdminClient";
import { isModerator as canAccessAdmin } from "@/lib/rbac";

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth/login?redirect=/admin"); return; }

      // Tente d'auto-promouvoir en owner (idempotent, basé sur owner_emails)
      try { await sb.rpc("promote_owner_if_matched"); } catch { /* RPC pas encore migrée */ }

      const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).single();
      const currentRole = roleRow?.role || "member";
      if (!canAccessAdmin(currentRole)) { router.replace("/dashboard"); return; }
      const isAdmin = currentRole === "admin" || currentRole === "owner";
      const isOwner = currentRole === "owner";

      const { data: profile } = await sb.from("user_profiles").select("display_name, full_name").eq("user_id", user.id).single();
      const adminName = profile?.display_name || profile?.full_name || "Admin";
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        { count: totalMembers }, { count: newMembersWeek }, { count: totalPosts },
        { count: openPrayers }, { count: totalEvents }, { count: totalDevotions },
        { count: newContacts }, { count: pendingRdv },
      ] = await Promise.all([
        sb.from("user_profiles").select("*", { count: "exact", head: true }),
        sb.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
        sb.from("posts").select("*", { count: "exact", head: true }),
        sb.from("prayer_requests").select("*", { count: "exact", head: true }).eq("is_answered", false),
        sb.from("events").select("*", { count: "exact", head: true }).gte("event_date", monthStart),
        sb.from("devotions").select("*", { count: "exact", head: true }),
        sb.from("contact_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
        sb.from("pastoral_appointments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      // Cascade de fallback selon les migrations appliquées en prod.
      // L1 : tout (admin_panel_v2 + schema_fixes_v4)
      // L2 : sans is_disabled/last_sign_in_at/last_seen_at
      // L3 : sans country/city (schémas minimaux)
      // L4 : strict minimum (user_id, full_name, created_at)
      let members: any[] = [];
      const tryLevels = [
        "user_id, display_name, full_name, spiritual_level, created_at, country, city, is_premium, is_disabled, last_sign_in_at, last_seen_at",
        "user_id, display_name, full_name, spiritual_level, created_at, country, city, is_premium",
        "user_id, full_name, created_at, country, city",
        "user_id, full_name, created_at",
        "user_id, created_at",
      ];
      for (const cols of tryLevels) {
        const res = await sb.from("user_profiles")
          .select(cols)
          .order("created_at", { ascending: false }).limit(200);
        if (!res.error && res.data) { members = res.data; break; }
      }

      const { data: allRoles } = await sb.from("user_roles").select("user_id, role");
      const rolesMap: Record<string, string> = {};
      for (const r of allRoles || []) rolesMap[r.user_id] = r.role;

      const { data: recentPosts } = await sb.from("posts")
        .select("id, content, created_at, user_id, is_pinned, post_type")
        .order("created_at", { ascending: false }).limit(30);

      // prayer_requests : fallback si colonnes title/category absentes
      let recentPrayers: any[] = [];
      {
        const full = await sb.from("prayer_requests")
          .select("id, title, content, is_answered, created_at, user_id, is_anonymous, category")
          .order("created_at", { ascending: false }).limit(30);
        if (!full.error && full.data) recentPrayers = full.data;
        else {
          const basic = await sb.from("prayer_requests")
            .select("id, content, is_answered, created_at, user_id, is_anonymous")
            .order("created_at", { ascending: false }).limit(30);
          recentPrayers = (basic.data ?? []).map((p: any) => ({ ...p, title: (p.content ?? "").slice(0, 60), category: null }));
        }
      }

      // devotions : essai sur 'devotions' puis fallback 'daily_devotions'
      let devotions: any[] = [];
      {
        const tryDev = await sb.from("devotions")
          .select("id, devotion_date, title, verse_reference, verse_text, content")
          .order("devotion_date", { ascending: false }).limit(30);
        if (!tryDev.error && tryDev.data) {
          devotions = tryDev.data.map((d: any) => ({ ...d, date: d.devotion_date }));
        } else {
          const tryDaily = await sb.from("daily_devotions")
            .select("id, devotion_date, title, verse_reference, verse_text")
            .order("devotion_date", { ascending: false }).limit(30);
          devotions = (tryDaily.data ?? []).map((d: any) => ({ ...d, date: d.devotion_date, content: null }));
        }
      }

      const { data: events } = await sb.from("events")
        .select("*")
        .order("event_date", { ascending: false }).limit(50);

      const { data: contacts } = await sb.from("contact_messages")
        .select("id, full_name, email, phone, subject, message, is_read, created_at, user_id")
        .order("created_at", { ascending: false }).limit(50);

      const { data: rdvList } = await sb.from("pastoral_appointments")
        .select("id, full_name, phone, email, subject, message, preferred_date, preferred_time, modality, status, created_at, user_id")
        .order("created_at", { ascending: false }).limit(50);

      // Ressources gérables (peuvent ne pas exister selon migrations appliquées — on tolère l'erreur)
      const safeSelect = async <T,>(table: string, columns: string, opts?: { order?: string; ascending?: boolean; limit?: number }) => {
        try {
          let q: any = sb.from(table).select(columns);
          if (opts?.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
          if (opts?.limit) q = q.limit(opts.limit);
          const { data, error } = await q;
          if (error) return [] as T[];
          return (data || []) as T[];
        } catch { return [] as T[]; }
      };

      const [media, courses, sermons, albums, groups, siteContent, adminLogs, testimonies] = await Promise.all([
        safeSelect("media_library", "*", { order: "created_at", limit: 100 }),
        safeSelect("courses", "*", { order: "order_index", ascending: true, limit: 100 }),
        safeSelect("sermons", "*", { order: "published_at", limit: 100 }),
        safeSelect("photo_albums", "*", { order: "created_at", limit: 100 }),
        safeSelect("groups", "*", { order: "created_at", limit: 100 }),
        safeSelect("site_content", "*", { order: "page_key", ascending: true }),
        safeSelect("admin_logs", "*", { order: "created_at", limit: 100 }),
        safeSelect("testimonies", "*", { order: "created_at", limit: 100 }),
      ]);

      // Profile lookups — display_name peut ne pas exister, fallback sur full_name
      const safeProfileLookup = async (userIds: string[]) => {
        if (userIds.length === 0) return [] as any[];
        const tries = [
          "user_id, display_name, full_name",
          "user_id, full_name",
        ];
        for (const cols of tries) {
          const r = await sb.from("user_profiles").select(cols).in("user_id", userIds);
          if (!r.error && r.data) return r.data;
        }
        return [];
      };
      const postUserIds   = [...new Set((recentPosts   ?? []).map((p: any) => p.user_id))];
      const prayerUserIds = [...new Set((recentPrayers ?? []).map((p: any) => p.user_id))];
      const postProfiles   = await safeProfileLookup(postUserIds);
      const prayerProfiles = await safeProfileLookup(prayerUserIds);

      const norm = (arr: any[]) => (arr || []).map((p) => ({ id: p.user_id, full_name: p.display_name || p.full_name || "Membre" }));

      // Normalise display_name absent
      const membersNormalized = (members || []).map((m: any) => ({
        ...m, id: m.user_id,
        full_name: m.display_name || m.full_name || "—",
        role: rolesMap[m.user_id] || "member",
      }));

      setData({
        adminName,
        isAdmin,
        isOwner,
        currentRole,
        stats: {
          totalMembers: totalMembers ?? 0, newMembersWeek: newMembersWeek ?? 0,
          totalPosts: totalPosts ?? 0, openPrayers: openPrayers ?? 0,
          totalEvents: totalEvents ?? 0, totalDevotions: totalDevotions ?? 0,
          newContacts: newContacts ?? 0, pendingRdv: pendingRdv ?? 0,
        },
        members: membersNormalized,
        posts: recentPosts ?? [],
        postProfiles: norm(postProfiles ?? []),
        prayers: recentPrayers ?? [],
        prayerProfiles: norm(prayerProfiles ?? []),
        devotions: (devotions ?? []).map((d: any) => ({ ...d, devotion_date: d.date })),
        events: events ?? [],
        contacts: contacts ?? [],
        rdvList: rdvList ?? [],
        media,
        courses,
        sermons,
        albums,
        groups,
        siteContent,
        adminLogs,
        testimonies,
      });
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: "1rem", flexDirection: "column" }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--border,#333)", borderTopColor: "var(--gold,#d4af37)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!data) return null;
  return <AdminClient {...data} />;
}
