import type { CalendarContext } from "./calendar";

/**
 * Rédaction IA d'une méditation « Méditons ensemble » à partir du THÈME et du
 * VERSET du jour (issus du calendrier éditorial). La prière, les paragraphes,
 * la question et la déclaration sont rédigés au FORMAT ACTUEL — le thème et le
 * verset ne sont JAMAIS remplacés ni choisis aléatoirement.
 *
 * Réutilise l'infra IA existante (OpenRouter modèles GRATUITS + repli OpenAI),
 * comme /api/compagnon. Sans clé d'API ou en cas d'échec → renvoie `null`
 * (l'appelant retombe alors sur la rotation statique : rien n'est cassé).
 */
export interface GeneratedMeditation {
  title: string;
  verse_ref: string;
  verse_text: string;
  content: string;       // 3 paragraphes séparés par des lignes vides
  application: string;   // question de réflexion
  prayer: string;
  declaration: string;
}

const DEFAULT_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
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

function buildPrompt(ctx: CalendarContext, dateLabel: string): string {
  const context: string[] = [];
  if (ctx.monthTheme) context.push(`Thème du MOIS : « ${ctx.monthTheme} »${ctx.mainVerse ? ` (verset principal : ${ctx.mainVerse})` : ""}.`);
  if (ctx.weekTheme) context.push(`Sous-thème de la SEMAINE : « ${ctx.weekTheme} ».`);
  const contextBlock = context.length
    ? `\n\nCONTEXTE SPIRITUEL (pour la cohérence pédagogique, à NE PAS réciter mécaniquement) :\n- ${context.join("\n- ")}`
    : "";

  return `Tu es le Révérend Elvis NGUIFFO, pasteur du Centre Chrétien Berakah (CCB), église évangélique francophone. Tu rédiges la méditation quotidienne « Méditons ensemble » du ${dateLabel}.

BASE PRINCIPALE (à respecter STRICTEMENT, ne change NI le thème NI le verset) :
- THÈME DU JOUR : « ${ctx.dayTheme} »
- VERSET DU JOUR : ${ctx.dayVerse}${contextBlock}

CONSIGNES :
- Écris en FRANÇAIS, ton pastoral chaleureux, profond et plein d'espérance (comme les méditations CCB).
- Le verset doit être cité dans la version LOUIS SEGOND, texte complet et fidèle de la référence « ${ctx.dayVerse} ».
- "content" : EXACTEMENT 3 paragraphes de méditation, séparés par une ligne vide, qui creusent le thème à partir du verset.
- "application" : UNE question de réflexion concrète (1 à 2 phrases).
- "prayer" : une prière personnelle (3 à 5 phrases), se terminant par « Au nom de Jésus, Amen. ».
- "declaration" : une déclaration de foi à la 1re personne (1 à 2 phrases, énergique).
- N'invente pas de fausse référence ; reste fidèle à la doctrine évangélique.

RÉPONDS UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises Markdown, avec EXACTEMENT ces clés :
{
  "title": "un titre court et inspirant pour la méditation (peut reprendre le thème du jour)",
  "verse_text": "le texte complet du verset ${ctx.dayVerse} en Louis Segond",
  "content": "paragraphe 1\\n\\nparagraphe 2\\n\\nparagraphe 3",
  "application": "la question de réflexion",
  "prayer": "la prière",
  "declaration": "la déclaration de foi"
}`;
}

function extractJson(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  // retire d'éventuelles balises ```json ... ```
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice);
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function callOpenRouter(key: string, models: string[], prompt: string): Promise<string | null> {
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://centrechretienberakah.org",
          "X-Title": "BERAKAH AI — Méditons ensemble",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (reply) return reply;
    } catch { /* modèle suivant */ }
  }
  return null;
}

async function callOpenAI(key: string, prompt: string): Promise<string | null> {
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Génère la méditation à partir du contexte calendaire. `null` si pas de clé
 * d'API ou si la génération échoue / est invalide (→ repli statique).
 */
export async function generateMeditation(
  ctx: CalendarContext,
  dateLabel: string,
): Promise<GeneratedMeditation | null> {
  const orKey = process.env.OPENROUTER_API_KEY;
  const oaKey = process.env.OPENAI_API_KEY;
  if (!orKey && !oaKey) return null;
  if (!ctx.dayTheme || !ctx.dayVerse) return null;

  const prompt = buildPrompt(ctx, dateLabel);

  let raw: string | null = null;
  if (orKey) {
    const models = envModels() ?? DEFAULT_FREE_MODELS;
    raw = await callOpenRouter(orKey, models, prompt);
  }
  if (!raw && oaKey) raw = await callOpenAI(oaKey, prompt);
  if (!raw) return null;

  const obj = extractJson(raw);
  if (!obj) return null;

  const content = str(obj.content);
  const verse_text = str(obj.verse_text);
  const prayer = str(obj.prayer);
  const declaration = str(obj.declaration);
  const application = str(obj.application);
  const title = str(obj.title) || ctx.dayTheme;

  // Validation minimale : sans verset ni méditation, on retombe sur le statique.
  if (!verse_text || content.length < 80 || !prayer) return null;

  return {
    title,
    verse_ref: ctx.dayVerse,   // RÈGLE : la référence du jour n'est jamais modifiée.
    verse_text,
    content,
    application,
    prayer,
    declaration,
  };
}
