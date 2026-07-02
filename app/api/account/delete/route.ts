import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * POST /api/account/delete
 *
 * Suppression DÉFINITIVE du compte de l'utilisateur connecté (RGPD / exigence
 * Play Store « suppression du compte »). On supprime le compte d'authentification
 * via le service_role : les données liées partent en cascade (la plupart des
 * tables référencent auth.users avec ON DELETE CASCADE / SET NULL).
 *
 * L'utilisateur ne peut supprimer QUE son propre compte (id issu de la session).
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service indisponible" }, { status: 503 });

  const uid = user.id;

  // Nettoyage best-effort des données personnelles / jetons (au cas où certaines
  // tables ne seraient pas en cascade). Silencieux si la table n'existe pas.
  try { await admin.from("native_push_tokens").delete().eq("user_id", uid); } catch { /* noop */ }
  try { await admin.from("push_subscriptions").delete().eq("user_id", uid); } catch { /* noop */ }
  try { await admin.from("user_profiles").delete().eq("user_id", uid); } catch { /* noop */ }

  // Suppression du compte d'authentification (login) — action définitive.
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    return NextResponse.json(
      { error: "La suppression a échoué : " + error.message },
      { status: 500 },
    );
  }

  // Termine la session courante.
  try { await sb.auth.signOut(); } catch { /* noop */ }

  return NextResponse.json({ ok: true });
}
