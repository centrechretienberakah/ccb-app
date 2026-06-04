"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminClient from "./AdminClient";
import { isModerator as canAccessAdmin } from "@/lib/rbac";
import type {
  UserProfileRow, UserRoleRow, PostRow, PrayerRow, DevotionRow, EventRow,
  ContactMessageRow, PastoralAppointmentRow,
} from "@/lib/database.types";
import { buildAnalyticsData } from "@/lib/analytics";

type AdminPayload = Parameters<typeof AdminClient>[0];

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminPayload | null>(null);
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

      // Cascade adaptive : MINIMAL d'abord (toujours marche), puis enrichit.
      let members: UserProfileRow[] = [];
      {
        const minimal = await sb.from("user_profiles")
          .select("user_id, created_at")
          .order("created_at", { ascending: false }).limit(200);
        members = (minimal.data as UserProfileRow[] | null) ?? [];
      }
      const optionalCols = [
        "user_id, display_name, full_name, spiritual_level, country, city, is_premium, is_disabled, last_sign_in_at, last_seen_at",
        "user_id, display_name, full_name, spiritual_level, country, city, is_premium",
        "user_id, full_name, country, city",
        "user_id, full_name",
      ];
      for (const cols of optionalCols) {
        const ids = members.map((m) => m.user_id);
        if (ids.length === 0) break;
        const r = await sb.from("user_profiles").select(cols).in("user_id", ids);
        if (!r.error && r.data) {
          const byId = new Map<string, UserProfileRow>();
          for (const row of (r.data as unknown as UserProfileRow[])) byId.set(row.user_id, row);
          members = members.map((m) => ({ ...byId.get(m.user_id), ...m } as UserProfileRow));
          break;
        }
      }

      const { data: allRoles } = await sb.from("user_roles").select("user_id, role");
      const rolesMap: Record<string, string> = {};
      for (const r of (allRoles as UserRoleRow[] | null) || []) rolesMap[r.user_id] = r.role;

      const { data: recentPosts } = await sb.from("posts")
        .select("id, content, created_at, user_id, is_pinned, post_type")
        .order("created_at", { ascending: false }).limit(30);

      // prayer_requests : fallback si colonnes title/category absentes
      let recentPrayers: PrayerRow[] = [];
      {
        const full = await sb.from("prayer_requests")
          .select("id, title, content, is_answered, created_at, user_id, is_anonymous, category")
          .order("created_at", { ascending: false }).limit(30);
        if (!full.error && full.data) recentPrayers = full.data as unknown as PrayerRow[];
        else {
          const basic = await sb.from("prayer_requests")
            .select("id, content, is_answered, created_at, user_id, is_anonymous")
            .order("created_at", { ascending: false }).limit(30);
          recentPrayers = (basic.data ?? [] as PrayerRow[]).map((p) => ({
            ...p,
            title: (p.content ?? "").slice(0, 60),
            category: null,
          })) as PrayerRow[];
        }
      }

      // devotions : essai sur 'devotions' puis fallback 'daily_devotions'
      let devotions: DevotionRow[] = [];
      {
        const tryDev = await sb.from("devotions")
          .select("id, devotion_date, title, verse_reference, verse_text, content")
          .order("devotion_date", { ascending: false }).limit(30);
        if (!tryDev.error && tryDev.data) {
          devotions = (tryDev.data as unknown as DevotionRow[]).map((d) => ({ ...d, date: d.devotion_date }));
        } else {
          const tryDaily = await sb.from("daily_devotions")
            .select("id, devotion_date, title, verse_reference, verse_text")
            .order("devotion_date", { ascending: false }).limit(30);
          devotions = ((tryDaily.data as unknown as DevotionRow[] | null) ?? []).map((d) => ({ ...d, date: d.devotion_date, content: null }));
        }
      }

      const { data: events } = await sb.from("events")
        .select("*")
        .order("event_date", { ascending: false }).limit(50);
      const eventsTyped = (events as EventRow[] | null) ?? [];

      const { data: contacts } = await sb.from("contact_messages")
        .select("id, full_name, email, phone, subject, message, is_read, created_at, user_id")
        .order("created_at", { ascending: false }).limit(50);
      const contactsTyped = (contacts as ContactMessageRow[] | null) ?? [];

      const { data: rdvList } = await sb.from("pastoral_appointments")
        .select("id, full_name, phone, email, subject, message, preferred_date, preferred_time, modality, status, created_at, user_id")
        .order("created_at", { ascending: false }).limit(50);
      const rdvListTyped = (rdvList as PastoralAppointmentRow[] | null) ?? [];

      // Ressources gérables (peuvent ne pas exister selon migrations appliquées — on tolère l'erreur)
      const safeSelect = async <T,>(
        table: string,
        columns: string,
        opts?: { order?: string; ascending?: boolean; limit?: number }
      ): Promise<T[]> => {
        try {
          // Le query builder Supabase a une API fluide difficile à typer génériquement.
          let q: any = sb.from(table).select(columns);
          if (opts?.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
          if (opts?.limit) q = q.limit(opts.limit);
          const { data, error } = await q;
          if (error) return [];
          return (data || []) as T[];
        } catch { return []; }
      };

      type DbRow = Record<string, unknown>;
      const [media, albums, siteContent, adminLogs, testimonies] = await Promise.all([
        safeSelect<DbRow>("media_library", "*", { order: "created_at", limit: 100 }),
        safeSelect<DbRow>("photo_albums", "*", { order: "created_at", limit: 100 }),
        safeSelect<DbRow>("site_content", "*", { order: "page_key", ascending: true }),
        safeSelect<import("@/lib/database.types").AdminLogRow>("admin_logs", "*", { order: "created_at", limit: 100 }),
        safeSelect<DbRow>("testimonies", "*", { order: "created_at", limit: 100 }),
      ]);

      // Profile lookups — display_name peut ne pas exister, fallback sur full_name
      const safeProfileLookup = async (userIds: string[]): Promise<UserProfileRow[]> => {
        if (userIds.length === 0) return [];
        const tries = [
          "user_id, display_name, full_name",
          "user_id, full_name",
        ];
        for (const cols of tries) {
          const r = await sb.from("user_profiles").select(cols).in("user_id", userIds);
          if (!r.error && r.data) return r.data as unknown as UserProfileRow[];
        }
        return [];
      };
      const postsTyped = (recentPosts as PostRow[] | null) ?? [];
      const postUserIds   = [...new Set(postsTyped.map((p) => p.user_id))];
      const prayerUserIds = [...new Set(recentPrayers.map((p) => p.user_id))];
      const postProfiles   = await safeProfileLookup(postUserIds);
      const prayerProfiles = await safeProfileLookup(prayerUserIds);

      const norm = (arr: UserProfileRow[]) =>
        arr.map((p) => ({
          id: p.user_id,
          full_name: p.display_name || p.full_name || "Membre",
        }));

      // Normalise display_name absent
      const membersNormalized = members.map((m) => ({
        ...m,
        id: m.user_id,
        full_name: m.display_name || m.full_name || "—",
        role: rolesMap[m.user_id] || "member",
      }));

      // Construit les données analytics depuis ce qui est déjà chargé
      const analytics = buildAnalyticsData({
        members: members.map((m) => ({
          user_id: m.user_id,
          created_at: m.created_at,
          country: m.country ?? null,
          last_sign_in_at: m.last_sign_in_at ?? null,
          full_name: m.full_name ?? null,
          display_name: m.display_name ?? null,
        })),
        posts: postsTyped.map((p) => ({
          created_at: p.created_at,
          post_type: p.post_type ?? null,
          user_id: p.user_id,
        })),
        prayers: recentPrayers.map((p) => ({
          created_at: p.created_at,
          category: p.category ?? null,
        })),
        sermons: [],
        onlineUserIds: new Set(),
      });

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
        posts: postsTyped,
        postProfiles: norm(postProfiles),
        prayers: recentPrayers,
        prayerProfiles: norm(prayerProfiles),
        devotions: devotions.map((d) => ({ ...d, devotion_date: d.date ?? d.devotion_date })),
        events: eventsTyped as unknown as Record<string, unknown>[],
        contacts: contactsTyped,
        rdvList: rdvListTyped,
        media,
        albums,
        siteContent,
        adminLogs,
        testimonies,
        analytics,
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
