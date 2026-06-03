/**
 * POST /api/livekit/record — démarre/arrête l'enregistrement d'une réunion.
 *
 * Réservé OWNER / ADMIN / LEADER / MODERATOR.
 * Body : { roomName, action: "start" | "stop", egressId? }
 *
 * Utilise LiveKit Egress (Room Composite) vers un stockage S3. Si le stockage
 * n'est pas configuré (variables LIVEKIT_S3_*), renvoie 503 avec un message
 * clair — aucune autre fonctionnalité n'est impactée.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";

export const runtime = "nodejs";

const MOD_ROLES = new Set(["owner", "admin", "leader", "moderator"]);

async function assertMod() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (!role || !MOD_ROLES.has(role)) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

function egressClient(): EgressClient | null {
  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  return new EgressClient(url, key, secret);
}

function s3Config() {
  const bucket = process.env.LIVEKIT_S3_BUCKET ?? process.env.AWS_S3_BUCKET;
  const accessKey = process.env.LIVEKIT_S3_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.LIVEKIT_S3_SECRET ?? process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.LIVEKIT_S3_REGION ?? process.env.AWS_REGION ?? "auto";
  const endpoint = process.env.LIVEKIT_S3_ENDPOINT;
  if (!bucket || !accessKey || !secretKey) return null;
  return { bucket, accessKey, secretKey, region, endpoint };
}

export async function POST(req: NextRequest) {
  const auth = await assertMod();
  if (!auth.ok) return NextResponse.json({ error: "Non autorisé" }, { status: auth.status });

  const egress = egressClient();
  if (!egress) return NextResponse.json({ error: "LiveKit non configuré" }, { status: 503 });

  let body: { roomName?: string; action?: string; egressId?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const { roomName, action, egressId } = body;

  try {
    if (action === "stop") {
      if (!egressId) return NextResponse.json({ error: "egressId requis" }, { status: 400 });
      await egress.stopEgress(egressId);
      return NextResponse.json({ ok: true });
    }
    if (action === "start") {
      if (!roomName) return NextResponse.json({ error: "roomName requis" }, { status: 400 });
      const s3 = s3Config();
      if (!s3) {
        return NextResponse.json({
          error: "Enregistrement non configuré : ajoutez LIVEKIT_S3_BUCKET / LIVEKIT_S3_ACCESS_KEY / LIVEKIT_S3_SECRET (+ région/endpoint).",
        }, { status: 503 });
      }
      const output = new EncodedFileOutput({
        filepath: `ccb-meet/${roomName}-${Date.now()}.mp4`,
        output: {
          case: "s3",
          value: new S3Upload({
            accessKey: s3.accessKey,
            secret: s3.secretKey,
            bucket: s3.bucket,
            region: s3.region,
            ...(s3.endpoint ? { endpoint: s3.endpoint } : {}),
          }),
        },
      });
      const info = await egress.startRoomCompositeEgress(roomName, output);
      return NextResponse.json({ ok: true, egressId: info.egressId });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
