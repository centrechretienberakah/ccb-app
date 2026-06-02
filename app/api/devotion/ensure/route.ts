import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * POST /api/devotion/ensure
 *
 * Garantit qu'une méditation existe en base et renvoie son UUID réel.
 * Utilisé quand la méditation affichée vient du fallback statique
 * (id: null) → sans ID en base, impossible de liker/commenter.
 *
 * Body : { date, title, verse_ref, verse_text, content, application,
 *          prayer, declaration, author? }
 *
 * Réservé aux utilisateurs authentifiés (un membre qui veut liker).
 * L'écriture dans `devotions` se fait via service_role (la table est
 * en lecture publique mais écriture admin-only en RLS).
 *
 * Renvoie : { id } ou { error } détaillé.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface EnsureBody {
  date?: string;
  title?: string;
  verse_ref?: string;
  verse_text?: string;
  content?: string;
  application?: string;
  prayer?: string;
  declaration?: string;
  author?: string;
}

export async function POST(req: NextRequest) {
  // Auth : utilisateur connecté requis
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configurée — impossible d'enregistrer la méditation." },
      { status: 503 },
    );
  }

  let body: EnsureBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const date = (body.date || new Date().toISOString().split("T")[0]).trim();
  if (!body.title || !body.verse_text) {
    return NextResponse.json({ error: "title et verse_text requis" }, { status: 400 });
  }

  // 1) Existe déjà ? (par devotion_date puis date)
  try {
    const { data: existing } = await admin
      .from("devotions")
      .select("id")
      .eq("devotion_date", date)
      .maybeSingle();
    if (existing?.id) {
      return NextResponse.json({ id: existing.id, created: false });
    }
  } catch { /* la colonne devotion_date peut ne pas exister → on tente date */ }

  try {
    const { data: existing2 } = await admin
      .from("devotions")
      .select("id")
      .eq("date", date)
      .maybeSingle();
    if (existing2?.id) {
      return NextResponse.json({ id: existing2.id, created: false });
    }
  } catch { /* noop */ }

  // 2) Insert ADAPTATIF : on part d'un payload complet et on retire
  //    dynamiquement toute colonne que PostgREST signale comme inexistante
  //    (erreur PGRST204 "Could not find the 'X' column"). Ça absorbe
  //    n'importe quelle variation de schéma entre environnements.
  const payload: Record<string, unknown> = {
    devotion_date: date,
    date: date, // certains schémas utilisent `date` au lieu de devotion_date
    title: body.title,
    verse_reference: body.verse_ref || "",
    verse_ref: body.verse_ref || "", // alias possible
    verse_text: body.verse_text,
    meditation_p1: body.content || "",
    reflection_question: body.application || null,
    application: body.application || null, // alias possible
    prayer: body.prayer || "",
    declaration: body.declaration || "",
    content: body.content || "",
    author: body.author || "Rév. Elvis NGUIFFO",
  };

  const attempts: string[] = [];
  let lastErr = "";

  for (let i = 0; i < 12; i++) {
    const ins = await admin.from("devotions").insert(payload).select("id").single();
    if (!ins.error && ins.data?.id) {
      return NextResponse.json({ id: ins.data.id, created: true });
    }
    lastErr = ins.error?.message ?? "unknown";
    attempts.push(lastErr);

    // a) Colonne inexistante → on l'enlève du payload et on réessaie
    //    Message PostgREST : "Could not find the 'content' column of 'devotions' ..."
    const colMatch = lastErr.match(/Could not find the '([^']+)' column/i)
      ?? lastErr.match(/column "([^"]+)" of relation/i)
      ?? lastErr.match(/'([a-z_]+)' column/i);
    if (colMatch && colMatch[1] && colMatch[1] in payload) {
      delete payload[colMatch[1]];
      continue;
    }

    // b) Contrainte NOT NULL sur une colonne qu'on n'envoie pas → on tente
    //    de la remplir avec une valeur par défaut
    const nullMatch = lastErr.match(/null value in column "([^"]+)"/i);
    if (nullMatch && nullMatch[1] && !(nullMatch[1] in payload)) {
      payload[nullMatch[1]] = body.content || body.title || "—";
      continue;
    }

    // c) Course : un insert simultané a déjà créé la ligne → relis
    if (/duplicate key|unique/i.test(lastErr)) {
      const { data: raced } = await admin
        .from("devotions").select("id").eq("devotion_date", date).maybeSingle();
      if (raced?.id) return NextResponse.json({ id: raced.id, created: false });
      const { data: raced2 } = await admin
        .from("devotions").select("id").eq("date", date).maybeSingle();
      if (raced2?.id) return NextResponse.json({ id: raced2.id, created: false });
    }

    // d) Erreur non gérée → on arrête la boucle
    break;
  }

  console.error("[devotion/ensure] échec après tentatives:", attempts);
  return NextResponse.json(
    {
      error: "Impossible d'enregistrer la méditation : " + lastErr,
      attempts, // détail de chaque tentative pour diagnostic
    },
    { status: 500 },
  );
}
