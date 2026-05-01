import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DevotionClient from "./DevotionClient";

export const metadata = {
  title: "Dévotion du Jour — CCB",
};

export default async function DevotionPage() {
  const supabase = await createClient();

  // User session
  const { data: { user } } = await supabase.auth.getUser();

  // Today's devotion
  const today = new Date().toISOString().split("T")[0];
  const { data: devotion } = await supabase
    .from("daily_devotions")
    .select("*")
    .eq("devotion_date", today)
    .eq("is_published", true)
    .single();

  // Fallback si aucune dévotion n'est encore en base
  const content = devotion || {
    id: null,
    title: "Marcher dans la foi",
    verse_reference: "Hébreux 11:1",
    verse_text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",
    meditation_p1: "La foi est le fondement de notre relation avec Dieu. Elle n'est pas un sentiment passager, mais une conviction profonde, ancrée dans les promesses immuables de Dieu.",
    meditation_p2: "Chaque jour, nous sommes appelés à exercer cette foi — dans nos décisions, nos prières, nos relations. La foi authentique produit des fruits visibles.",
    meditation_p3: "Aujourd'hui, choisissez de marcher par la foi et non par la vue. Faites confiance à Celui qui tient votre avenir entre Ses mains.",
    reflection_question: "Dans quel domaine de votre vie avez-vous du mal à faire confiance à Dieu ?",
    prayer: "Seigneur, augmente ma foi dans les moments de doute. Aide-moi à voir au-delà des circonstances et à te faire confiance en toutes choses. En nom de Jésus, Amen.",
    declaration: "Je marche par la foi et non par la vue. Dieu est fidèle à toutes ses promesses dans ma vie !",
  };

  // Check if user already completed today's devotion
  let alreadyCompleted = false;
  if (user && content.id) {
    const { data: progress } = await supabase
      .from("user_devotion_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("devotion_id", content.id)
      .single();
    alreadyCompleted = !!progress;
  }

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#07040f" }}>

      {/* Header doré */}
      <div style={{
        background: "linear-gradient(160deg, #b45309 0%, #d4af37 60%, #f0d060 100%)",
        padding: "2.5rem 1.25rem 3rem",
      }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <Link
            href="/dashboard"
            style={{ color: "rgba(61,26,114,0.65)", fontSize: "0.85rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
          >
            ← Tableau de bord
          </Link>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(61,26,114,0.6)", textTransform: "capitalize", marginBottom: "0.4rem" }}>
            ☀️ {dateStr}
          </p>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            color: "#3d1a72",
            letterSpacing: "0.02em",
            margin: 0,
          }}>
            {content.title}
          </h1>
          <p style={{ color: "rgba(61,26,114,0.5)", fontSize: "0.78rem", marginTop: "0.35rem" }}>
            Dévotion du jour
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 1.25rem 5rem", marginTop: "-1.5rem" }}>

        {/* Verset */}
        <div style={{
          borderRadius: "20px",
          padding: "1.75rem",
          marginBottom: "1rem",
          background: "white",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <p style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 600,
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            lineHeight: 1.7,
            color: "#3d1a72",
            marginBottom: "0.75rem",
            fontStyle: "italic",
          }}>
            &ldquo;{content.verse_text}&rdquo;
          </p>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#b8941f" }}>
            — {content.verse_reference}
          </p>
        </div>

        {/* Méditation */}
        <div style={{
          borderRadius: "16px",
          padding: "1.5rem",
          marginBottom: "1rem",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <h2 style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
            📚 Méditation
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {[content.meditation_p1, content.meditation_p2, content.meditation_p3]
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.92rem", lineHeight: 1.85, margin: 0 }}>
                  {p}
                </p>
              ))}
          </div>
        </div>

        {/* Question */}
        {content.reflection_question && (
          <div style={{
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1rem",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}>
            <h3 style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              💭 Question de réflexion
            </h3>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
              {content.reflection_question}
            </p>
          </div>
        )}

        {/* Prière */}
        {content.prayer && (
          <div style={{
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1rem",
            background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(184,148,31,0.05))",
            border: "1px solid rgba(212,175,55,0.18)",
          }}>
            <h3 style={{ color: "#d4af37", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              🙏 Prière du jour
            </h3>
            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.9rem", lineHeight: 1.8, margin: 0, fontStyle: "italic" }}>
              {content.prayer}
            </p>
          </div>
        )}

        {/* Déclaration */}
        {content.declaration && (
          <div style={{
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
            background: "linear-gradient(135deg, #3d1a72, #7c3aed)",
          }}>
            <h3 style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              ✦ Déclaration de foi
            </h3>
            <p style={{ color: "white", fontSize: "0.92rem", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
              {content.declaration}
            </p>
          </div>
        )}

        {/* Bouton J'ai lu — client component */}
        <DevotionClient
          devotionId={content.id}
          userId={user?.id ?? null}
          alreadyCompleted={alreadyCompleted}
        />

        {/* Nav bottom */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link
            href="/dashboard"
            style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", textDecoration: "none" }}
          >
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
