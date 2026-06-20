import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient, { type ContinueData, type StreakData, type JdtvLite } from "./DashboardClient";
import { getTodayDevotion } from "@/lib/devotion/fetch";
import { READING_PLANS, calculateProgress } from "@/lib/bible/reading-plans";
import { OT_BOOKS, NT_BOOKS } from "@/lib/bible/books";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accueil" };

function computeStreak(isoDates: string[]): { current: number; longest: number } {
  const days = Array.from(new Set(isoDates.map((d) => d.slice(0, 10)))).sort();
  if (days.length === 0) return { current: 0, longest: 0 };
  const set = new Set(days);
  // Plus longue série
  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00");
    const cur = new Date(days[i] + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  // Série en cours (terminant aujourd'hui ou hier)
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!set.has(todayStr)) cursor.setDate(cursor.getDate() - 1); // tolère "pas encore lu aujourd'hui"
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (set.has(key)) { current++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return { current, longest: Math.max(longest, current) };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const todayDevotion = await getTodayDevotion(supabase);

  let devotionRead = false;
  if (todayDevotion.id) {
    try {
      const { data: prog } = await supabase
        .from("devotion_progress").select("id")
        .eq("user_id", user.id).eq("devotion_id", todayDevotion.id).maybeSingle();
      devotionRead = !!prog;
    } catch { /* noop */ }
  }

  interface ProfileMin { full_name?: string | null; avatar_url?: string | null; role?: string | null }
  interface UserProfileMin { display_name?: string | null; avatar_url?: string | null }
  let profile: ProfileMin | null = null;
  let userProfile: UserProfileMin | null = null;
  try {
    const [{ data: p }, { data: up }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, role").eq("id", user.id).single(),
      supabase.from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).single(),
    ]);
    profile = p as ProfileMin | null;
    userProfile = up as UserProfileMin | null;
  } catch { /* noop */ }

  const displayName = userProfile?.display_name || profile?.full_name || user.email?.split("@")[0] || "Bien-aimé(e)";
  const role = profile?.role ?? "member";

  // ── Reprendre où j'étais ──────────────────────────────────────────────
  const cont: ContinueData = { bible: null, plan: null, course: null };
  const streak: StreakData = { current: 0, longest: 0, chaptersRead: 0 };
  let recentJdtv: JdtvLite[] = [];

  try {
    const [lastReadRes, readAtRes, chapCountRes] = await Promise.all([
      supabase.from("bible_chapter_progress").select("book_name, chapter").eq("user_id", user.id).order("read_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bible_chapter_progress").select("read_at").eq("user_id", user.id).order("read_at", { ascending: false }).limit(500),
      supabase.from("bible_chapter_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const last = lastReadRes.data as { book_name: string; chapter: number } | null;
    if (last) {
      let pct = 0;
      try {
        const book = [...OT_BOOKS, ...NT_BOOKS].find((b) => b.fr === last.book_name);
        if (book) {
          const { count: inBook } = await supabase.from("bible_chapter_progress")
            .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("book_name", last.book_name);
          pct = Math.min(100, Math.round(((inBook ?? 0) / book.chapters) * 100));
        }
      } catch { /* noop */ }
      cont.bible = { book: last.book_name, chapter: last.chapter, pct };
    }
    const reads = ((readAtRes.data ?? []) as { read_at: string }[]).map((r) => r.read_at).filter(Boolean);
    const s = computeStreak(reads);
    streak.current = s.current; streak.longest = s.longest;
    streak.chaptersRead = chapCountRes.count ?? 0;
  } catch { /* tables absentes */ }

  try {
    const { data: ap } = await supabase.from("user_bible_plans")
      .select("plan_id, completed_days").eq("user_id", user.id).eq("is_active", true)
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    const row = ap as { plan_id: string; completed_days: number[] } | null;
    if (row) {
      const plan = READING_PLANS.find((p) => p.id === row.plan_id);
      if (plan) {
        const done = Array.isArray(row.completed_days) ? row.completed_days : [];
        cont.plan = { title: plan.title, emoji: plan.emoji, pct: calculateProgress(done, plan.totalDays), day: Math.min((done.length > 0 ? Math.max(...done) : 0) + 1, plan.totalDays), total: plan.totalDays };
      }
    }
  } catch { /* noop */ }

  try {
    const { data: prog } = await supabase.from("institut_user_progress")
      .select("course_id, is_completed").eq("user_id", user.id)
      .order("last_seen_at", { ascending: false }).limit(10);
    const rows = (prog ?? []) as { course_id: string; is_completed: boolean }[];
    const target = rows.find((r) => !r.is_completed) ?? rows[0];
    if (target?.course_id) {
      const { data: c } = await supabase.from("institut_courses")
        .select("title, slug").eq("id", target.course_id).maybeSingle();
      const course = c as { title: string; slug: string } | null;
      if (course) cont.course = { title: course.title, slug: course.slug };
    }
  } catch { /* noop */ }

  try {
    const { data: vids } = await supabase.from("jdtv_videos")
      .select("id, slug, title, thumbnail_url, speaker").eq("is_published", true)
      .order("published_at", { ascending: false }).limit(8);
    recentJdtv = ((vids ?? []) as JdtvLite[]);
  } catch { /* noop */ }

  return (
    <DashboardClient
      displayName={displayName}
      role={role}
      devotion={todayDevotion}
      devotionRead={devotionRead}
      userId={user.id}
      cont={cont}
      streak={streak}
      recentJdtv={recentJdtv}
    />
  );
}
