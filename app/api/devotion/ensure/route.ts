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

  // 2) Insert. On tente plusieurs formes de payload pour absorber les
  //    variations de schéma entre environnements.
  const basePayload: Record<string, unknown> = {
    devotion_date: date,
    title: body.title,
    verse_reference: body.verse_ref || "",
    verse_text: body.verse_text,
    meditation_p1: body.content || "",
    reflection_question: body.application || null,
    prayer: body.prayer || "",
    declaration: body.declaration || "",
    content: body.content || "",
  };

  // Tentative 1 : avec author
  let ins = await admin
    .from("devotions")
    .insert({ ...basePayload, author: body.author || "Rév. Elvis NGUIFFO" })
    .select("id")
    .single();

  // Tentative 2 : sans author (colonne absente)
  if (ins.error && /author/i.test(ins.error.message)) {
    ins = await admin.from("devotions").insert(basePayload).select("id").single();
  }

  // Tentative 3 : si une colonne pose problème (ex: reflection_question
  // ou content absente), payload minimal
  if (ins.error) {
    const minimalPayload: Record<string, unknown> = {
      devotion_date: date,
      title: body.title,
      verse_reference: body.verse_ref || "",
      verse_text: body.verse_text,
      meditation_p1: body.content || "",
      prayer: body.prayer || "",
      declaration: body.declaration || "",
    };
    ins = await admin.from("devotions").insert(minimalPayload).select("id").single();
  }

  if (ins.error) {
    // Dernière tentative : la course (un autre insert simultané a créé la
    // ligne entre notre SELECT et notre INSERT) → relis par date.
    if (/duplicate key|unique/i.test(ins.error.message)) {
      const { data: raced } = await admin
        .from("devotions")
        .select("id")
        .eq("devotion_date", date)
        .maybeSingle();
      if (raced?.id) {
        return NextResponse.json({ id: raced.id, created: false });
      }
    }
    console.error("[devotion/ensure] insert error:", ins.error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la méditation : " + ins.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: ins.data.id, created: true });
}
