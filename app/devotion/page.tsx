import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Dévotion du Jour",
};

export default async function DevotionPage() {
  const supabase = await createClient();

  // Fetch today's devotion
  const today = new Date().toISOString().split("T")[0];
  const { data: devotion } = await supabase
    .from("daily_devotions")
    .select("*")
    .eq("devotion_date", today)
    .single();

  // Fallback if no devotion for today
  const content = devotion || {
    title: "Marcher dans la foi",
    verse_reference: "Hébreux 11:1",
    verse_text:
      "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",
    meditation_p1:
      "La foi est le fondement de notre relation avec Dieu. Elle n'est pas un sentiment passager, mais une conviction profonde, ancrée dans les promesses immuables de Dieu.",
    meditation_p2:
      "Chaque jour, nous sommes appelés à exercer cette foi — dans nos décisions, nos prières, nos relations. La foi sans les œuvres est morte, mais la foi authentique produit des fruits visibles.",
    meditation_p3:
      "Aujourd'hui, choisissez de marcher par la foi et non par la vue. Faites confiance à Celui qui tient votre avenir entre Ses mains.",
    reflection_question:
      "Dans quel domaine de votre vie avez-vous du mal à faire confiance à Dieu ? Comment pouvez-vous exercer votre foi aujourd'hui ?",
    prayer:
      "Seigneur, merci pour le don de la foi. Augmente ma foi dans les moments de doute. Aide-moi à voir au-delà des circonstances et à te faire confiance en toutes choses. En nom de Jésus, Amen.",
    declaration:
      "Je déclare que ma foi est ancrée en Dieu. Je marche par la foi et non par la vue. Dieu est fidèle à toutes ses promesses dans ma vie !",
  };

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-4 pt-10 pb-12"
        style={{
          background:
            "linear-gradient(160deg, #b45309 0%, var(--gold-dark) 40%, var(--gold) 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard"
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              ← Tableau de bord
            </Link>
          </div>
          <p
            className="text-sm font-medium capitalize mb-2"
            style={{ color: "rgba(61,26,114,0.7)" }}
          >
            {dateStr}
          </p>
          <h1
            className="font-cinzel font-bold text-2xl"
            style={{ color: "var(--violet-dark)", letterSpacing: "0.02em" }}
          >
            {content.title}
          </h1>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: "rgba(61,26,114,0.6)" }}
          >
            ☀️ Dévotion du jour
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-20">
        {/* Verse card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: "white",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <p
            className="font-cinzel font-semibold text-lg leading-relaxed mb-3"
            style={{ color: "var(--violet-dark)" }}
          >
            &ldquo;{content.verse_text}&rdquo;
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: "var(--gold-dark)" }}
          >
            — {content.verse_reference}
          </p>
        </div>

        {/* Méditation */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2
            className="font-cinzel font-bold text-base mb-4 flex items-center gap-2"
            style={{ color: "var(--violet)" }}
          >
            📚 Méditation
          </h2>
          <div className="space-y-4">
            {[content.meditation_p1, content.meditation_p2, content.meditation_p3]
              .filter(Boolean)
              .map((p, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p}
                </p>
              ))}
          </div>
        </div>

        {/* Question */}
        {content.reflection_question && (
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: "var(--violet-pale)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="font-bold text-sm mb-2 flex items-center gap-2"
              style={{ color: "var(--violet)" }}
            >
              💭 Question de réflexion
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {content.reflection_question}
            </p>
          </div>
        )}

        {/* Prayer */}
        {content.prayer && (
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: "linear-gradient(135deg, #fdf8e8, #fef3c7)",
              border: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            <h3
              className="font-bold text-sm mb-2 flex items-center gap-2"
              style={{ color: "#92400e" }}
            >
              🙏 Prière du jour
            </h3>
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: "#78350f" }}
            >
              {content.prayer}
            </p>
          </div>
        )}

        {/* Declaration */}
        {content.declaration && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, var(--violet-dark), var(--violet))",
            }}
          >
            <h3
              className="font-bold text-sm mb-2 flex items-center gap-2 text-white"
            >
              ✦ Déclaration de foi
            </h3>
            <p
              className="text-sm leading-relaxed font-medium"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {content.declaration}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
