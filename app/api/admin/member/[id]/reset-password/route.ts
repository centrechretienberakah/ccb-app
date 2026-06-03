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

// POST /api/admin/member/[id]/reset-password
// Envoie un email de réinitialisation au membre (vers /auth/reset-password).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });

  const { id } = await params;
  const admin = createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data?.user?.email) return NextResponse.json({ error: "Email introuvable" }, { status: 404 });
    const email = data.user.email;

    const anon = createSupabaseAdmin(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: rpErr } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.nextUrl.origin}/auth/reset-password`,
    });
    if (rpErr) return NextResponse.json({ error: rpErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, email });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
