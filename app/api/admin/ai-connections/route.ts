import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { aiConnections } from "@/lib/ai/tools";

export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["owner", "admin"]);

// GET /api/admin/ai-connections — quelles intégrations externes sont configurées
export async function GET() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (roleRow as { role?: string } | null)?.role;
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(aiConnections());
}
