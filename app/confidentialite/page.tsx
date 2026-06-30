import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de l'application Famille Berakah (Centre Chrétien Berakah).",
};

// Page PUBLIQUE (hors routes protégées) — accessible sans connexion, requise
// pour la publication sur le Google Play Store.
const UPDATED = "30 juin 2026";
const CONTACT = "centrechretienberakah@gmail.com";

export default function ConfidentialitePage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 18px 80px", color: "var(--text-primary)" }}>
      <header style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-dark)", margin: 0 }}>
          Famille Berakah · Centre Chrétien Berakah
        </p>
        <h1 style={{ fontFamily: "var(--font-title)", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 800, margin: "8px 0 4px" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Dernière mise à jour : {UPDATED}</p>
      </header>

      <Section title="1. Qui sommes-nous ?">
        <p>
          L&apos;application <b>Famille Berakah</b> est éditée par le <b>Centre Chrétien Berakah (CCB)</b>,
          une communauté chrétienne. Elle est disponible sur le Web, en application installable (PWA)
          et sur Android. La présente politique explique quelles données nous traitons et pourquoi.
        </p>
        <p>Responsable du traitement — contact : <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>.</p>
      </Section>

      <Section title="2. Données que nous traitons">
        <ul style={ul}>
          <li><b>Compte</b> : adresse e-mail et mot de passe (gérés de façon sécurisée par notre prestataire d&apos;authentification), nom/pseudo et informations de profil que vous fournissez.</li>
          <li><b>Contenus que vous publiez</b> : messages (privés et de groupe), publications, sujets de prière, participations aux groupes, quiz, formations, etc.</li>
          <li><b>Caméra et microphone</b> : utilisés <b>uniquement pendant les appels audio/vidéo « CCB Meet »</b>, en temps réel. Les appels ne sont pas enregistrés ni conservés par nous (sauf si un enregistrement est explicitement lancé par un responsable).</li>
          <li><b>Notifications</b> : un identifiant technique d&apos;abonnement (jeton) pour vous envoyer des notifications, si vous les activez.</li>
          <li><b>Assistant IA (BERAKAH AI)</b> : les messages que vous lui envoyez sont transmis à un prestataire d&apos;IA afin de générer une réponse.</li>
          <li><b>Données techniques</b> : type d&apos;appareil/navigateur, fuseau horaire et informations de session, pour le bon fonctionnement et la sécurité.</li>
        </ul>
        <p>
          <b>Paiements / dons</b> : les dons éventuels sont traités par un prestataire de paiement sécurisé.
          Nous <b>ne stockons pas</b> vos numéros de carte bancaire.
        </p>
      </Section>

      <Section title="3. Pourquoi nous utilisons ces données">
        <ul style={ul}>
          <li>Fournir et sécuriser votre compte et les fonctionnalités (communauté, Bible, méditations, groupes, appels, formations, dons…).</li>
          <li>Vous envoyer les notifications que vous avez acceptées.</li>
          <li>Assurer le bon fonctionnement, prévenir les abus et améliorer le service.</li>
        </ul>
      </Section>

      <Section title="4. Prestataires (sous-traitants)">
        <p>Pour faire fonctionner l&apos;application, nous nous appuyons sur des prestataires techniques de confiance, notamment :</p>
        <ul style={ul}>
          <li><b>Supabase</b> — base de données, authentification, stockage.</li>
          <li><b>Hébergement web</b> (fournisseur de déploiement).</li>
          <li><b>LiveKit</b> — appels audio/vidéo en temps réel.</li>
          <li><b>Service de notifications push</b> (Web Push et, sur Android, Firebase Cloud Messaging).</li>
          <li><b>Prestataire d&apos;IA</b> — pour l&apos;assistant BERAKAH AI.</li>
        </ul>
        <p>Ces prestataires ne traitent les données que pour notre compte et selon nos instructions.</p>
      </Section>

      <Section title="5. Partage des données">
        <p>
          Nous <b>ne vendons pas</b> vos données personnelles et ne les partageons pas à des fins
          publicitaires. Les contenus que vous publiez volontairement (ex. un message dans un groupe)
          sont visibles par les destinataires concernés au sein de l&apos;application.
        </p>
      </Section>

      <Section title="6. Conservation et suppression">
        <p>
          Nous conservons vos données tant que votre compte est actif. Vous pouvez demander la
          suppression de votre compte et de vos données en nous écrivant à{" "}
          <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>. Certaines données peuvent être
          conservées si la loi l&apos;exige.
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>
          Conformément à la réglementation applicable (notamment le RGPD), vous disposez d&apos;un droit
          d&apos;accès, de rectification, d&apos;effacement, de limitation et de portabilité de vos données.
          Pour exercer ces droits : <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>.
        </p>
      </Section>

      <Section title="8. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger
          vos données (chiffrement des échanges, contrôle d&apos;accès). Aucun système n&apos;étant infaillible,
          nous ne pouvons garantir une sécurité absolue.
        </p>
      </Section>

      <Section title="9. Enfants">
        <p>
          L&apos;application n&apos;est pas destinée aux enfants de moins de 13 ans sans l&apos;accord et la
          supervision d&apos;un parent ou tuteur.
        </p>
      </Section>

      <Section title="10. Modifications">
        <p>
          Nous pouvons mettre à jour cette politique. En cas de changement important, nous en
          informerons les utilisateurs. La date de dernière mise à jour figure en haut de cette page.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          Pour toute question relative à vos données ou à cette politique :{" "}
          <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: "var(--font-title)", fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--text-secondary)" }}>{children}</div>
    </section>
  );
}

const ul: React.CSSProperties = { margin: "0 0 8px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 };
const link: React.CSSProperties = { color: "var(--gold-dark)", textDecoration: "underline", fontWeight: 600 };
