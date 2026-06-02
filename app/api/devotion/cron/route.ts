import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getParisDateString, getParisDayIndex, STATIC_DEVOTIONS } from "@/app/devotion/devotions-data";
import { ensureDevotionInDb } from "@/lib/devotion/ensure";

export const runtime = "nodejs";

/**
 * GET /api/devotion/cron
 *
 * Déclenché par le cron Vercel (cf vercel.json) à 00:00 heure de Paris.
 * Pré-enregistre la méditation du jour (date Europe/Paris) dans la table
 * `devotions` pour qu'elle ait un UUID réel dès minuit → like/commentaire
 * fonctionnels instantanément, sans attendre qu'un visiteur déclenche
 * l'enregistrement à la demande.
 *
 * Idempotent : si la méditation du jour existe déjà, renvoie son id.
 *
 * Sécurité : si CRON_SECRET est défini en env, on exige le header
 * Authorization: Bearer <CRON_SECRET> (Vercel l'envoie automatiquement).
 * Sinon (pas de secret configuré), on accepte l'appel — l'endpoint est
 * de toute façon idempotent et sans danger.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  // Vérif secret cron si configuré
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée" },
      { status: 503 },
    );
  }

  const date = getParisDateString();
  const dayIndex = getParisDayIndex();
  const dev = STATIC_DEVOTIONS[dayIndex];

  const result = await ensureDevotionInDb(admin, {
    date,
    title: dev.title,
    verse_ref: dev.verse_ref,
    verse_text: dev.verse_text,
    content: dev.content,
    application: dev.application,
    prayer: dev.prayer,
    declaration: dev.declaration,
    author: dev.author,
  });

  if (result.id) {
    return NextResponse.json({
      ok: true,
      date,
      id: result.id,
      created: result.created,
      title: dev.title,
    });
  }

  console.error("[devotion/cron] échec:", result.attempts);
  return NextResponse.json(
    { ok: false, date, error: result.error, attempts: result.attempts },
    { status: 500 },
  );
}
