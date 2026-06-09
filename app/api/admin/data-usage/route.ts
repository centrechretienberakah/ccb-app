import { NextResponse } from "next/server";
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

const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// GET /api/admin/data-usage — agrégat de l'usage data (30 derniers jours)
export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });

  const since = dayStr(Date.now() - 29 * 86400000);
  const { data, error } = await admin
    .from("data_usage")
    .select("user_id, day, network_bytes, cached_bytes, data_saver")
    .gte("day", since);

  // Table absente (migration v62 pas encore appliquée) → réponse vide gracieuse.
  if (error) {
    return NextResponse.json({
      ready: false, error: error.message,
      totals: { network: 0, cached: 0 }, last7: { network: 0, cached: 0 }, today: { network: 0, cached: 0 },
      adoption: { total: 0, saverOn: 0 }, series: [], top: [],
    });
  }

  const rows = (data ?? []) as Array<{ user_id: string; day: string; network_bytes: number; cached_bytes: number; data_saver: boolean | null }>;

  const today = dayStr(Date.now());
  const since7 = dayStr(Date.now() - 6 * 86400000);

  let netTotal = 0, cachedTotal = 0, net7 = 0, cached7 = 0, netToday = 0, cachedToday = 0;
  const byUser: Record<string, { network: number; cached: number }> = {};
  const byDay: Record<string, { network: number; cached: number }> = {};
  const allUsers = new Set<string>();
  const saverOnUsers = new Set<string>();

  for (const r of rows) {
    const n = Number(r.network_bytes) || 0;
    const c = Number(r.cached_bytes) || 0;
    netTotal += n; cachedTotal += c;
    if (r.day >= since7) { net7 += n; cached7 += c; }
    if (r.day === today) { netToday += n; cachedToday += c; }
    (byUser[r.user_id] ??= { network: 0, cached: 0 }).network += n;
    byUser[r.user_id].cached += c;
    (byDay[r.day] ??= { network: 0, cached: 0 }).network += n;
    byDay[r.day].cached += c;
    allUsers.add(r.user_id);
    if (r.data_saver === true) saverOnUsers.add(r.user_id);
  }

  // Série 14 jours (pour le mini-graphe)
  const series: Array<{ day: string; network: number; cached: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = dayStr(Date.now() - i * 86400000);
    series.push({ day: d, network: byDay[d]?.network ?? 0, cached: byDay[d]?.cached ?? 0 });
  }

  // Top 10 consommateurs (+ noms)
  const topIds = Object.entries(byUser).sort((a, b) => b[1].network - a[1].network).slice(0, 10).map(([id]) => id);
  const names: Record<string, string> = {};
  if (topIds.length) {
    const { data: profs } = await admin.from("user_profiles").select("user_id, full_name, display_name").in("user_id", topIds);
    for (const p of (profs ?? []) as Array<{ user_id: string; full_name: string | null; display_name: string | null }>) {
      names[p.user_id] = p.full_name || p.display_name || "Membre";
    }
  }
  const top = topIds.map((id) => ({ id, name: names[id] || "Membre", network: byUser[id].network, cached: byUser[id].cached }));

  return NextResponse.json({
    ready: true,
    totals: { network: netTotal, cached: cachedTotal },
    last7: { network: net7, cached: cached7 },
    today: { network: netToday, cached: cachedToday },
    adoption: { total: allUsers.size, saverOn: saverOnUsers.size },
    series, top,
  });
}
