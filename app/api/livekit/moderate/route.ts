/**
 * POST /api/livekit/moderate — modération d'une réunion CCB Meet.
 *
 * Réservé OWNER / ADMIN / LEADER / MODERATOR (rôle vérifié côté serveur).
 * Body : { roomName, targetIdentity, action: "mute-mic" | "mute-cam" | "remove" }
 *
 * N'altère rien de l'existant : route serveur autonome utilisant les mêmes
 * variables LIVEKIT_* que /api/livekit/token.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { RoomServiceClient, TrackSource } from "livekit-server-sdk";

export const runtime = "nodejs";

const MOD_ROLES = new Set(["owner", "admin", "leader", "moderator"]);

async function assertMod() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (!role || !MOD_ROLES.has(role)) return { ok: false as const, status: 403 as const };
  return { ok: true as const, userId: user.id };
}

function svc(): RoomServiceClient | null {
  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  return new RoomServiceClient(url, key, secret);
}

export async function POST(req: NextRequest) {
  const auth = await assertMod();
  if (!auth.ok) return NextResponse.json({ error: "Non autorisé" }, { status: auth.status });

  const client = svc();
  if (!client) return NextResponse.json({ error: "LiveKit non configuré" }, { status: 503 });

  let body: { roomName?: string; targetIdentity?: string; action?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { roomName, targetIdentity, action } = body;
  if (!roomName || !targetIdentity || !action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  try {
    if (action === "remove") {
      await client.removeParticipant(roomName, targetIdentity);
      return NextResponse.json({ ok: true });
    }
    if (action === "mute-mic" || action === "mute-cam") {
      const p = await client.getParticipant(roomName, targetIdentity);
      const wantSource = action === "mute-mic" ? TrackSource.MICROPHONE : TrackSource.CAMERA;
      const track = (p.tracks ?? []).find((t) => t.source === wantSource && !t.muted);
      if (!track) return NextResponse.json({ ok: true, note: "déjà coupé ou absent" });
      await client.mutePublishedTrack(roomName, targetIdentity, track.sid, true);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
