import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Passe Berakah Premium — CCB" };
export const dynamic = "force-dynamic";

const FEATURES_FREE = [
  "Dévotion du jour",
  "Lecture de la Bible complète",
  "Plan de lecture biblique (basique)",
  "Cultes en direct (live)",
  "Annonces & événements",
  "Mur de prière",
  "Communauté (feed)",
  "JESUS DAILY (vidéos quotidiennes)",
];

const FEATURES_PREMIUM = [
  "Tout le contenu gratuit inclus",
  "Toutes les classes & formations",
  "Bibliothèque complète (PDF, audio, vidéo)",
  "Ressources exclusives membres",
  "Téléchargements offline",
  "Plans de lecture avancés",
  "Accès aux archives de sermons",
  "Contenu prioritaire avant publication",
  "Mentorat & accompagnement pastoral",
  "Badge membre Premium",
];

export default async function PremiumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isPremium = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_premium")
      .eq("user_id", user.id)
      .single();
    isPremium = profile?.is_premium ?? false;
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px 80px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>👑</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10 }}>
          Passe Berakah Premium
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
          Accédez à l&apos;intégralité des ressources du Centre Chrétien Berakah — formations, bibliothèque, accompagnement pastoral et contenu exclusif.
        </p>
      </div>

      {isPremium && (
        <div style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: "var(--radius-xl)", padding: "18px 24px", textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
          <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: 15, margin: 0 }}>
            Vous bénéficiez déjà du Passe Berakah Premium. Profitez de tous vos avantages !
          </p>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>

        {/* Gratuit */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "28px 22px" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>🌱</div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Gratuit</h2>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "10px 0 4px" }}>0 FCFA</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Pour toujours</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {FEATURES_FREE.map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#22c55e", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f}</span>
              </div>
            ))}
          </div>
          {!user && (
            <a href="/auth/register" style={{ display: "block", textAlign: "center", marginTop: 24, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "var(--radius-full)", padding: "10px 18px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Créer un compte gratuit
            </a>
          )}
        </div>

        {/* Premium */}
        <div style={{ background: "rgba(212,175,55,0.06)", border: "2px solid rgba(212,175,55,0.45)", borderRadius: "var(--radius-xl)", padding: "28px 22px", position: "relative" }}>
          <div style={{ position: "absolute", top: -12, right: 16, background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "3px 12px", fontSize: 11, fontWeight: 800 }}>
            RECOMMANDÉ
          </div>
          <div style={{ fontSize: 22, marginBottom: 8 }}>👑</div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--gold)", marginBottom: 4 }}>Premium</h2>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "10px 0 4px" }}>
            Sur don
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Contribution libre mensuelle</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {FEATURES_PREMIUM.map((f) => (
              <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "var(--gold)", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f}</span>
              </div>
            ))}
          </div>
          {!isPremium && (
            <a href="/contact" style={{ display: "block", textAlign: "center", marginTop: 24, background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 18px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Demander l&apos;accès →
            </a>
          )}
        </div>

      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 18 }}>Questions fréquentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { q: "Combien coûte le Premium ?", a: "Le Passe Berakah Premium fonctionne sur le principe du don libre. Vous contribuez selon vos moyens, en reconnaissance des ressources disponibles. Contactez-nous pour en savoir plus." },
            { q: "Comment obtenir l'accès Premium ?", a: "Contactez le ministère via le formulaire de contact ou directement par email. L'accès est activé manuellement par l'équipe pastorale après confirmation." },
            { q: "Les ressources Premium sont-elles disponibles hors ligne ?", a: "Oui, les membres Premium peuvent télécharger les PDF, les études et les ressources audio pour y accéder sans connexion." },
            { q: "Puis-je annuler à tout moment ?", a: "Oui. L'accès Premium peut être suspendu ou annulé à tout moment. Écrivez-nous et nous traiterons votre demande rapidement." },
          ].map(({ q, a }) => (
            <div key={q} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 22px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>❓ {q}</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div style={{ padding: 26, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>✉️</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
          Une question sur le Premium ? L&apos;équipe CCB vous répond.
        </p>
        <a href="mailto:centrechretienberakah@gmail.com?subject=Passe Berakah Premium" style={{ display: "inline-block", background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Nous écrire →
        </a>
      </div>

    </div>
  );
}
