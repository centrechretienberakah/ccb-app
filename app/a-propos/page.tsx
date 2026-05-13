import { Metadata } from "next";

export const metadata: Metadata = { title: "À Propos — Centre Chrétien Berakah" };

const VALUES = [
  { icon: "📖", title: "Parole de Dieu", desc: "Toute doctrine et pratique est fondée sur la Bible, Parole inspirée et infaillible de Dieu." },
  { icon: "🙏", title: "Prière & Intercession", desc: "La prière est le pilier de notre vie spirituelle individuelle et collective." },
  { icon: "🕊️", title: "Saint-Esprit", desc: "Nous croyons aux dons et au mouvement du Saint-Esprit dans l'église aujourd'hui." },
  { icon: "🤝", title: "Communauté", desc: "Nous nous accompagnons mutuellement dans la croissance, la guérison et la foi." },
  { icon: "🌍", title: "Mission", desc: "L'évangélisation et l'envoi de disciples sont au cœur de notre appel." },
  { icon: "🎓", title: "Formation", desc: "Nous investissons dans la formation spirituelle, théologique et pratique des membres." },
];

const TEAM = [
  { name: "Rév. Elvis NGUIFFO", role: "Pasteur Principal & Fondateur", desc: "Consacré au service du Seigneur depuis plus de 15 ans, le Révérend Elvis NGUIFFO a reçu l'appel pastoral avec la vision de bâtir une église locale forte, enracinée dans la Parole et animée par le Saint-Esprit. Diplômé en théologie et en leadership chrétien, il est aussi époux et père de famille, modèle de la foi vécue au quotidien.", emoji: "👤" },
  { name: "L'Équipe Pastorale", role: "Anciens & Responsables", desc: "L'église est gouvernée par un collège d'anciens formés et dédiés, chacun responsable d'un département : jeunesse, femmes, hommes, intercession, louange, et évangélisation.", emoji: "👥" },
];

const STATS = [
  { value: "2010", label: "Année de fondation" },
  { value: "500+", label: "Membres actifs" },
  { value: "10+", label: "Groupes de cellule" },
  { value: "3", label: "Services par semaine" },
];

const BELIEFS = [
  "La Bible est la Parole inspirée et infaillible de Dieu, autorité suprême en matière de foi et de vie.",
  "Il n'y a qu'un seul Dieu, éternellement existant en trois personnes : Père, Fils et Saint-Esprit.",
  "Jésus-Christ est né d'une vierge, a vécu sans péché, est mort pour nos péchés et est ressuscité corporellement.",
  "Le salut est reçu par la grâce, par la foi en Jésus-Christ seul — et non par les œuvres.",
  "Le baptême d'eau par immersion est l'expression publique de la foi et de la mort au péché.",
  "Le baptême du Saint-Esprit avec les dons spirituels est disponible pour les croyants aujourd'hui.",
  "Jésus-Christ reviendra glorieusement pour établir son règne éternel.",
];

export default function AProposPage() {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px 80px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⛪</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10, lineHeight: 1.2 }}>
          Centre Chrétien Berakah
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          Une église locale vivante, ancrée dans la Parole, portée par le Saint-Esprit, et consacrée à faire des disciples de Jésus-Christ.
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 48 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                {t.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginBottom: 8 }}>{t.role}</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ce que nous croyons */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✝️</span> Ce Que Nous Croyons
        </h2>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
          {BELIEFS.map((belief, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < BELIEFS.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gold)", flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{belief}</p>
            </div>
          ))}
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
