import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";
import { reindexAiKnowledge } from "@/lib/ai/reindex";

export const runtime = "nodejs";
export const maxDuration = 60;

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

// POST /api/admin/ai-knowledge/reindex — (ré)indexe la base documentaire BERAKAH AI
export async function POST() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });
  const result = await reindexAiKnowledge(admin);
  return NextResponse.json({ ok: true, ...result });
}

// GET /api/admin/ai-knowledge/reindex — état de l'index (nombre de documents)
export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ready: false, count: 0 });
  const { count, error } = await admin.from("ai_knowledge").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ready: false, count: 0, error: error.message });
  return NextResponse.json({ ready: true, count: count ?? 0 });
}
