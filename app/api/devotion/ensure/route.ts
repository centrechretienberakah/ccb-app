import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getParisDateString } from "@/app/devotion/devotions-data";
import { ensureDevotionInDb } from "@/lib/devotion/ensure";

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

  const date = (body.date || getParisDateString()).trim();
  if (!body.title || !body.verse_text) {
    return NextResponse.json({ error: "title et verse_text requis" }, { status: 400 });
  }

  const result = await ensureDevotionInDb(admin, {
    date,
    title: body.title,
    verse_ref: body.verse_ref,
    verse_text: body.verse_text,
    content: body.content,
    application: body.application,
    prayer: body.prayer,
    declaration: body.declaration,
    author: body.author,
  });

  if (result.id) {
    return NextResponse.json({ id: result.id, created: result.created });
  }

  console.error("[devotion/ensure] échec:", result.attempts);
  return NextResponse.json(
    {
      error: "Impossible d'enregistrer la méditation : " + (result.error ?? "inconnu"),
      attempts: result.attempts,
    },
    { status: 500 },
  );
}
