import { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = { title: "À Propos — Centre Chrétien Berakah" };

const VALUES = [
  { icon: "📖", title: "Parole de Dieu", desc: "Toute doctrine et pratique est fondée sur la Bible, Parole inspirée et infaillible de Dieu." },
  { icon: "🙏", title: "Prière & Intercession", desc: "La prière est le pilier de notre vie spirituelle individuelle et collective." },
  { icon: "🕊️", title: "Saint-Esprit", desc: "Nous croyons aux dons et au mouvement du Saint-Esprit dans l'église aujourd'hui." },
  { icon: "🤝", title: "Communauté", desc: "Nous nous accompagnons mutuellement dans la croissance, la guérison et la foi." },
  { icon: "🌍", title: "Mission", desc: "L'évangélisation et l'envoi de disciples sont au cœur de notre appel." },
  { icon: "🎓", title: "Formation", desc: "Nous investissons dans la formation spirituelle, théologique et pratique des membres." },
];

const TEAM: { name: string; role: string; desc: string; emoji: string; photo?: string }[] = [
  { name: "Rév. Elvis NGUIFFO", role: "Pasteur Principal & Fondateur", desc: "Consacré au service du Seigneur depuis plus de 15 ans, le Révérend Elvis NGUIFFO a reçu l'appel pastoral avec la vision de bâtir une église locale forte, enracinée dans la Parole et animée par le Saint-Esprit. Diplômé en théologie et en leadership chrétien, il est aussi époux et père de famille, modèle de la foi vécue au quotidien.", emoji: "👤", photo: "/rev-elvis-v2.jpg" },
  { name: "L'Équipe Pastorale", role: "Anciens & Responsables", desc: "L'église est gouvernée par un collège d'anciens formés et dédiés, chacun responsable d'un département : jeunesse, femmes, hommes, intercession, louange, et évangélisation.", emoji: "👥" },
];

const STATS = [
  { value: "2010", label: "Année de fondation" },
  { value: "500+", label: "Membres actifs" },
  { value: "10+", label: "Groupes de cellule" },
  { value: "3", label: "Services par semaine" },
];

// Profession de foi — valeur par défaut (éditable via CMS clé "confession-foi", markdown).
const DEFAULT_CONFESSION_MD = `# Confession de Foi
## Centre Chrétien Berakah (CCB)

### 1. Les Saintes Écritures
Nous croyons que la Bible, composée de l'Ancien et du Nouveau Testament, est la Parole inspirée de Dieu, entièrement vraie, souveraine, suffisante et faisant autorité pour la foi, la doctrine, la conduite et la vie chrétienne.
Nous croyons que les Saintes Écritures révèlent parfaitement le plan de salut de Dieu pour l'humanité à travers Jésus-Christ.
Nous croyons que toute doctrine, toute révélation, toute expérience spirituelle et toute pratique de l'Église doivent être examinées à la lumière des Écritures.

---

### 2. Le Dieu Unique et Véritable
Nous croyons en un seul Dieu vivant et éternel, Créateur du ciel et de la terre, souverain sur toute chose, parfait en sainteté, en justice, en amour, en sagesse et en puissance.
Nous croyons que Dieu existe éternellement en trois personnes distinctes et unies : le Père, le Fils et le Saint-Esprit.
Nous croyons que le Père est la source de toute vie et de tout dessein éternel.
Nous croyons que Jésus-Christ est le Fils éternel de Dieu manifesté en chair pour le salut du monde.
Nous croyons que le Saint-Esprit est pleinement Dieu et qu'Il agit aujourd'hui dans l'Église et dans la vie des croyants.

---

### 3. Jésus-Christ
Nous croyons que Jésus-Christ a été conçu du Saint-Esprit et né de la vierge Marie.
Nous croyons que Jésus-Christ est pleinement Dieu et pleinement homme.
Nous croyons que Jésus-Christ a vécu une vie parfaitement sainte, sans péché et agréable au Père.
Nous croyons que Jésus-Christ est mort à la croix pour nos péchés, comme sacrifice parfait et définitif pour la rédemption de l'humanité.
Nous croyons que Jésus-Christ est ressuscité corporellement d'entre les morts le troisième jour.
Nous croyons que Jésus-Christ est monté au ciel, qu'Il siège à la droite du Père et qu'Il intercède continuellement pour les saints.
Nous croyons que Jésus-Christ reviendra personnellement dans la gloire pour établir pleinement Son règne éternel.

---

### 4. Le Saint-Esprit
Nous croyons que le Saint-Esprit convainc le monde de péché, de justice et de jugement.
Nous croyons que le Saint-Esprit régénère, sanctifie, console, enseigne, équipe et conduit les croyants.
Nous croyons que le baptême du Saint-Esprit est une promesse pour les croyants afin de les revêtir de puissance pour le service et le témoignage.
Nous croyons que les dons spirituels mentionnés dans les Écritures demeurent actuels et doivent être exercés avec ordre, amour, sagesse et soumission à la Parole de Dieu.
Nous croyons que le fruit de l'Esprit est la preuve visible d'une vie transformée par Dieu.

---

### 5. La Création et l'Humanité
Nous croyons que Dieu a créé l'homme et la femme à Son image et selon Sa ressemblance.
Nous croyons que toute vie humaine possède une dignité sacrée devant Dieu.
Nous croyons que l'humanité a été séparée de Dieu par le péché et qu'aucun être humain ne peut se sauver par ses propres œuvres.
Nous croyons que tous les hommes ont besoin du pardon, de la grâce et de la nouvelle naissance en Jésus-Christ.

---

### 6. Le Salut
Nous croyons que le salut est une œuvre de grâce reçue par la foi en Jésus-Christ seul.
Nous croyons que le pardon des péchés est accordé à toute personne qui se repent sincèrement et place sa confiance en Jésus-Christ.
Nous croyons que la nouvelle naissance produit une transformation réelle et visible dans la vie du croyant.
Nous croyons que le salut nous réconcilie avec Dieu et nous donne accès à la vie éternelle.
Nous croyons que le croyant est appelé à persévérer dans la foi, dans la sainteté et dans l'obéissance à Dieu.

---

### 7. La Sanctification et la Vie Chrétienne
Nous croyons que Dieu appelle Son peuple à une vie de consécration, de pureté, d'intégrité et de séparation du péché.
Nous croyons que la sanctification est un processus continuel par lequel le Saint-Esprit transforme le croyant à l'image de Jésus-Christ.
Nous croyons que le chrétien est appelé à marcher dans l'amour, l'humilité, la vérité, le pardon, la compassion et la justice.
Nous croyons que la prière, le jeûne, l'adoration, la méditation de la Parole et la communion fraternelle sont essentiels à la croissance spirituelle.
Nous croyons que chaque croyant est appelé à refléter le caractère de Christ dans tous les domaines de sa vie.

---

### 8. L'Église
Nous croyons que l'Église est le Corps de Christ composé de tous ceux qui sont nés de nouveau.
Nous croyons que Jésus-Christ est la seule tête de l'Église.
Nous croyons que l'Église existe pour adorer Dieu, former des disciples, annoncer l'Évangile et manifester le Royaume de Dieu sur la terre.
Nous croyons que l'Église locale est un lieu de communion, d'enseignement, d'édification, de service et d'accompagnement spirituel.
Nous croyons que Dieu établit dans l'Église différents ministères pour l'équipement des saints et l'édification du Corps de Christ.
Nous croyons à l'importance de l'unité, de l'amour fraternel et de la soumission mutuelle dans le peuple de Dieu.

---

### 9. Les Ordonnances
Nous croyons au baptême d'eau par immersion comme témoignage public de la foi en Jésus-Christ.
Nous croyons que le baptême symbolise la mort au péché et la résurrection à une vie nouvelle en Christ.
Nous croyons à la Sainte Cène comme mémorial du sacrifice de Jésus-Christ et comme expression de communion avec Lui et avec Son Église.

---

### 10. La Mission et l'Évangélisation
Nous croyons que l'Église est appelée à faire de toutes les nations des disciples de Jésus-Christ.
Nous croyons que l'annonce de l'Évangile doit être accompagnée d'amour, de compassion, de vérité et de puissance spirituelle.
Nous croyons que chaque croyant est un ambassadeur du Royaume de Dieu.
Nous croyons que Dieu désire transformer les vies, les familles, les communautés et les nations par la puissance de l'Évangile.
Nous croyons que le Seigneur appelle Son peuple à former des disciples, transformer des vies et manifester la bénédiction.

---

### 11. La Guérison et la Manifestation de la Puissance de Dieu
Nous croyons que Dieu guérit encore aujourd'hui selon Sa volonté souveraine.
Nous croyons que Jésus-Christ demeure le même hier, aujourd'hui et éternellement.
Nous croyons que Dieu agit par les miracles, les signes et les interventions du Saint-Esprit pour confirmer Son œuvre et glorifier Son nom.
Nous croyons que toute manifestation spirituelle authentique doit glorifier Jésus-Christ et demeurer soumise aux Écritures.

---

### 12. La Famille
Nous croyons que le mariage est une alliance sacrée établie par Dieu entre un homme et une femme.
Nous croyons que la famille est une institution voulue par Dieu pour transmettre la foi, l'amour et les valeurs du Royaume.
Nous croyons que les parents ont la responsabilité d'élever leurs enfants dans la vérité et la crainte du Seigneur.
Nous croyons que l'Église doit soutenir, restaurer et fortifier les familles.

---

### 13. Le Royaume de Dieu
Nous croyons que le Royaume de Dieu est déjà à l'œuvre dans le monde par la présence et la puissance du Saint-Esprit.
Nous croyons que les croyants sont appelés à vivre selon les valeurs du Royaume de Dieu dans tous les domaines de la société.
Nous croyons que Dieu appelle Son peuple à influencer le monde par la lumière, la vérité, la justice et l'amour.

---

### 14. Les Derniers Temps et l'Éternité
Nous croyons à la résurrection des morts.
Nous croyons au retour glorieux de Jésus-Christ.
Nous croyons au jugement final de Dieu sur toute l'humanité.
Nous croyons que ceux qui appartiennent à Jésus-Christ vivront éternellement avec Dieu dans Sa gloire.
Nous croyons que Dieu établira de nouveaux cieux et une nouvelle terre où règneront la justice et la paix éternelles.

---

### 15. Notre Engagement
Nous nous engageons à demeurer fidèles à Jésus-Christ, à Sa Parole et à la direction du Saint-Esprit.
Nous nous engageons à rechercher la présence de Dieu avant toute chose.
Nous nous engageons à vivre dans la sainteté, l'amour et l'humilité.
Nous nous engageons à former des disciples authentiques et matures.
Nous nous engageons à servir notre génération avec fidélité et compassion.
Nous nous engageons à annoncer l'Évangile avec courage et vérité jusqu'aux extrémités de la terre.
Nous nous engageons à bâtir une Église centrée sur Christ, conduite par l'Esprit et fondée sur la Parole de Dieu.

**Nous déclarons que Jésus-Christ est Seigneur, Sauveur, Roi et Chef suprême de l'Église pour les siècles des siècles. Amen.**`;

// Mini-rendu markdown pour la profession de foi (titres ###/##/#, séparateurs ---, **gras**).
function parseBold(text: string, k: string): ReactNode[] {
  return text.split("**").map((part, i) =>
    i % 2 === 1
      ? <strong key={`${k}-b${i}`} style={{ color: "var(--text-primary)" }}>{part}</strong>
      : <span key={`${k}-t${i}`}>{part}</span>,
  );
}
function renderConfession(md: string): ReactNode[] {
  const out: ReactNode[] = [];
  md.split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const k = `c-${idx}`;
    if (line === "---") {
      out.push(<div key={k} style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />);
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={k} style={{ fontSize: 15.5, fontWeight: 800, color: "var(--gold)", margin: "18px 0 10px" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      out.push(<div key={k} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{line.slice(3)}</div>);
    } else if (line.startsWith("# ")) {
      out.push(<h2 key={k} style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 2px" }}>{line.slice(2)}</h2>);
    } else {
      out.push(<p key={k} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 9px" }}>{parseBold(line, k)}</p>);
    }
  });
  return out;
}

export default async function AProposPage() {
  const cms = await getSiteContent("a-propos");
  const heroTitle = cms?.title || "Centre Chrétien Berakah";
  const heroIntro = cms?.body_md || "Une église locale vivante, ancrée dans la Parole, portée par le Saint-Esprit, et consacrée à faire des disciples de Jésus-Christ.";
  const conf = await getSiteContent("confession-foi");
  const confessionMd = conf?.body_md || DEFAULT_CONFESSION_MD;
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px 80px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⛪</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10, lineHeight: 1.2 }}>
          {heroTitle}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 540, margin: "0 auto", whiteSpace: "pre-wrap" }}>
          {heroIntro}
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 48 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Histoire */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📜</span> Notre Histoire
        </h2>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.8, margin: "0 0 16px" }}>
            Le Centre Chrétien Berakah a été fondé avec la conviction que l&apos;église locale est le plan de Dieu pour transformer les individus, les familles et les nations.{" "}
            <strong style={{ color: "var(--text-primary)" }}>Berakah</strong> — mot hébreu signifiant <em>&quot;bénédiction&quot;</em> — reflète notre identité : être un peuple béni pour être une bénédiction.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            Depuis sa création, l&apos;église a grandi en nombre et en maturité spirituelle, développant des ministères de formation, d&apos;intercession, de louange et de service à la communauté. Nous croyons que chaque membre est un ministère — appelé, équipé et envoyé.
          </p>
        </div>
      </div>

      {/* Vision & Mission */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 48 }}>
        <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", padding: "24px 22px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🔭</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>Notre Vision</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Être une église de référence qui forme des disciples de Christ, transforme les familles et impacte les nations par la puissance de l&apos;Évangile.
          </p>
        </div>
        <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", padding: "24px 22px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🎯</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>Notre Mission</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Annoncer l&apos;Évangile de Jésus-Christ, former des disciples bibliquement solides, bâtir la communauté et envoyer des ouvriers dans la moisson.
          </p>
        </div>
      </div>

      {/* Valeurs */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>💎</span> Nos Valeurs Fondamentales
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {VALUES.map((v) => (
            <div key={v.title} style={{ display: "flex", gap: 14, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 20px", alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{v.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{v.title}</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Équipe */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>👤</span> L&apos;Équipe
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TEAM.map((t) => (
            <div key={t.name} style={{ display: "flex", gap: 18, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "22px 24px", alignItems: "flex-start" }}>
              {t.photo ? (
                <img src={t.photo} alt={t.name} decoding="async" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(212,175,55,0.45)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  {t.emoji}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginBottom: 8 }}>{t.role}</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notre Profession de Foi (éditable via CMS — clé "confession-foi", markdown) */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✝️</span> Notre Profession de Foi
        </h2>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
          {renderConfession(confessionMd)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 28, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🤝</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Rejoignez la Famille Berakah</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px", lineHeight: 1.6 }}>
          Vous cherchez une église, une communauté spirituelle, ou vous avez des questions ?<br/>
          Nous serions heureux de vous accueillir.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/contact" style={{ background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Nous contacter →
          </a>
          <a href="/nous-suivre" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Nous suivre
          </a>
        </div>
      </div>

    </div>
  );
}
