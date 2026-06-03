import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["owner", "admin"]);

async function assertAdmin() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (roleRow as { role?: string } | null)?.role;
  if (!role || !ADMIN_ROLES.has(role)) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function safe<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

// GET /api/admin/member/[id]/overview — agrégats admin (dons, formations, bible, prières, session)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });
  const { id } = await params;

  // ── Dons ──────────────────────────────────────────────────────────
  const donations = await safe((async () => {
    const { data } = await admin.from("donations_records")
      .select("amount_xaf, amount_native, currency, payment_mode, status, created_at, paid_at, kind")
      .eq("user_id", id).order("created_at", { ascending: false });
    const rows = (data ?? []) as Array<{ amount_xaf: number; amount_native: number; currency: string; payment_mode: string | null; status: string; created_at: string; paid_at: string | null; kind: string }>;
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const totalXaf = confirmed.reduce((s, r) => s + (Number(r.amount_xaf) || 0), 0);
    const byMode: Record<string, number> = {};
    for (const r of confirmed) { const m = r.payment_mode || "autre"; byMode[m] = (byMode[m] || 0) + (Number(r.amount_xaf) || 0); }
    const last = rows[0]
      ? { amount_native: rows[0].amount_native, currency: rows[0].currency, payment_mode: rows[0].payment_mode, status: rows[0].status, created_at: rows[0].paid_at || rows[0].created_at }
      : null;
    return { totalXaf, count: confirmed.length, pending: rows.length - confirmed.length, byMode, last };
  })(), { totalXaf: 0, count: 0, pending: 0, byMode: {}, last: null });

  // ── Formations (institut) ─────────────────────────────────────────
  const formations = await safe((async () => {
    const { data: prog } = await admin.from("institut_user_progress")
      .select("course_id, is_completed").eq("user_id", id);
    const rows = (prog ?? []) as Array<{ course_id: string; is_completed: boolean }>;
    if (rows.length === 0) return { courses: [], lessonsCompleted: 0, certificates: 0 };
    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    const [{ data: lessons }, { data: courses }] = await Promise.all([
      admin.from("institut_lessons").select("course_id").in("course_id", courseIds),
      admin.from("institut_courses").select("id, title").in("id", courseIds),
    ]);
    const totalByCourse: Record<string, number> = {};
    for (const l of (lessons ?? []) as Array<{ course_id: string }>) totalByCourse[l.course_id] = (totalByCourse[l.course_id] || 0) + 1;
    const titleById: Record<string, string> = {};
    for (const c of (courses ?? []) as Array<{ id: string; title: string }>) titleById[c.id] = c.title;
    const completedByCourse: Record<string, number> = {};
    for (const r of rows) if (r.is_completed) completedByCourse[r.course_id] = (completedByCourse[r.course_id] || 0) + 1;
    const out = courseIds.map((cid) => {
      const total = totalByCourse[cid] || 0;
      const completed = completedByCourse[cid] || 0;
      return { id: cid, title: titleById[cid] || "Formation", completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }).sort((a, b) => b.pct - a.pct);
    const lessonsCompleted = rows.filter((r) => r.is_completed).length;
    const certificates = out.filter((c) => c.total > 0 && c.completed >= c.total).length;
    return { courses: out, lessonsCompleted, certificates };
  })(), { courses: [], lessonsCompleted: 0, certificates: 0 });

  // ── Bible + plans ─────────────────────────────────────────────────
  const bible = await safe((async () => {
    const [{ data: chap }, { data: plans }] = await Promise.all([
      admin.from("bible_chapter_progress").select("read_at").eq("user_id", id),
      admin.from("user_bible_plans").select("is_active").eq("user_id", id),
    ]);
    const chapRows = (chap ?? []) as Array<{ read_at: string }>;
    const days = new Set(chapRows.map((r) => (r.read_at || "").slice(0, 10)).filter(Boolean));
    const planRows = (plans ?? []) as Array<{ is_active: boolean }>;
    return { chaptersRead: chapRows.length, readingDays: days.size, plansTotal: planRows.length, plansActive: planRows.filter((p) => p.is_active).length };
  })(), { chaptersRead: 0, readingDays: 0, plansTotal: 0, plansActive: 0 });

  // ── Prières ───────────────────────────────────────────────────────
  const prayers = await safe((async () => {
    const [{ count: posted }, { count: answered }] = await Promise.all([
      admin.from("prayer_requests").select("id", { count: "exact", head: true }).eq("user_id", id),
      admin.from("prayer_requests").select("id", { count: "exact", head: true }).eq("user_id", id).eq("is_answered", true),
    ]);
    return { posted: posted ?? 0, answered: answered ?? 0 };
  })(), { posted: 0, answered: 0 });

  // ── Dernière session (IP / appareil) ──────────────────────────────
  const session = await safe((async () => {
    const { data } = await admin.from("member_sessions")
      .select("ip, user_agent, device, browser, created_at")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return (data as { ip: string | null; user_agent: string | null; device: string | null; browser: string | null; created_at: string } | null) ?? null;
  })(), null);

  return NextResponse.json({ donations, formations, bible, prayers, session });
}
