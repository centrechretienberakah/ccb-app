import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

// Vérifie que l'appelant est admin (cookie session).
async function assertAdmin() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, status: 401 as const };
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).single();
  if (roleRow?.role !== "admin") return { ok: false, status: 403 as const };
  return { ok: true as const, userId: user.id };
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// POST /api/admin/users — invite un nouvel utilisateur par email
export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 500 });

  const { email, display_name } = await req.json();
  if (!email) return NextResponse.json({ error: "email requis" }, { status: 400 });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { display_name },
    redirectTo: `${req.nextUrl.origin}/auth/callback`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user });
}
