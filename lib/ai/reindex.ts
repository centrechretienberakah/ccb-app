import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Indexeur de la base documentaire BERAKAH AI (RAG CCB).
 * Lit les contenus publics depuis leurs tables d'origine et les upsert dans
 * `ai_knowledge`. Chaque source est isolée dans son propre try/catch : une table
 * ou colonne absente n'empêche jamais l'indexation des autres. Service role.
 */

interface Doc { source: string; source_id: string; title: string; body: string; url: string | null }

const clip = (s: unknown, n: number): string => (typeof s === "string" ? s : "").slice(0, n);
const join = (...parts: Array<unknown>): string =>
  parts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean).join("\n").trim();

export interface ReindexResult { total: number; bySource: Record<string, number>; errors: string[] }

export async function reindexAiKnowledge(admin: SupabaseClient): Promise<ReindexResult> {
  const bySource: Record<string, number> = {};
  const errors: string[] = [];

  const upsert = async (source: string, docs: Doc[]) => {
    if (!docs.length) return;
    const rows = docs.map((d) => ({
      source: d.source,
      source_id: d.source_id,
      title: clip(d.title, 300) || "(sans titre)",
      body: clip(d.body, 6000),
      url: d.url,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from("ai_knowledge").upsert(rows, { onConflict: "source,source_id" });
    if (error) errors.push(`${source}: ${error.message}`);
    else bySource[source] = (bySource[source] || 0) + rows.length;
  };

  // Type souple : les schémas varient, on lit défensivement.
  type Row = Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  // ── Méditons ensemble (devotions) ──
  try {
    const { data } = await admin.from("devotions")
      .select("id, title, verse_reference, verse_text, meditation_p1, meditation_p2, meditation_p3, reflection_question, prayer, declaration")
      .limit(800);
    await upsert("devotion", (data ?? []).map((d: Row) => ({
      source: "devotion", source_id: str(d.id),
      title: `Méditons ensemble — ${str(d.title)}`,
      body: join(d.verse_reference, d.verse_text, d.meditation_p1, d.meditation_p2, d.meditation_p3, d.reflection_question, d.prayer, d.declaration),
      url: "/dashboard",
    })));
  } catch (e) { errors.push("devotion: " + (e as Error).message); }

  // ── Prions ensemble (daily_prayers) ──
  try {
    const { data } = await admin.from("daily_prayers")
      .select("id, title, verse_reference, verse_text, content")
      .limit(800);
    await upsert("prayer", (data ?? []).map((d: Row) => ({
      source: "prayer", source_id: str(d.id),
      title: `Prions ensemble — ${str(d.title)}`,
      body: join(d.verse_reference, d.verse_text, d.content),
      url: "/community/prions-ensemble",
    })));
  } catch (e) { errors.push("prayer: " + (e as Error).message); }

  // ── JESUS DAILY TV (jdtv_videos) ──
  try {
    const { data } = await admin.from("jdtv_videos")
      .select("id, slug, title, subtitle, description, speaker, scripture, transcript_md, is_published")
      .eq("is_published", true).limit(1000);
    await upsert("jdtv", (data ?? []).map((d: Row) => ({
      source: "jdtv", source_id: str(d.id),
      title: `JESUS DAILY — ${str(d.title)}`,
      body: join(d.subtitle, d.description, d.speaker ? `Orateur : ${str(d.speaker)}` : "", d.scripture, d.transcript_md),
      url: d.slug ? `/jesus-daily/video/${str(d.slug)}` : "/jesus-daily",
    })));
  } catch (e) { errors.push("jdtv: " + (e as Error).message); }

  // ── Institut Berakah (institut_lessons) ──
  try {
    const { data } = await admin.from("institut_lessons")
      .select("id, slug, title, description, content_md")
      .limit(1500);
    await upsert("lesson", (data ?? []).map((d: Row) => ({
      source: "lesson", source_id: str(d.id),
      title: `Institut Berakah — ${str(d.title)}`,
      body: join(d.description, d.content_md),
      url: d.slug ? `/institut/lecon/${str(d.slug)}` : "/institut",
    })));
  } catch (e) { errors.push("lesson: " + (e as Error).message); }

  // ── Bibliothèque digitale (media_library) ──
  try {
    const { data } = await admin.from("media_library")
      .select("id, title, description, type, category, is_published")
      .eq("is_published", true).limit(1000);
    await upsert("media", (data ?? []).map((d: Row) => ({
      source: "media", source_id: str(d.id),
      title: `Bibliothèque — ${str(d.title)}`,
      body: join(d.description, d.type, d.category),
      url: "/bibliotheque",
    })));
  } catch (e) { errors.push("media: " + (e as Error).message); }

  // ── Témoignages (testimonies) ──
  try {
    const { data } = await admin.from("testimonies")
      .select("id, title, content, category, is_approved")
      .eq("is_approved", true).limit(800);
    await upsert("testimony", (data ?? []).map((d: Row) => ({
      source: "testimony", source_id: str(d.id),
      title: `Témoignage — ${str(d.title)}`,
      body: join(d.content, d.category),
      url: "/temoignages",
    })));
  } catch (e) { errors.push("testimony: " + (e as Error).message); }

  // ── Événements (events) ──
  try {
    const { data } = await admin.from("events")
      .select("id, title, subtitle, description, location, is_published")
      .eq("is_published", true).limit(500);
    await upsert("event", (data ?? []).map((d: Row) => ({
      source: "event", source_id: str(d.id),
      title: `Événement — ${str(d.title)}`,
      body: join(d.subtitle, d.description, d.location),
      url: "/events",
    })));
  } catch (e) { errors.push("event: " + (e as Error).message); }

  const total = Object.values(bySource).reduce((a, b) => a + b, 0);
  return { total, bySource, errors };
}
