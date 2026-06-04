/**
 * POST /api/compagnon — Compagnon Biblique IA du CCB.
 *
 * UI livrée maintenant ; l'IA s'active automatiquement dès qu'une clé est
 * présente dans Vercel :
 *   - OPENAI_API_KEY  (+ option OPENAI_MODEL, défaut gpt-4o-mini)
 * Sans clé → réponse d'attente bienveillante (configured:false), aucune erreur.
 *
 * Body : { messages: { role: "user"|"assistant", content: string }[] }
 * Renvoie : { reply: string, configured: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Tu es le « Compagnon Biblique » du Centre Chrétien Berakah (CCB), une église chrétienne évangélique francophone.
Ta mission : accompagner spirituellement les membres avec bienveillance et vérité.
Règles :
- Réponds toujours en français, avec chaleur et respect.
- Ancre tes réponses dans la Bible ; cite les références (ex. Jean 3:16) et privilégie la version Louis Segond.
- Tu peux : expliquer un verset, répondre à une question biblique, composer une prière, proposer une méditation, accompagner un nouveau converti.
- Reste concis et clair (quelques paragraphes maximum).
- Ne prétends jamais remplacer le conseil pastoral : pour les situations graves, invite à contacter un pasteur du CCB.
- Reste centré sur la foi chrétienne ; décline poliment ce qui en sort.`;

interface ChatMessage { role: "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  // Authentification requise (évite tout usage anonyme de l'API)
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: ChatMessage[] } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "Aucun message" }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      configured: false,
      reply:
        "🙏 Le Compagnon Biblique IA est presque prêt !\n\n" +
        "L'assistant sera activé dès que l'administrateur aura ajouté une clé d'API. " +
        "En attendant, tu peux explorer Ma Bible, les méditations du jour et Prions Ensemble. " +
        "« Demandez et l'on vous donnera ; cherchez et vous trouverez. » — Matthieu 7:7",
    });
  }

  try {
    const trimmed = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.6,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return NextResponse.json({
        configured: true,
        reply: "Désolé, l'assistant est momentanément indisponible. Réessaie dans un instant. 🙏",
        error: detail,
      });
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim() || "…";
    return NextResponse.json({ configured: true, reply });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      reply: "Une erreur est survenue en contactant l'assistant. Réessaie un peu plus tard. 🙏",
      error: (e as Error).message.slice(0, 200),
    });
  }
}
