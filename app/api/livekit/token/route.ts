/**
 * POST /api/livekit/token
 *
 * Génère un AccessToken LiveKit signé pour rejoindre une room CCB Meet.
 *
 * Sécurité :
 *  - Authentification Supabase requise
 *  - Vérification membership pour les rooms de groupe (room = ccb-group-<uuid>)
 *  - Permissions ajustées selon le rôle dans le groupe (owner/admin/leader/member)
 *
 * Body : { groupId: string; mode?: "audio" | "video" }
 * Renvoie : { token: string, url: string, room: string, identity: string, displayName: string }
 *
 * ENV requises (Vercel) :
 *  - LIVEKIT_URL              (ex. https://your-project.livekit.cloud)
 *  - LIVEKIT_API_KEY          (depuis livekit.io > project > Settings > Keys)
 *  - LIVEKIT_API_SECRET
 *  - NEXT_PUBLIC_LIVEKIT_URL  (même valeur que LIVEKIT_URL, pour le client wss://)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

// Convertit https:// → wss:// (LiveKit côté client utilise WSS)
function toWss(url: string): string {
  return url
    .replace(/^http:\/\//i, "ws://")
    .replace(/^https:\/\//i, "wss://")
    .replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey   = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const lkUrl    = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !lkUrl) {
      return NextResponse.json({
        error: "LiveKit non configuré",
        hint: "Définis LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET dans Vercel.",
        env: {
          LIVEKIT_URL: !!process.env.LIVEKIT_URL,
          LIVEKIT_API_KEY: !!apiKey,
          LIVEKIT_API_SECRET: !!apiSecret,
          NEXT_PUBLIC_LIVEKIT_URL: !!process.env.NEXT_PUBLIC_LIVEKIT_URL,
        },
      }, { status: 503 });
    }

    // Sanity check du format des clés (LiveKit API key commence en général par "API")
    if (apiKey.length < 8 || apiSecret.length < 8) {
      return NextResponse.json({
        error: "LIVEKIT_API_KEY ou LIVEKIT_API_SECRET semble invalide (trop court).",
      }, { status: 503 });
    }

    let body: { groupId?: string; mode?: "audio" | "video" } = {};
    try { body = await req.json(); } catch { /* noop */ }
    const { groupId, mode = "video" } = body;
    if (!groupId) {
      return NextResponse.json({ error: "groupId requis" }, { status: 400 });
    }

    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ─── Vérifie l'accès au groupe ───────────────────────────────────
    const { data: groupData, error: gErr } = await sb
      .from("groups")
      .select("id, name, type")
      .eq("id", groupId)
      .maybeSingle();
    if (gErr) {
      console.error("[livekit/token] fetch groups error:", gErr);
      return NextResponse.json({ error: "Erreur DB: " + gErr.message }, { status: 500 });
    }
    if (!groupData) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }
    const group = groupData as { id: string; name: string; type: "public" | "private" };

    // Membership + role dans le groupe
    let isMember = false;
    let myRole: "owner" | "admin" | "member" | null = null;
    try {
      const { data: gm } = await sb
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (gm) {
        isMember = true;
        myRole = (gm as { role: "owner" | "admin" | "member" }).role;
      }
    } catch (e) {
      console.warn("[livekit/token] fetch group_members:", e);
    }

    // Staff global
    let isStaff = false;
    try {
      const { data: roleRow } = await sb
        .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const role = (roleRow as { role: string } | null)?.role;
      if (role && ["owner", "admin", "leader", "moderator"].includes(role)) isStaff = true;
    } catch (e) {
      console.warn("[livekit/token] fetch user_roles:", e);
    }

    if (group.type === "private" && !isMember && !isStaff) {
      return NextResponse.json({ error: "Accès refusé à ce groupe privé" }, { status: 403 });
    }

    // ─── Profil ──────────────────────────────────────────────────────
    let displayName = "Membre CCB";
    let avatarUrl: string | null = null;
    try {
      const { data: prof } = await sb
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const p = prof as { display_name: string | null; avatar_url: string | null } | null;
      if (p?.display_name) displayName = p.display_name;
      if (p?.avatar_url) avatarUrl = p.avatar_url;
    } catch (e) {
      console.warn("[livekit/token] fetch user_profiles:", e);
    }

    const isGroupAdmin = myRole === "owner" || myRole === "admin" || isStaff;

    // ─── Génération du token JWT ─────────────────────────────────────
    const roomName = `ccb-group-${group.id}`;
    let token: string;
    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: user.id,
        name: displayName,
        metadata: JSON.stringify({
          avatar_url: avatarUrl,
          role: myRole ?? (isStaff ? "staff" : "guest"),
          group_id: group.id,
          group_name: group.name,
          mode,
        }),
        ttl: 6 * 60 * 60, // 6h
      });
      // Grants — on n'utilise PAS canPublishSources (différences de schéma
      // entre versions SDK). Le mode audio-only est enforcé côté client
      // (video: false dans LiveKitRoom). Pour un enforcement strict
      // server-side, on passera par un updateParticipant après join.
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        roomAdmin: isGroupAdmin,
      });
      token = await at.toJwt();
    } catch (e) {
      console.error("[livekit/token] AccessToken error:", e);
      return NextResponse.json({
        error: "Erreur génération token LiveKit",
        details: (e as Error).message,
      }, { status: 500 });
    }

    return NextResponse.json({
      token,
      url: toWss(lkUrl),
      room: roomName,
      identity: user.id,
      displayName,
    });
  } catch (e) {
    console.error("[livekit/token] uncaught:", e);
    return NextResponse.json({
      error: "Erreur serveur",
      details: (e as Error).message,
    }, { status: 500 });
  }
}
