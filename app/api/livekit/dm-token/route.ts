/**
 * POST /api/livekit/dm-token
 *
 * Génère un AccessToken LiveKit pour une room d'appel PRIVÉ (DM / mini-groupe).
 * Room : ccb-dm-<conversationId>. Réservé aux membres de la conversation.
 *
 * Body : { conversationId: string; mode?: "audio" | "video" }
 * Renvoie : { token, url, room, identity, displayName }
 *
 * Mêmes ENV que /api/livekit/token (LIVEKIT_URL/API_KEY/API_SECRET).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";

function toWss(url: string): string {
  return url.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://").replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const lkUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!apiKey || !apiSecret || !lkUrl) {
      return NextResponse.json({ error: "LiveKit non configuré" }, { status: 503 });
    }

    let body: { conversationId?: string; mode?: "audio" | "video" } = {};
    try { body = await req.json(); } catch { /* noop */ }
    const { conversationId, mode = "video" } = body;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Vérifie l'appartenance à la conversation (RLS : lisible seulement si membre)
    const { data: membership } = await sb
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Accès refusé à cette conversation" }, { status: 403 });
    }

    // Profil pour le nom affiché
    let displayName = "Membre CCB";
    let avatarUrl: string | null = null;
    try {
      const { data: prof } = await sb
        .from("user_profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle();
      const p = prof as { display_name: string | null; avatar_url: string | null } | null;
      if (p?.display_name) displayName = p.display_name;
      if (p?.avatar_url) avatarUrl = p.avatar_url;
    } catch { /* noop */ }

    // Enregistre l'appel (best-effort) pour l'historique
    try {
      await sb.from("dm_calls").insert({
        conversation_id: conversationId,
        room_id: `ccb-dm-${conversationId}`,
        started_by: user.id,
        mode,
      });
    } catch { /* table v52 pas migrée ou doublon → ignore */ }

    const roomName = `ccb-dm-${conversationId}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
      metadata: JSON.stringify({ avatar_url: avatarUrl, conversation_id: conversationId, mode }),
      ttl: 6 * 60 * 60,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });
    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: toWss(lkUrl),
      room: roomName,
      identity: user.id,
      displayName,
    });
  } catch (e) {
    console.error("[livekit/dm-token] uncaught:", e);
    return NextResponse.json({ error: "Erreur serveur", details: (e as Error).message }, { status: 500 });
  }
}
