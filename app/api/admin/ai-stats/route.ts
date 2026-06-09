import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["owner", "admin"]);

async function assertAdmin() {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (roleRow as { role?: string } | null)?.role;
  if (!role || !ADMIN_ROLES.has(role)) return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const deburr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Mots vides FR + termes trop génériques pour le contexte (à exclure des tendances).
const STOP = new Set((
  "le la les un une des de du et a au aux ce cet cette ces mon ma mes ton ta tes son sa ses " +
  "notre nos votre vos leur leurs je tu il elle on nous vous ils elles que qui quoi dont ou est " +
  "sont suis es sommes etes ont ai as avons avez pas ne ni plus moins pour par sur dans avec sans " +
  "sous comme mais donc or car si oui non quel quelle quels quelles me te se lui cest jai dun dune " +
  "lun quand comment pourquoi combien tout tous toute toutes faire fait dit dire peux peut veux veut " +
  "etre avoir cela ceci celui celle bien tres trop aussi alors meme entre vers chez deja encore " +
  "merci bonjour salut explique parle donne aide besoin veux voudrais aimerais peux pourrais"
).split(/\s+/));

export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role non configuré" }, { status: 503 });

  const since = new Date(Date.now() - 29 * 86400000).toISOString();
  const { data, error } = await admin
    .from("ai_messages")
    .select("user_id, role, content, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(6000);

  // Table absente (v64 non migrée) → réponse vide gracieuse.
  if (error) {
    return NextResponse.json({
      ready: false,
      totals: { conversations: 0, userMessages: 0, assistantMessages: 0, activeMembers: 0 },
      series: [], topKeywords: [], recentQuestions: [],
    });
  }

  const rows = (data ?? []) as Array<{ user_id: string; role: string; content: string; created_at: string }>;
  const userMsgs = rows.filter((r) => r.role === "user");
  const assistantMsgs = rows.filter((r) => r.role === "assistant");
  const activeMembers = new Set(rows.map((r) => r.user_id)).size;

  // Série 14 jours (messages des membres / jour)
  const byDay: Record<string, number> = {};
  for (const m of userMsgs) byDay[m.created_at.slice(0, 10)] = (byDay[m.created_at.slice(0, 10)] || 0) + 1;
  const series: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = dayStr(Date.now() - i * 86400000);
    series.push({ day: d, count: byDay[d] ?? 0 });
  }

  // Mots-clés tendance (agrégés, anonymisés)
  const freq: Record<string, number> = {};
  for (const m of userMsgs) {
    const words = deburr(m.content).replace(/[^a-z\s]/g, " ").split(/\s+/);
    const seen = new Set<string>();
    for (const w of words) {
      if (w.length < 4 || STOP.has(w) || seen.has(w)) continue;
      seen.add(w);
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1]).slice(0, 18)
    .map(([word, count]) => ({ word, count }));

  // Questions récentes (anonymisées — pas d'identité, pas de fil complet)
  const recentQuestions = userMsgs.slice(0, 25).map((m) => ({
    text: m.content.slice(0, 180),
    date: m.created_at,
  }));

  const { count: conversations } = await admin.from("ai_conversations").select("id", { count: "exact", head: true });

  return NextResponse.json({
    ready: true,
    totals: {
      conversations: conversations ?? 0,
      userMessages: userMsgs.length,
      assistantMessages: assistantMsgs.length,
      activeMembers,
    },
    series, topKeywords, recentQuestions,
  });
}
