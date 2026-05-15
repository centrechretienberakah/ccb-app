// Helpers de calcul d'agrégats analytics pour l'admin dashboard
// Travaille sur des arrays de rows DB avec un champ created_at (ISO string).

import type { AnalyticsData } from "@/app/admin/AnalyticsTab";

interface DatedLike { created_at: string }

// Renvoie un array de 30 valeurs (un par jour, J-29 → J)
function bucketByDay(rows: DatedLike[], days = 30): number[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const buckets: number[] = new Array(days).fill(0);
  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    const ageMs = now.getTime() - ts;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    if (ageDays >= 0 && ageDays < days) {
      buckets[days - 1 - ageDays]++;
    }
  }
  return buckets;
}

function groupCount<T extends object>(rows: T[], key: keyof T, defaultLabel = "—"): { label: string; value: number }[] {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const raw = (r as Record<string, unknown>)[key as string];
    const k = String(raw ?? defaultLabel) || defaultLabel;
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

interface MemberMin {
  user_id: string;
  created_at: string;
  country?: string | null;
  last_sign_in_at?: string | null;
  full_name?: string | null;
  display_name?: string | null;
}
interface PostMin { created_at: string; post_type?: string | null; user_id: string }
interface PrayerMin { created_at: string; category?: string | null }
interface SermonMin { title: string; view_count?: number | null }

export interface BuildAnalyticsInput {
  members: MemberMin[];
  posts: PostMin[];
  prayers: PrayerMin[];
  sermons: SermonMin[];
  onlineUserIds: Set<string>; // depuis presence Realtime
}

export function buildAnalyticsData({ members, posts, prayers, sermons }: BuildAnalyticsInput): AnalyticsData {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Time series 30j
  const membersPerDay = bucketByDay(members, 30);
  const postsPerDay = bucketByDay(posts, 30);
  const prayersPerDay = bucketByDay(prayers, 30);

  // signIns reconstitué depuis last_sign_in_at (approximation : 1 entry par user)
  const signInRows = members
    .filter((m) => m.last_sign_in_at)
    .map((m) => ({ created_at: m.last_sign_in_at as string }));
  const signInsPerDay = bucketByDay(signInRows, 30);

  // Répartitions
  const prayersByCategory = groupCount(prayers, "category", "personal");
  const postsByType = groupCount(posts, "post_type", "text");
  const membersByCountry = groupCount(members, "country", "Inconnu");

  // Tops sermons (par view_count)
  const topSermons = sermons
    .filter((s) => (s.view_count ?? 0) > 0)
    .map((s) => ({ label: s.title, value: s.view_count || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Top membres (par nombre de posts)
  const postCountByUser: Record<string, number> = {};
  for (const p of posts) postCountByUser[p.user_id] = (postCountByUser[p.user_id] || 0) + 1;
  const memberById: Record<string, MemberMin> = {};
  for (const m of members) memberById[m.user_id] = m;
  const topMembers = Object.entries(postCountByUser)
    .map(([uid, n]) => ({
      label: memberById[uid]?.display_name || memberById[uid]?.full_name || "Membre",
      value: n,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Engagement
  const activeWeek = members.filter((m) => m.last_sign_in_at && now - new Date(m.last_sign_in_at).getTime() < 7 * day).length;
  const activeMonth = members.filter((m) => m.last_sign_in_at && now - new Date(m.last_sign_in_at).getTime() < 30 * day).length;
  const newMembers7d = members.filter((m) => now - new Date(m.created_at).getTime() < 7 * day).length;
  const newMembers30d = members.filter((m) => now - new Date(m.created_at).getTime() < 30 * day).length;

  return {
    membersPerDay,
    postsPerDay,
    prayersPerDay,
    signInsPerDay,
    prayersByCategory,
    postsByType,
    membersByCountry,
    topSermons,
    topMembers,
    engagement: {
      activeNow: 0, // injecté côté client depuis onlineSet
      activeWeek,
      activeMonth,
      totalMembers: members.length,
      newMembers7d,
      newMembers30d,
    },
  };
}
