import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs"; // web-push utilise des modules Node

// Configure web-push une seule fois au boot
function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:centrechretienberakah@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function assertModerator() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).single();
  const allowed = ["owner", "admin", "moderator", "leader"];
  if (!roleRow || !allowed.includes(roleRow.role)) {
    return { ok: false as const, status: 403 as const };
  }
  return { ok: true as const, userId: user.id };
}

// Pour l'audience "admins" (ping le staff par un user normal lambda),
// on requiert seulement une session valide.
async function assertAuthenticated() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
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

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
}

// POST /api/notifications/send
// Body : { title, body, url?, audience?: "all" | "admins" | "user_ids" | "group_members", userIds?: string[], groupId?: string }
//
// Audiences :
// - "all"            → tous les abonnés (réservé moderator+)
// - "admins"         → uniquement le staff (owner/admin/leader/moderator) — tout user authentifié
// - "user_ids"       → liste précise (réservé moderator+)
// - "group_members"  → tous les membres du groupe (sauf l'auteur + les mutés)
//                      Accessible à tout membre du groupe (vérifié côté serveur).
//                      Body : { ..., groupId: <uuid>, excludeMuted?: boolean = true }
export async function POST(req: NextRequest) {
  const reqBody = await req.json();
  const { title, body, url, audience, userIds, groupId, excludeMuted, conversationId, type, tag, vibrate, requireInteraction, renotify } = reqBody;
  if (!title || !body) return NextResponse.json({ error: "title et body requis" }, { status: 400 });

  // Audiences accessibles à tout user authentifié (vérif serveur ensuite) :
  // "admins", "group_members", "conversation_members".
  // Sinon ("all" / "user_ids" / défaut) : modérateur+ requis.
  const selfServe = audience === "admins" || audience === "group_members" || audience === "conversation_members";
  const auth = selfServe ? await assertAuthenticated() : await assertModerator();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  if (!configureWebPush()) {
    return NextResponse.json({ error: "VAPID keys non configurées (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)" }, { status: 500 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 500 });
  }

  // Récupère les subscriptions cibles
  let query = admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, enabled, user_id")
    .eq("enabled", true);

  if (audience === "admins") {
    // Récupère les user_ids du staff
    const { data: staffRoles } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["owner", "admin", "leader", "moderator"]);
    const staffIds = (staffRoles ?? []).map((r) => (r as { user_id: string }).user_id);
    if (staffIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "Aucun admin configuré." });
    }
    // Exclut l'auteur de l'action lui-même (évite l'auto-notification)
    const others = staffIds.filter((id) => id !== auth.userId);
    if (others.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "Action déclenchée par le seul admin." });
    }
    query = query.in("user_id", others);
  } else if (audience === "user_ids" && Array.isArray(userIds) && userIds.length > 0) {
    query = query.in("user_id", userIds);
  } else if (audience === "group_members") {
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "groupId requis pour audience=group_members" }, { status: 400 });
    }
    // Vérifie que l'appelant est bien membre du groupe (sécurité)
    const { data: myMembership } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId).eq("user_id", auth.userId).maybeSingle();
    if (!myMembership) {
      return NextResponse.json({ error: "Tu n'es pas membre de ce groupe" }, { status: 403 });
    }
    // Récupère tous les autres membres
    const { data: gmRows } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", auth.userId);
    const memberIds = (gmRows ?? []).map((r) => (r as { user_id: string }).user_id);
    if (memberIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "Pas d'autre membre à notifier.", group_other_members: 0 });
    }
    // Exclut les mutés (best-effort, si table group_user_state existe)
    let targets = memberIds;
    if (excludeMuted !== false) {
      try {
        const { data: muted } = await admin
          .from("group_user_state")
          .select("user_id, muted_until")
          .eq("group_id", groupId)
          .in("user_id", memberIds);
        const nowIso = new Date().toISOString();
        const mutedSet = new Set(
          (muted ?? [])
            .filter((r) => (r as { muted_until: string | null }).muted_until && (r as { muted_until: string }).muted_until > nowIso)
            .map((r) => (r as { user_id: string }).user_id),
        );
        targets = memberIds.filter((id) => !mutedSet.has(id));
      } catch { /* table v39 pas migrée → ignore */ }
    }
    // Compte les subs ENABLED pour ces targets (diagnostic)
    const { count: subsEnabledCount } = await admin
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .in("user_id", targets)
      .eq("enabled", true);
    if (targets.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "Tous les autres membres sont en mute.",
        group_other_members: memberIds.length, group_muted: memberIds.length });
    }
    if ((subsEnabledCount ?? 0) === 0) {
      return NextResponse.json({
        sent: 0, failed: 0,
        message: `Aucun des ${targets.length} membres n'a activé les notifications push.`,
        group_other_members: memberIds.length,
        group_targets: targets.length,
        subs_enabled_count: 0,
        hint: "Demande aux membres d'activer les notifs dans Réglages → Notifications.",
      });
    }
    query = query.in("user_id", targets);
  } else if (audience === "conversation_members") {
    // Notifie les autres membres d'une conversation privée (DM / mini-groupe).
    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json({ error: "conversationId requis pour audience=conversation_members" }, { status: 400 });
    }
    // Vérifie que l'appelant est bien membre de la conversation
    const { data: myMem } = await admin
      .from("conversation_members").select("user_id")
      .eq("conversation_id", conversationId).eq("user_id", auth.userId).maybeSingle();
    if (!myMem) {
      return NextResponse.json({ error: "Tu n'es pas membre de cette conversation" }, { status: 403 });
    }
    const { data: others } = await admin
      .from("conversation_members").select("user_id")
      .eq("conversation_id", conversationId).neq("user_id", auth.userId);
    const targetIds = ((others ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    if (targetIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: "Aucun autre membre." });
    }
    query = query.in("user_id", targetIds);
  }

  const { data: subs, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  const subscriptions = (subs as PushSubscriptionRow[]) || [];

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "Aucune subscription active." });
  }

  const payload = JSON.stringify({
    title, body, url: url || "/dashboard",
    ...(type ? { type } : {}),
    ...(tag ? { tag } : {}),
    ...(vibrate ? { vibrate } : {}),
    ...(typeof requireInteraction === "boolean" ? { requireInteraction } : {}),
    ...(typeof renotify === "boolean" ? { renotify } : {}),
  });

  let sent = 0;
  let failed = 0;
  const invalidEndpoints: string[] = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 60 * 60 } // 1h
      );
      sent++;
    } catch (e) {
      failed++;
      // 404 ou 410 = subscription expirée → désactive
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        invalidEndpoints.push(sub.endpoint);
      }
    }
  }));

  // Nettoie les subscriptions expirées
  if (invalidEndpoints.length > 0) {
    await admin.from("push_subscriptions").update({ enabled: false }).in("endpoint", invalidEndpoints);
  }

  // Met à jour last_used_at sur les subscriptions qui ont reçu
  await admin.from("push_subscriptions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("enabled", true);

  // Log dans admin_logs
  try {
    const sb = await createServerClient();
    await sb.rpc("log_admin_action", {
      p_action: "notification.push",
      p_target_type: "push",
      p_target_id: null,
      p_details: { title, body, sent, failed, audience: audience || "all" },
    });
  } catch { /* noop */ }

  return NextResponse.json({ sent, failed, invalidated: invalidEndpoints.length });
}
