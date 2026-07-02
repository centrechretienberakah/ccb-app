import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { isModerator } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * GET /api/devotion/notif-reach  (réservé modérateur / admin)
 *
 * Portée des notifications : combien de membres sont JOIGNABLES par push
 * (web-push et/ou push natif app), et combien n'ont activé aucun canal.
 * Sert d'indicateur admin pour relancer ceux qui n'ont pas activé.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!isModerator(roleRow?.role || "member")) {
    return NextResponse.json({ error: "Accès réservé à l'administration" }, { status: 403 });
  }
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 503 });

  // Total membres (profils).
  let total = 0;
  try {
    const { count } = await admin.from("user_profiles").select("user_id", { count: "exact", head: true });
    total = count ?? 0;
  } catch { /* noop */ }

  // Abonnés web-push (activés, distincts).
  const webSet = new Set<string>();
  try {
    const { data } = await admin.from("push_subscriptions").select("user_id").eq("enabled", true);
    for (const r of (data ?? []) as Array<{ user_id: string }>) webSet.add(r.user_id);
  } catch { /* noop */ }

  // Appareils natifs (app), distincts.
  const nativeSet = new Set<string>();
  try {
    const { data } = await admin.from("native_push_tokens").select("user_id");
    for (const r of (data ?? []) as Array<{ user_id: string }>) nativeSet.add(r.user_id);
  } catch { /* table absente (v87 non migrée) */ }

  const union = new Set<string>([...webSet, ...nativeSet]);
  let both = 0;
  union.forEach((id) => { if (webSet.has(id) && nativeSet.has(id)) both++; });

  const reachable = union.size;
  const totalSafe = Math.max(total, reachable);

  return NextResponse.json({
    total: totalSafe,
    reachable,
    web: webSet.size,
    app: nativeSet.size,
    both,
    none: Math.max(0, totalSafe - reachable),
  });
}
