import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Enregistrement / suppression d'un token push NATIF (FCM) pour l'appareil.
 *
 * POST   { token, platform?, deviceInfo? }  → enregistre (ou rafraîchit).
 * DELETE { token }                          → supprime (déconnexion / opt-out).
 *
 * Réservé à l'utilisateur connecté. L'écriture passe par la RLS « own »
 * (v87) : un membre ne gère que ses propres tokens.
 */
export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { token?: string; platform?: string; deviceInfo?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const token = (body.token || "").trim();
  if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });
  const platform = body.platform === "ios" ? "ios" : "android";

  const { error } = await sb
    .from("native_push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        device_info: (body.deviceInfo || "").slice(0, 200) || null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { token?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const token = (body.token || "").trim();
  if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });

  const { error } = await sb
    .from("native_push_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
