/**
 * POST /api/livekit/active — état RÉEL d'un appel de groupe (source de vérité).
 *
 * Interroge directement LiveKit (occupation de la room ccb-group-<id>) plutôt
 * que la table meet_sessions (fragile : sessions zombies, heartbeats, vue).
 * Sert à afficher le bandeau « Appel en cours · Rejoindre » dans le groupe.
 *
 * Body : { groupId: string }
 * Renvoie : { active: boolean, count: number, mode?: "audio"|"video", startedAt?: string }
 *
 * Confidentialité : seul un membre du groupe (ou groupe public, ou staff) peut
 * sonder l'occupation — on ne révèle pas l'activité d'un groupe privé.
 * Mêmes ENV que /api/livekit/token (LIVEKIT_URL/API_KEY/API_SECRET).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { RoomServiceClient } from "livekit-server-sdk";

export const runtime = "nodejs";

function svc(): RoomServiceClient | null {
  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  return new RoomServiceClient(url, key, secret);
}

export async function POST(req: NextRequest) {
  // LiveKit non configuré → pas d'appel possible, donc pas de bandeau.
  const client = svc();
  if (!client) return NextResponse.json({ active: false, count: 0, reason: "not-configured" });

  let body: { groupId?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { groupId } = body;
  if (!groupId) return NextResponse.json({ error: "groupId requis" }, { status: 400 });

  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ─── Confidentialité : membre OU groupe public OU staff ───────────────
  try {
    const { data: gm } = await sb
      .from("group_members").select("user_id")
      .eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
    if (!gm) {
      const { data: g } = await sb.from("groups").select("type").eq("id", groupId).maybeSingle();
      const isPublic = (g as { type?: string } | null)?.type === "public";
      if (!isPublic) {
        const { data: r } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        const role = (r as { role?: string } | null)?.role ?? "";
        if (!["owner", "admin", "leader", "moderator"].includes(role)) {
          return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
      }
    }
  } catch {
    return NextResponse.json({ active: false, count: 0 });
  }

  // ─── Occupation réelle de la room LiveKit ─────────────────────────────
  const roomName = `ccb-group-${groupId}`;
  try {
    const participants = await client.listParticipants(roomName);
    const count = participants.length;
    if (count === 0) return NextResponse.json({ active: false, count: 0 });

    let mode: "audio" | "video" = "video";
    let startedAt = Date.now();
    let modeFound = false;
    for (const p of participants) {
      if (!modeFound && p.metadata) {
        try {
          const m = JSON.parse(p.metadata) as { mode?: unknown };
          if (m?.mode === "audio" || m?.mode === "video") { mode = m.mode; modeFound = true; }
        } catch { /* métadonnée non-JSON → ignore */ }
      }
      const joined = Number(p.joinedAt) * 1000;
      if (joined && joined < startedAt) startedAt = joined;
    }
    return NextResponse.json({
      active: true,
      count,
      mode,
      startedAt: new Date(startedAt).toISOString(),
    });
  } catch {
    // Room inexistante côté LiveKit → aucun appel en cours.
    return NextResponse.json({ active: false, count: 0 });
  }
}
