import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sendCallInvite } from "@/lib/native/callInvite";

export const runtime = "nodejs";

/**
 * POST /api/native/call-invite
 *
 * Déclenche l'écran d'appel NATIF (plein format) sur les appareils du/des
 * destinataire(s), via un message FCM data-only haute priorité.
 * Appelé par l'appelant au moment où il lance l'appel (en plus de la
 * signalisation Realtime + web-push existantes).
 *
 * Body : { type: "audio"|"video", conversationId?, groupId?, groupName?, callId? }
 * L'appelant (nom + avatar) est déduit de la session.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { type?: "audio" | "video"; conversationId?: string; groupId?: string; groupName?: string; callId?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const type = body.type === "video" ? "video" : "audio";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  const groupId = typeof body.groupId === "string" ? body.groupId : null;
  if (!conversationId && !groupId) {
    return NextResponse.json({ error: "conversationId ou groupId requis" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "service indisponible" }, { status: 503 });

  // Destinataires (hors appelant)
  let calleeUserIds: string[] = [];
  try {
    if (groupId) {
      const { data } = await admin.from("group_members").select("user_id").eq("group_id", groupId).neq("user_id", user.id);
      let ids = ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
      try {
        const { data: muted } = await admin.from("group_user_state").select("user_id, muted_until").eq("group_id", groupId).in("user_id", ids);
        const nowIso = new Date().toISOString();
        const mset = new Set(((muted ?? []) as Array<{ user_id: string; muted_until: string | null }>)
          .filter((m) => m.muted_until && m.muted_until > nowIso).map((m) => m.user_id));
        ids = ids.filter((id) => !mset.has(id));
      } catch { /* table absente */ }
      calleeUserIds = ids;
    } else if (conversationId) {
      // Vérifie l'appartenance de l'appelant + récupère les autres membres
      const { data: mine } = await admin.from("conversation_members").select("user_id").eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!mine) return NextResponse.json({ error: "Pas membre de la conversation" }, { status: 403 });
      const { data } = await admin.from("conversation_members").select("user_id").eq("conversation_id", conversationId).neq("user_id", user.id);
      calleeUserIds = ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
    }
  } catch { /* best-effort */ }
  if (calleeUserIds.length === 0) return NextResponse.json({ sent: 0, failed: 0, reason: "aucun destinataire" });

  // Appelant : nom + avatar
  let callerName = user.email?.split("@")[0] || "Un membre";
  let callerAvatar: string | null = null;
  try {
    const { data: prof } = await admin.from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle();
    const p = prof as { display_name: string | null; avatar_url: string | null } | null;
    if (p?.display_name) callerName = p.display_name;
    callerAvatar = p?.avatar_url ?? null;
  } catch { /* noop */ }

  // URL de la salle (identique à la logique de pushCallNotification)
  const roomUrl = groupId
    ? `/community/groups/${groupId}/meeting${type === "audio" ? "?mode=audio&join=1" : "?join=1"}`
    : `/community/messages/${conversationId}/call?mode=${type}&join=1`;

  const callId = (body.callId && String(body.callId)) || `${groupId || conversationId}-${Date.now()}`;

  const res = await sendCallInvite(admin, calleeUserIds, {
    callId, callType: type, callerName, callerAvatar, roomUrl,
    groupName: body.groupName || null,
  });

  return NextResponse.json(res);
}
