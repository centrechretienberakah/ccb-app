import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

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

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/admin/member/[id]/auth — infos auth réservées admin
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });

  const { id } = await params;
  try {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data?.user) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    const u = data.user;
    return NextResponse.json({
      email: u.email ?? null,
      phone: u.phone ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at || !!u.confirmed_at,
      provider: (u.app_metadata?.provider as string | undefined) ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
