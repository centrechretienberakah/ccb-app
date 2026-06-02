import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import DevotionClient from "./DevotionClient";
import { getDailyDevotion, getParisDateString } from "./devotions-data";

// Admin client (service_role) pour auto-insert si absent. Utilisé en lecture
// seule pour bootstrap la méditation du jour.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Méditons ensemble — CCB" };

interface DevotionRow {
  id: string;
  devotion_date?: string;
  date?: string;
  title: string;
  verse_reference?: string;
  verse_ref?: string;
  verse_text: string;
  meditation_p1?: string | null;
  meditation_p2?: string | null;
  meditation_p3?: string | null;
  reflection_question?: string | null;
  content?: string | null;
  application?: string | null;
  prayer?: string | null;
  declaration?: string | null;
  author?: string | null;
}

interface UnifiedDevotion {
  id: string | null;
  date: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  application: string;
  prayer: string;
  declaration: string;
}

function normalize(d: DevotionRow | null): UnifiedDevotion | null {
  if (!d) return null;
  const dateStr = d.devotion_date || d.date || new Date().toISOString().split("T")[0];
  const meditationParts = [d.meditation_p1, d.meditation_p2, d.meditation_p3].filter(Boolean) as string[];
  const content = meditationParts.length > 0 ? meditationParts.join("\n\n") : (d.content || "");
  return {
    id: d.id,
    date: dateStr,
    title: d.title,
    verse_ref: d.verse_reference || d.verse_ref || "",
    verse_text: d.verse_text,
    content,
    application: d.application || d.reflection_question || "",
    prayer: d.prayer || "",
    declaration: d.declaration || "",
  };
}

export default async function DevotionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Date du jour en fuseau Europe/Paris → la méditation bascule à 00:00 Paris
  const today = getParisDateString();

  // Today's devotion : tente DB sur `date` puis `devotion_date`
  let todayDevotion: UnifiedDevotion | null = null;
  try {
    const { data: byDate } = await supabase
      .from("devotions").select("*").eq("date", today).maybeSingle();
    if (byDate) todayDevotion = normalize(byDate as DevotionRow);
    if (!todayDevotion) {
      const { data: byDevDate } = await supabase
        .from("devotions").select("*").eq("devotion_date", today).maybeSingle();
      if (byDevDate) todayDevotion = normalize(byDevDate as DevotionRow);
    }
  } catch { /* table absente, fallback static */ }

  if (!todayDevotion) {
    const fallback = getDailyDevotion();
    // Tentative d'insert auto via service_role pour qu'on ait un ID réel
    // (sinon like/comment impossibles). Échec silencieux si SR non configuré.
    const admin = getServiceClient();
    if (admin) {
      const insertPayload: Record<string, unknown> = {
        devotion_date: today,
        title: fallback.title,
        verse_reference: fallback.verse_ref,
        verse_text: fallback.verse_text,
        meditation_p1: fallback.content,
        prayer: fallback.prayer,
        declaration: fallback.declaration,
      };
      // Tente avec author si la colonne existe, sinon retry sans
      let r = await admin.from("devotions").insert({ ...insertPayload, author: fallback.author }).select().single();
      if (r.error && /author/i.test(r.error.message)) {
        r = await admin.from("devotions").insert(insertPayload).select().single();
      }
      if (!r.error && r.data) {
        todayDevotion = normalize(r.data as DevotionRow);
      }
    }
    // Fallback ultime : utilise le statique sans ID (like/comment KO mais affichage OK)
    if (!todayDevotion) {
      todayDevotion = {
        id: fallback.id,
        date: today,
        title: fallback.title,
        verse_ref: fallback.verse_ref,
        verse_text: fallback.verse_text,
        content: fallback.content,
        application: fallback.application,
        prayer: fallback.prayer,
        declaration: fallback.declaration,
      };
    }
  }

  // Archives : 30 dernières devotions
  // Note : on ne précise PAS author dans le SELECT (colonne absente en prod,
  // seulement author_id). On utilise * pour ramener toutes colonnes existantes.
  let archives: UnifiedDevotion[] = [];
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    let archivesRows: DevotionRow[] = [];
    const r1 = await supabase
      .from("devotions")
      .select("*")
      .gte("devotion_date", thirtyDaysAgo)
      .order("devotion_date", { ascending: false })
      .limit(30);
    if (!r1.error && r1.data) archivesRows = r1.data as DevotionRow[];
    else {
      const r2 = await supabase
        .from("devotions")
        .select("*")
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: false })
        .limit(30);
      if (!r2.error && r2.data) archivesRows = r2.data as DevotionRow[];
    }
    archives = archivesRows.map((r) => normalize(r)).filter(Boolean) as UnifiedDevotion[];
  } catch { /* noop */ }

  // Progression : combien de devotions lues par cet user
  let streak = 0;
  if (user) {
    try {
      const { count } = await supabase
        .from("devotion_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      streak = count ?? 0;
    } catch { /* noop */ }
  }

  // Stats engagement de la devotion du jour
  let likeCount = 0;
  let userLiked = false;
  let commentsCount = 0;
  if (todayDevotion.id) {
    try {
      const [{ count: lc }, { count: cc }] = await Promise.all([
        supabase.from("devotion_likes").select("id", { count: "exact", head: true }).eq("devotion_id", todayDevotion.id),
        supabase.from("devotion_comments").select("id", { count: "exact", head: true }).eq("devotion_id", todayDevotion.id),
      ]);
      likeCount = lc ?? 0;
      commentsCount = cc ?? 0;
      if (user) {
        const { data: myLike } = await supabase
          .from("devotion_likes").select("id")
          .eq("devotion_id", todayDevotion.id).eq("user_id", user.id).maybeSingle();
        userLiked = !!myLike;
      }
    } catch { /* noop */ }
  }

  return (
    <DevotionClient
      today={todayDevotion}
      archives={archives}
      streak={streak}
      userId={user?.id ?? null}
      initialLikeCount={likeCount}
      initialUserLiked={userLiked}
      initialCommentsCount={commentsCount}
    />
  );
}
