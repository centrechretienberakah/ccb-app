/**
 * POST /api/livekit/webhook
 *
 * Endpoint webhook LiveKit Cloud. Configurer côté LiveKit Dashboard :
 *   Project > Webhooks > New webhook
 *   URL : https://<ton-domaine>/api/livekit/webhook
 *   Events : room_finished, participant_joined, participant_left,
 *            egress_started, egress_ended
 *
 * Sécurité : la signature HMAC est vérifiée via WebhookReceiver avec
 * la même paire API_KEY/SECRET que la génération de tokens.
 *
 * Source de vérité fiable pour le tracking sessions (vs client side
 * qui peut louper un disconnect brutal). Quand un participant ferme
 * son onglet, LiveKit le détecte côté SFU et nous envoie l'event.
 */
import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit non configuré" }, { status: 503 });
  }

  // Verify signature
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  const body = await req.text();
  const authHeader = req.headers.get("authorization") ?? "";
  let event;
  try {
    event = await receiver.receive(body, authHeader);
  } catch (err) {
    console.error("[livekit webhook] invalid signature:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    console.error("[livekit webhook] SUPABASE_SERVICE_ROLE_KEY non configurée");
    return NextResponse.json({ error: "Service role missing" }, { status: 503 });
  }

  const eventType = event.event;
  const roomName = event.room?.name;
  const participantIdentity = event.participant?.identity;

  try {
    switch (eventType) {
      case "room_started": {
        // Une room est créée → si une session DB existe déjà via meet_session_join,
        // on ne fait rien. Sinon le SFU pourrait avoir démarré sans qu'un user
        // l'enregistre côté DB (cas rare, ex. test direct via LiveKit Playground).
        // On laisse passer — la session sera créée au premier participant_joined.
        break;
      }

      case "room_finished": {
        // Source de vérité : ferme proprement la session active de cette room
        if (!roomName) break;
        const { data: sess } = await admin
          .from("meet_sessions")
          .select("id")
          .eq("room_name", roomName)
          .is("ended_at", null)
          .maybeSingle();
        if (sess) {
          await admin.rpc("meet_session_end", { p_session_id: (sess as { id: string }).id });
        }
        break;
      }

      case "participant_joined": {
        // Met à jour participant_count_peak si nécessaire (notre RPC join
        // le fait déjà mais le webhook agit en filet de sécurité pour les
        // joins SDK directs sans passer par notre client).
        if (!roomName) break;
        const { data: sess } = await admin
          .from("meet_sessions")
          .select("id, participant_count_peak")
          .eq("room_name", roomName)
          .is("ended_at", null)
          .maybeSingle();
        if (!sess) break;
        const s = sess as { id: string; participant_count_peak: number };
        // Compte les participants actifs en DB pour ajuster le peak
        const { count } = await admin
          .from("meet_session_participants")
          .select("id", { count: "exact", head: true })
          .eq("session_id", s.id)
          .is("left_at", null);
        const active = count ?? 0;
        if (active > s.participant_count_peak) {
          await admin
            .from("meet_sessions")
            .update({ participant_count_peak: active })
            .eq("id", s.id);
        }
        break;
      }

      case "participant_left": {
        // Filet de sécurité : si le client a manqué le user_leave RPC
        // (tab fermé brutalement), on le ferme côté serveur.
        if (!roomName || !participantIdentity) break;
        const { data: sess } = await admin
          .from("meet_sessions")
          .select("id")
          .eq("room_name", roomName)
          .is("ended_at", null)
          .maybeSingle();
        if (!sess) break;
        const sid = (sess as { id: string }).id;

        // Cherche le participant actif et le ferme
        const { data: part } = await admin
          .from("meet_session_participants")
          .select("id, joined_at")
          .eq("session_id", sid)
          .eq("user_id", participantIdentity)
          .is("left_at", null)
          .maybeSingle();
        if (!part) break;
        const p = part as { id: string; joined_at: string };
        const totalSeconds = Math.floor(
          (Date.now() - new Date(p.joined_at).getTime()) / 1000
        );
        await admin
          .from("meet_session_participants")
          .update({ left_at: new Date().toISOString(), total_seconds: totalSeconds })
          .eq("id", p.id);
        break;
      }

      case "egress_started": {
        // Recording démarré — stocke l'egressId si on veut le couper plus tard
        // Réservé Phase 4.
        break;
      }

      case "egress_ended": {
        // Recording terminé → enregistre l'URL dans la session
        // event.egressInfo.fileResults[0].location
        // Réservé Phase 4.
        break;
      }

      default:
        // Event non géré (track_published, track_unpublished, etc.) → ignore
        break;
    }
  } catch (err) {
    console.error(`[livekit webhook] erreur traitement ${eventType}:`, err);
    // Toujours répondre 200 pour ne pas que LiveKit retry indéfiniment
  }

  return NextResponse.json({ ok: true });
}
