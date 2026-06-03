import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getParisDateString } from "@/app/devotion/devotions-data";
import { ensureDailyPrayerInDb } from "@/lib/prayer/dailyEnsure";

export const runtime = "nodejs";

/**
 * POST /api/daily-prayer/ensure
 * Garantit que la prière du jour est en base et renvoie son UUID (pour
 * que l'intercession "J'ai prié" fonctionne même sur le fallback statique).
 * Réservé aux utilisateurs authentifiés. Écriture via service_role.
 *
 * Miroir de /api/devotion/ensure.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface Body {
  date?: string; title?: string; verse_ref?: string; verse_text?: string;
  content?: string; author?: string;
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée" },
      { status: 503 },
    );
  }

  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 }); }

  const date = (body.date || getParisDateString()).trim();
  if (!body.title || !body.content) {
    return NextResponse.json({ error: "title et content requis" }, { status: 400 });
  }

  const result = await ensureDailyPrayerInDb(admin, {
    date,
    title: body.title,
    verse_ref: body.verse_ref,
    verse_text: body.verse_text,
    content: body.content,
    author: body.author,
  });

  if (result.id) return NextResponse.json({ id: result.id, created: result.created });

  console.error("[daily-prayer/ensure] échec:", result.attempts);
  return NextResponse.json(
    { error: "Impossible d'enregistrer la prière : " + (result.error ?? "inconnu"), attempts: result.attempts },
    { status: 500 },
  );
}
