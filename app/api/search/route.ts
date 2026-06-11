import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SearchResult {
  type: string;
  label: string;
  icon: string;
  title: string;
  subtitle?: string;
  href: string;
}

// GET /api/search?q=... — recherche globale multi-contenus (RLS appliquée).
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") || "").trim();
  // Nettoie les caractères qui cassent les filtres PostgREST (.or, %, (), virgules).
  const safe = raw.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
  if (safe.length < 2) return NextResponse.json({ results: [] });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ results: [] });

  const like = `%${safe}%`;
  const grab = async <T,>(p: PromiseLike<{ data: T | null }>, fb: T): Promise<T> => {
    try { const r = await p; return (r.data ?? fb); } catch { return fb; }
  };
  type Row = Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  const [posts, profiles, jdtv, lessons, media, events, devos, prayers, testis] = await Promise.all([
    grab(sb.from("posts").select("id, title, content").or(`title.ilike.${like},content.ilike.${like}`).limit(5), [] as Row[]),
    grab(sb.from("user_profiles").select("user_id, display_name, full_name").or(`display_name.ilike.${like},full_name.ilike.${like}`).limit(6), [] as Row[]),
    grab(sb.from("jdtv_videos").select("slug, title, subtitle").eq("is_published", true).or(`title.ilike.${like},subtitle.ilike.${like},description.ilike.${like}`).limit(5), [] as Row[]),
    grab(sb.from("institut_lessons").select("slug, title, description").or(`title.ilike.${like},description.ilike.${like}`).limit(5), [] as Row[]),
    grab(sb.from("media_library").select("id, title, type").or(`title.ilike.${like},description.ilike.${like}`).limit(5), [] as Row[]),
    grab(sb.from("events").select("id, title").or(`title.ilike.${like},description.ilike.${like}`).limit(5), [] as Row[]),
    grab(sb.from("devotions").select("id, title, verse_reference").or(`title.ilike.${like},verse_reference.ilike.${like}`).limit(4), [] as Row[]),
    grab(sb.from("daily_prayers").select("id, title").ilike("title", like).limit(4), [] as Row[]),
    grab(sb.from("testimonies").select("id, title, content").or(`title.ilike.${like},content.ilike.${like}`).limit(4), [] as Row[]),
  ]);

  const results: SearchResult[] = [];
  for (const p of profiles) results.push({ type: "member", label: "Membre", icon: "👤", title: s(p.display_name) || s(p.full_name) || "Membre", href: `/community/profil/${s(p.user_id)}` });
  for (const v of jdtv) results.push({ type: "jdtv", label: "JESUS DAILY", icon: "📺", title: s(v.title), subtitle: s(v.subtitle) || undefined, href: v.slug ? `/jesus-daily/video/${s(v.slug)}` : "/jesus-daily" });
  for (const l of lessons) results.push({ type: "lesson", label: "Institut", icon: "🎓", title: s(l.title), href: l.slug ? `/institut/lecon/${s(l.slug)}` : "/institut" });
  for (const m of media) results.push({ type: "media", label: "Bibliothèque", icon: "📚", title: s(m.title), subtitle: s(m.type) || undefined, href: "/bibliotheque" });
  for (const e of events) results.push({ type: "event", label: "Événement", icon: "📅", title: s(e.title), href: "/events" });
  for (const d of devos) results.push({ type: "devotion", label: "Méditons", icon: "📖", title: s(d.title), subtitle: s(d.verse_reference) || undefined, href: "/dashboard" });
  for (const pr of prayers) results.push({ type: "prayer", label: "Prions", icon: "🙏", title: s(pr.title), href: "/community/prions-ensemble" });
  for (const t of testis) results.push({ type: "testimony", label: "Témoignage", icon: "✨", title: s(t.title) || "Témoignage", href: "/temoignages" });
  for (const p of posts) results.push({ type: "post", label: "Communauté", icon: "💬", title: (s(p.title) || s(p.content) || "Publication").slice(0, 90), href: `/community#post-${s(p.id)}` });

  return NextResponse.json({ results: results.slice(0, 40), query: safe });
}
