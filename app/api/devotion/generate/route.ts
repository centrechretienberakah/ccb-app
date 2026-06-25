import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { isModerator } from "@/lib/rbac";
import { getCalendarForDate } from "@/lib/devotion/calendar";
import { generateMeditation } from "@/lib/devotion/generate";
import { ensureDevotionInDb, findDevotionId } from "@/lib/devotion/ensure";

export const runtime = "nodejs";

/**
 * POST /api/devotion/generate  (réservé modérateur / admin)
 *
 * Génère la méditation d'une DATE précise à partir du calendrier éditorial
 * (thème + verset du jour) via l'IA, au format actuel.
 *
 * Body : { date: "YYYY-MM-DD", persist?: boolean }
 *  - persist=false (défaut) → PRÉVISUALISATION : renvoie la méditation sans
 *    rien écrire en base.
 *  - persist=true → PUBLIE la méditation pour cette date si elle n'existe pas
 *    encore (ne réécrit jamais une méditation déjà publiée, pour préserver
 *    likes / reçus de lecture).
 *
 * Renvoie : { meditation, calendar, published?, alreadyExists? } ou { error }.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function frenchDate(date: string): string {
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return date;
  }
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!isModerator(roleRow?.role || "member")) {
    return NextResponse.json({ error: "Accès réservé à l'administration" }, { status: 403 });
  }

  let body: { date?: string; persist?: boolean } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const date = (body.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date invalide (format attendu : YYYY-MM-DD)" }, { status: 400 });
  }

  // 1) Contexte calendrier (lecture via session modérateur — RLS OK)
  const cal = await getCalendarForDate(sb, date);
  if (!cal) {
    return NextResponse.json(
      { error: "Aucun thème/verset n'est défini dans le calendrier pour cette date." },
      { status: 404 },
    );
  }

  // 2) Génération IA
  const meditation = await generateMeditation(cal, frenchDate(date));
  if (!meditation) {
    return NextResponse.json(
      { error: "La génération IA a échoué (clé OPENROUTER_API_KEY/OPENAI_API_KEY manquante ou service indisponible)." },
      { status: 503 },
    );
  }

  // 3) Publication optionnelle
  if (body.persist) {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { meditation, calendar: cal, published: false, error: "SUPABASE_SERVICE_ROLE_KEY non configurée — prévisualisation uniquement." },
        { status: 200 },
      );
    }
    const existing = await findDevotionId(admin, date);
    if (existing) {
      return NextResponse.json({ meditation, calendar: cal, published: false, alreadyExists: true, id: existing });
    }
    const result = await ensureDevotionInDb(admin, { date, author: "Rév. Elvis NGUIFFO", ...meditation });
    return NextResponse.json({
      meditation, calendar: cal,
      published: !!result.id, id: result.id ?? null,
      error: result.id ? undefined : result.error,
    });
  }

  return NextResponse.json({ meditation, calendar: cal, published: false });
}
