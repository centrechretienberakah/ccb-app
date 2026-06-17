/**
 * POST /api/livekit/active-groups — appels de groupe EN COURS parmi les groupes
 * du membre courant. Sert au CTA « Rejoindre l'appel en cours » sur l'accueil.
 *
 * Source de vérité = occupation réelle des rooms LiveKit `ccb-group-<id>`
 * (et non meet_sessions, fragile : sessions zombies). On ne sonde QUE les
 * groupes dont l'utilisateur est membre → confidentialité respectée.
 *
 * Renvoie : { calls: Array<{ groupId, groupName, count, mode, startedAt }> }
 * Mêmes ENV que /api/livekit/token (LIVEKIT_URL/API_KEY/API_SECRET).
 */
import { NextResponse } from "next/server";
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

export async function POST() {
  // LiveKit non configuré → aucun appel possible.
  const client = svc();
  if (!client) return NextResponse.json({ calls: [] });

  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Groupes dont l'utilisateur est membre
  const { data: gm } = await sb
    .from("group_members").select("group_id").eq("user_id", user.id);
  const groupIds = ((gm ?? []) as Array<{ group_id: string }>).map((r) => r.group_id);
  if (groupIds.length === 0) return NextResponse.json({ calls: [] });

  // Noms des groupes (affichage)
  const nameById = new Map<string, string>();
  try {
    const { data: groups } = await sb.from("groups").select("id, name").in("id", groupIds);
    for (const g of (groups ?? []) as Array<{ id: string; name: string }>) nameById.set(g.id, g.name);
  } catch { /* noop */ }

  const roomNames = groupIds.map((id) => `ccb-group-${id}`);
  try {
    const rooms = await client.listRooms(roomNames);
    const active = rooms.filter((r) => (r.numParticipants ?? 0) > 0);
    if (active.length === 0) return NextResponse.json({ calls: [] });

    const calls = await Promise.all(active.map(async (room) => {
      const groupId = room.name.replace(/^ccb-group-/, "");
      let mode: "audio" | "video" = "video";
      let startedAtMs = room.creationTime ? Number(room.creationTime) * 1000 : Date.now();
      try {
        const ps = await client.listParticipants(room.name);
        for (const p of ps) {
          if (p.metadata) {
            try {
              const m = JSON.parse(p.metadata) as { mode?: unknown };
              if (m?.mode === "audio" || m?.mode === "video") { mode = m.mode; break; }
            } catch { /* métadonnée non-JSON */ }
          }
          const joined = Number(p.joinedAt) * 1000;
          if (joined && joined < startedAtMs) startedAtMs = joined;
        }
      } catch { /* noop */ }
      return {
        groupId,
        groupName: nameById.get(groupId) ?? "Groupe CCB",
        count: room.numParticipants ?? 0,
        mode,
        startedAt: new Date(startedAtMs).toISOString(),
      };
    }));

    return NextResponse.json({ calls });
  } catch {
    // Aucune room côté LiveKit → rien en cours.
    return NextResponse.json({ calls: [] });
  }
}
