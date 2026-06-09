/**
 * POST /api/compagnon — 🤖 BERAKAH AI, l'assistant pastoral du CCB.
 *
 * 100 % gratuit : utilise OpenRouter avec des modèles GRATUITS (suffixe `:free`).
 * Jamais de modèle payant. S'active dès qu'une clé est présente dans Vercel :
 *   - OPENROUTER_API_KEY   (+ option OPENROUTER_MODELS = liste séparée par virgules)
 *   - (repli historique) OPENAI_API_KEY si OpenRouter absent — ne force aucun coût.
 * Sans clé → réponse d'attente bienveillante (configured:false), aucune erreur.
 *
 * Body  : { messages: { role: "user"|"assistant", content: string }[] }
 * Renvoie : { reply, configured, sensitive, appointment, model? }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ChatMessage { role: "user" | "assistant"; content: string }

// ── Modèles GRATUITS OpenRouter. Découverts dynamiquement via /models (pricing 0)
//    avec repli sur une liste statique. Surchargeable via OPENROUTER_MODELS (CSV).
const DEFAULT_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
];

function envModels(): string[] | null {
  const csv = process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL;
  if (!csv) return null;
  const list = csv.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

// Découverte des modèles gratuits réellement disponibles (cache 30 min).
let _modelCache: { at: number; models: string[] } | null = null;
async function discoverFreeModels(key: string): Promise<string[]> {
  if (_modelCache && Date.now() - _modelCache.at < 30 * 60 * 1000) return _modelCache.models;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return [];
    const data = await res.json() as { data?: Array<{ id: string; pricing?: { prompt?: string; completion?: string } }> };
    const free = (data.data ?? [])
      .filter((m) => m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0)
      .map((m) => m.id);
    const rank = (id: string): number => {
      const s = id.toLowerCase();
      if (s.includes("llama-3.3")) return 0;
      if (s.includes("deepseek")) return 1;
      if (s.includes("qwen")) return 2;
      if (s.includes("gemini-2")) return 3;
      if (s.includes("gemma")) return 4;
      if (s.includes("llama-3.1")) return 5;
      if (s.includes("mistral")) return 6;
      return 9;
    };
    free.sort((a, b) => rank(a) - rank(b));
    const top = free.slice(0, 8);
    if (top.length) _modelCache = { at: Date.now(), models: top };
    return top;
  } catch { return []; }
}

// Message d'aide selon l'erreur OpenRouter (diagnostic pour l'administrateur).
function diagnose(err: { status: number; detail: string } | null): string {
  if (!err) return "Désolé, l'assistant est momentanément indisponible. Réessaie dans un instant. 🙏";
  const d = (err.detail || "").toLowerCase();
  if (err.status === 401 || d.includes("invalid api key") || d.includes("no auth") || d.includes("user not found")) {
    return "🔑 La clé d'API OpenRouter semble invalide. Administrateur : vérifie OPENROUTER_API_KEY dans Vercel, puis redéploie. 🙏";
  }
  if (d.includes("data policy") || d.includes("no endpoints") || d.includes("no allowed providers")) {
    return "⚙️ Un réglage OpenRouter est requis pour les modèles gratuits. Administrateur : ouvre openrouter.ai/settings/privacy et autorise les modèles gratuits (data policy), puis réessaie. 🙏";
  }
  if (err.status === 402 || d.includes("insufficient") || d.includes("requires more credits") || d.includes("credit")) {
    return "💳 Le quota gratuit est momentanément épuisé (ou un petit crédit est requis pour ce modèle). Réessaie un peu plus tard. 🙏";
  }
  if (err.status === 429 || d.includes("rate limit") || d.includes("rate-limit")) {
    return "⏳ Beaucoup de demandes en ce moment (limite du tier gratuit OpenRouter). Réessaie dans une minute. 🙏";
  }
  if (err.status === 404) {
    return "Aucun modèle gratuit n'est disponible pour l'instant. Réessaie bientôt. 🙏";
  }
  return "Désolé, l'assistant est momentanément indisponible. Réessaie dans un instant. 🙏";
}

const SYSTEM_PROMPT = `Tu es « BERAKAH AI », l'assistant pastoral du Centre Chrétien Berakah (CCB), une église chrétienne évangélique francophone dirigée par le Révérend Elvis Nguiffo.

TON RÔLE : assister, orienter, encourager, enseigner et discipuler les membres — 24h/24. Tu ne remplaces JAMAIS le pasteur ; pour toute situation grave, tu invites à un accompagnement humain.

STYLE :
- Réponds dans la langue du membre (français par défaut ; anglais si on t'écrit en anglais).
- Ancre chaque réponse dans la Bible : cite les références (ex. Jean 3:16), privilégie la version Louis Segond.
- Sois chaleureux, simple, bref (quelques paragraphes), bienveillant et plein d'espérance.
- Termine souvent par une courte prière ou une parole d'encouragement.

CE QUE TU PEUX FAIRE : expliquer un verset ou un passage, créer une mini-étude biblique, composer une prière, proposer une méditation, recommander une lecture/formation, accompagner un nouveau converti, guider dans l'application CCB.

RESSOURCES CCB à recommander quand c'est utile : « Méditons ensemble » (méditation du jour), « Ma Bible », les Plans de lecture, « Prions ensemble », l'« Institut Berakah » (formations), la Bibliothèque digitale, et « JESUS DAILY TV ».

LIMITES : reste centré sur la foi chrétienne et la doctrine évangélique ; décline avec douceur ce qui en sort. N'invente pas de fausses références bibliques. Tu peux te tromper : invite à vérifier et, au besoin, à contacter un pasteur du CCB.

SITUATIONS SENSIBLES (suicide, automutilation, violence, abus, divorce complexe, oppression spirituelle/délivrance, crise familiale majeure) : réponds avec compassion ET invite explicitement à un accompagnement humain en proposant de « prendre un rendez-vous pastoral ».`;

// ── Détections côté serveur (déclenchent des actions dans l'UI) ───────────────
function deburr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
const SENSITIVE_RX = /\b(suicide|suicidaire|me tuer|me suicider|en finir|plus envie de vivre|automutil|me faire du mal|scarification|violence conjugale|battu|frappe|abus|viol|agress|inceste|maltrait|divorce|depression severe|oppression|demon|possede|delivrance|sorcellerie)\b/;
const APPOINTMENT_RX = /\b(rendez[- ]?vous|rdv|parler au pasteur|parler a un pasteur|parler au reverend|parler a elvis|entretien pastoral|voir le pasteur|rencontrer le pasteur|accompagnement pastoral|conseil pastoral)\b/;

function detect(lastUser: string) {
  const t = deburr(lastUser);
  return { sensitive: SENSITIVE_RX.test(t), appointment: APPOINTMENT_RX.test(t) };
}

// ── Contexte membre (mémoire) — best-effort, jamais bloquant ───────────────────
async function buildUserContext(sb: Awaited<ReturnType<typeof createServerClient>>, userId: string): Promise<string> {
  const parts: string[] = [];
  const grab = async <T,>(p: PromiseLike<{ data: T | null }>, fb: T): Promise<T> => {
    try { const r = await p; return (r.data ?? fb); } catch { return fb; }
  };

  const p = await grab(
    sb.from("user_profiles").select("display_name, full_name, spiritual_level").eq("user_id", userId).maybeSingle(),
    null as { display_name?: string | null; full_name?: string | null; spiritual_level?: string | null } | null,
  );
  const name = (p?.display_name || p?.full_name || "").split(" ")[0];
  if (name) parts.push(`Prénom du membre : ${name}.`);
  if (p?.spiritual_level) parts.push(`Niveau spirituel déclaré : ${p.spiritual_level}.`);

  const plans = await grab(
    sb.from("user_bible_plans").select("is_active").eq("user_id", userId).eq("is_active", true),
    [] as Array<{ is_active: boolean }>,
  );
  if (plans.length > 0) parts.push(`Le membre suit actuellement ${plans.length} plan(s) de lecture biblique actif(s).`);

  const rows = await grab(
    sb.from("institut_user_progress").select("course_id, is_completed").eq("user_id", userId),
    [] as Array<{ course_id: string; is_completed: boolean }>,
  );
  if (rows.length) {
    const courses = new Set(rows.map((r) => r.course_id));
    const completed = new Set(rows.filter((r) => r.is_completed).map((r) => r.course_id));
    const ongoing = courses.size - completed.size;
    if (ongoing > 0) parts.push(`Le membre a ${ongoing} formation(s) en cours à l'Institut Berakah.`);
    else if (completed.size > 0) parts.push(`Le membre a terminé ${completed.size} formation(s) à l'Institut Berakah.`);
  }

  if (!parts.length) return "";
  return `\n\nCONTEXTE MEMBRE (pour personnaliser, sans le réciter mécaniquement) :\n- ${parts.join("\n- ")}`;
}

// ── RAG CCB : récupère les contenus pertinents de la base documentaire indexée ──
async function buildCcbContext(sb: Awaited<ReturnType<typeof createServerClient>>, query: string): Promise<string> {
  const q = query.slice(0, 200).trim();
  if (!q) return "";
  try {
    const { data } = await sb
      .from("ai_knowledge")
      .select("source, title, body, url")
      .textSearch("fts", q, { type: "websearch", config: "french" })
      .limit(5);
    const rows = (data ?? []) as Array<{ source: string; title: string; body: string | null; url: string | null }>;
    if (!rows.length) return "";
    const blocks = rows.map((r, i) =>
      `[${i + 1}] ${r.title}${r.url ? ` (lien interne : ${r.url})` : ""}\n${(r.body || "").slice(0, 700)}`,
    );
    return `\n\nCONTENUS CCB PERTINENTS (PRIORITÉ ABSOLUE — appuie ta réponse sur ces ressources du Centre Chrétien Berakah quand elles correspondent, et invite le membre à les consulter via leur lien interne ; n'invente jamais de contenu CCB au-delà de ceci) :\n${blocks.join("\n\n")}`;
  } catch { return ""; }
}

type ORResult = { reply: string; model: string } | { error: { status: number; detail: string } };
async function callOpenRouter(key: string, models: string[], messages: Array<{ role: string; content: string }>): Promise<ORResult> {
  let lastErr = { status: 0, detail: "Aucun modèle gratuit disponible." };
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://centrechretienberakah.org",
          "X-Title": "BERAKAH AI",
        },
        body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 800 }),
      });
      if (!res.ok) { lastErr = { status: res.status, detail: (await res.text().catch(() => "")).slice(0, 400) }; continue; }
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return { reply, model };
      lastErr = { status: 200, detail: "Réponse vide du modèle." };
    } catch (e) { lastErr = { status: 0, detail: (e as Error).message.slice(0, 200) }; }
  }
  return { error: lastErr };
}

async function callOpenAI(key: string, messages: Array<{ role: string; content: string }>): Promise<{ reply: string; model: string } | null> {
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 800 }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply ? { reply, model } : null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: ChatMessage[] } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return NextResponse.json({ error: "Aucun message" }, { status: 400 });

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const flags = detect(lastUser);

  const orKey = process.env.OPENROUTER_API_KEY;
  const oaKey = process.env.OPENAI_API_KEY;
  if (!orKey && !oaKey) {
    return NextResponse.json({
      configured: false,
      sensitive: flags.sensitive,
      appointment: flags.appointment,
      reply:
        "🙏 BERAKAH AI est presque prêt !\n\n" +
        "L'assistant sera activé dès que l'administrateur aura ajouté une clé d'API (OpenRouter, gratuite). " +
        "En attendant, tu peux explorer « Ma Bible », la méditation du jour et « Prions ensemble ».\n\n" +
        "« Demandez et l'on vous donnera ; cherchez et vous trouverez. » — Matthieu 7:7",
    });
  }

  const [context, ccb] = await Promise.all([
    buildUserContext(sb, user.id),
    buildCcbContext(sb, lastUser),
  ]);
  const trimmed = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const payload = [{ role: "system", content: SYSTEM_PROMPT + ccb + context }, ...trimmed];

  let out: { reply: string; model: string } | null = null;
  let orErr: { status: number; detail: string } | null = null;
  if (orKey) {
    const discovered = envModels() ?? await discoverFreeModels(orKey);
    const list = discovered.length ? discovered : DEFAULT_FREE_MODELS;
    const r = await callOpenRouter(orKey, list, payload);
    if ("reply" in r) out = r; else orErr = r.error;
  }
  if (!out && oaKey) out = await callOpenAI(oaKey, payload);

  if (!out) {
    if (orErr) console.error("BERAKAH AI — OpenRouter indisponible:", orErr.status, orErr.detail);
    return NextResponse.json({
      configured: true,
      sensitive: flags.sensitive,
      appointment: flags.appointment,
      reply: diagnose(orErr),
      error: orErr ?? undefined,
    });
  }

  return NextResponse.json({
    configured: true,
    sensitive: flags.sensitive,
    appointment: flags.appointment,
    model: out.model,
    reply: out.reply,
  });
}
