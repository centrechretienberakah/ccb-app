"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Reveal, Counter, useCountdown } from "./_landing/anim";

/* ====================================================================
   CENTRE CHRÉTIEN BERAKAH — Landing page publique premium
   Light + Dark mode · branding CCB · animations au scroll
   ==================================================================== */

const BOOTCAMP_DATE = "2026-06-26T08:00:00+01:00";
const BOOTCAMP_URL = "https://bootcamp.centrechretienberakah.com";

export default function LandingClient() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Sync avec le thème global (data-theme posé par le themeScript du layout)
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ccb-theme", next); } catch { /* noop */ }
  }

  return (
    <div className="ccb-land">
      <LandingStyles />
      <Nav theme={theme} onToggle={toggleTheme} />
      <Hero />
      <Stats />
      <Ecosystem />
      <BibleSection />
      <CommunitySection />
      <MeetSection />
      <JdtvSection />
      <BootcampSection />
      <Testimonials />
      <Visionnaire />
      <EventsSection />
      <DonSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ─────────────────────────── NAV ─────────────────────────── */
function Nav({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`ccb-nav ${scrolled ? "ccb-nav-scrolled" : ""}`}>
      <div className="ccb-container ccb-nav-inner">
        <Link href="/" className="ccb-nav-brand">
          <Image src="/logo-ccb.png" alt="CCB" width={38} height={38}
            style={{ borderRadius: "50%", objectFit: "contain" }} />
          <span className="ccb-nav-brand-text">
            <strong>CCB</strong>
            <em>Centre Chrétien Berakah</em>
          </span>
        </Link>
        <div className="ccb-nav-actions">
          <button onClick={onToggle} className="ccb-nav-theme" aria-label="Basculer le thème">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <Link href="/auth/login" className="ccb-nav-link">Se connecter</Link>
          <Link href="/auth/register" className="ccb-btn ccb-btn-sm">Rejoindre</Link>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero() {
  return (
    <header className="ccb-hero">
      {/* fonds décoratifs */}
      <div className="ccb-hero-bg" />
      <div className="ccb-orb ccb-orb-1" />
      <div className="ccb-orb ccb-orb-2" />
      <div className="ccb-grain" />

      <div className="ccb-container ccb-hero-inner">
        <Reveal delay={40}>
          <div className="ccb-hero-logo">
            <span className="ccb-hero-halo" />
            <Image src="/logo-ccb.png" alt="Centre Chrétien Berakah" width={104} height={104}
              priority style={{ borderRadius: "50%", objectFit: "contain", position: "relative", zIndex: 2 }} />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <span className="ccb-pill">FORMER • TRANSFORMER • BÉNIR</span>
        </Reveal>

        <Reveal delay={180}>
          <h1 className="ccb-hero-title">
            <span className="ccb-title-main">Centre Chrétien</span>{" "}
            <span className="ccb-grad ccb-title-accent">Berakah</span>
          </h1>
        </Reveal>

        <Reveal delay={260}>
          <p className="ccb-hero-tagline">
            <span className="ccb-tag-1">Former des disciples. Transformer des vies.</span>
            <span className="ccb-gold-text ccb-tag-2">Manifester la bénédiction.</span>
          </p>
        </Reveal>

        <Reveal delay={340}>
          <p className="ccb-hero-sub">
            Une communauté chrétienne moderne dédiée à la croissance spirituelle,
            au discipulat, à la formation et à l&apos;impact du Royaume de Dieu.
          </p>
        </Reveal>

        <Reveal delay={420}>
          <div className="ccb-hero-cta">
            <Link href="/auth/register" className="ccb-btn ccb-btn-lg">Rejoindre la communauté</Link>
            <Link href="/auth/login" className="ccb-btn ccb-btn-ghost ccb-btn-lg">Découvrir l&apos;application</Link>
          </div>
        </Reveal>

        <div className="ccb-scroll-cue" aria-hidden>
          <span /><em>Découvrir</em>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────── CHIFFRES / FEATURES ─────────────────────── */
const STATS = [
  { icon: "📖", label: "Méditations quotidiennes" },
  { icon: "📚", label: "Plans de lecture biblique" },
  { icon: "🎓", label: "Formations chrétiennes" },
  { icon: "👥", label: "Communauté active" },
  { icon: "🙏", label: "Mur de prière" },
  { icon: "📺", label: "Web TV chrétienne" },
  { icon: "📅", label: "Événements" },
  { icon: "💬", label: "Groupes de travail" },
];
const COUNTERS = [
  { to: 7, suffix: "", label: "Méditations / semaine" },
  { to: 50, suffix: "+", label: "Enseignements vidéo" },
  { to: 12, suffix: "+", label: "Formations" },
  { to: 100, suffix: "%", label: "Centré sur la Parole" },
];

function Stats() {
  return (
    <section className="ccb-section">
      <div className="ccb-container">
        <Reveal><SectionKicker>L&apos;écosystème</SectionKicker></Reveal>
        <Reveal delay={60}>
          <h2 className="ccb-h2">Tout ce dont votre foi a besoin, réuni en un seul lieu</h2>
        </Reveal>

        <div className="ccb-counters">
          {COUNTERS.map((c, i) => (
            <Reveal key={c.label} delay={80 + i * 80} className="ccb-counter">
              <div className="ccb-counter-num">
                <Counter to={c.to} suffix={c.suffix} />
              </div>
              <div className="ccb-counter-label">{c.label}</div>
            </Reveal>
          ))}
        </div>

        <div className="ccb-stats-grid">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={60 + i * 50} className="ccb-stat-card">
              <span className="ccb-stat-icon">{s.icon}</span>
              <span className="ccb-stat-label">{s.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── ÉCOSYSTÈME (cards) ─────────────────────── */
const ECO = [
  { icon: "📖", title: "Méditons Ensemble", desc: "Recevez chaque jour une méditation inspirante basée sur la Parole de Dieu.", href: "/dashboard", g: "linear-gradient(145deg,#92400e,#d97706 55%,#fbbf24)" },
  { icon: "📚", title: "Ma Bible", desc: "Lisez la Bible dans plusieurs versions et suivez des plans de lecture personnalisés.", href: "/bible", g: "linear-gradient(145deg,#1e3a5f,#1e40af 55%,#3b82f6)" },
  { icon: "🙏", title: "Prions Ensemble", desc: "Partagez vos sujets de prière et intercédez avec la communauté.", href: "/prayer", g: "linear-gradient(145deg,#4c0519,#9f1239 55%,#fb7185)" },
  { icon: "👥", title: "Communauté", desc: "Échangez, apprenez et grandissez avec d'autres croyants.", href: "/community", g: "linear-gradient(145deg,#14532d,#16a34a 55%,#4ade80)" },
  { icon: "🎓", title: "Institut Berakah", desc: "Des formations structurées pour développer votre connaissance biblique.", href: "/institut", g: "linear-gradient(145deg,#4C1D95,#7c3aed 55%,#d4af37)" },
  { icon: "📺", title: "Jesus Daily TV", desc: "Prédications, enseignements, lives et contenus inspirants.", href: "/jesus-daily", g: "linear-gradient(145deg,#4C1D95,#5B21B6 55%,#a78bfa)" },
  { icon: "💬", title: "Groupes", desc: "Travaillez, échangez et collaborez dans des groupes publics ou privés.", href: "/community/groups", g: "linear-gradient(145deg,#164e63,#0891b2 55%,#67e8f9)" },
];

function Ecosystem() {
  return (
    <section className="ccb-section ccb-section-soft">
      <div className="ccb-container">
        <Reveal><SectionKicker>Découvrir l&apos;écosystème Berakah</SectionKicker></Reveal>
        <Reveal delay={60}><h2 className="ccb-h2">Un parcours spirituel complet</h2></Reveal>
        <Reveal delay={120}><p className="ccb-lead">Chaque module a été pensé pour vous accompagner, du premier pas dans la foi jusqu&apos;au leadership.</p></Reveal>

        <div className="ccb-eco-grid">
          {ECO.map((c, i) => (
            <Reveal key={c.title} delay={60 + i * 60} as="article">
              <Link href={c.href} className="ccb-eco-card">
                <div className="ccb-eco-icon" style={{ background: c.g }}>{c.icon}</div>
                <h3 className="ccb-eco-title">{c.title}</h3>
                <p className="ccb-eco-desc">{c.desc}</p>
                <span className="ccb-eco-arrow">Découvrir →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── MA BIBLE (mockup) ─────────────────────── */
function BibleSection() {
  return (
    <section className="ccb-section">
      <div className="ccb-container ccb-split">
        <Reveal className="ccb-split-text">
          <SectionKicker>Ma Bible</SectionKicker>
          <h2 className="ccb-h2">Votre lecture biblique, transformée en parcours de croissance</h2>
          <p className="ccb-lead">
            Transformez votre lecture biblique quotidienne en véritable parcours de
            croissance spirituelle.
          </p>
          <ul className="ccb-feature-list">
            <li>📖 Lecture en plusieurs versions</li>
            <li>🗓️ Plans de lecture personnalisés</li>
            <li>📈 Suivi de progression</li>
            <li>⭐ Versets favoris</li>
            <li>✍️ Notes personnelles</li>
          </ul>
          <Link href="/bible" className="ccb-btn">Ouvrir Ma Bible</Link>
        </Reveal>

        <Reveal delay={160} className="ccb-split-visual">
          <div className="ccb-mock ccb-mock-bible">
            <div className="ccb-mock-top">
              <span>📖 Jean 15</span><span className="ccb-mock-badge">LSG</span>
            </div>
            <div className="ccb-mock-verse"><b>1</b> Je suis le vrai cep, et mon Père est le vigneron.</div>
            <div className="ccb-mock-verse ccb-mock-hl"><b>5</b> Je suis le cep, vous êtes les sarments. Celui qui demeure en moi… porte beaucoup de fruit.</div>
            <div className="ccb-mock-progress">
              <div className="ccb-mock-progress-bar"><i style={{ width: "68%" }} /></div>
              <span>Plan « Évangiles » · 68%</span>
            </div>
            <div className="ccb-mock-chips">
              <span>⭐ Favori</span><span>✍️ Note</span><span>🔗 Partager</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── COMMUNAUTÉ ─────────────────────── */
function CommunitySection() {
  return (
    <section className="ccb-section ccb-section-soft">
      <div className="ccb-container ccb-split ccb-split-rev">
        <Reveal delay={160} className="ccb-split-visual">
          <div className="ccb-mock ccb-mock-feed">
            <div className="ccb-feed-item">
              <div className="ccb-feed-av" style={{ background: "linear-gradient(135deg,#5B21B6,#4C1D95)" }}>M</div>
              <div>
                <b>Marie K.</b>
                <p>« Dieu est fidèle ! Gloire à Lui pour ce témoignage 🙌 »</p>
                <span className="ccb-feed-meta">❤️ 42 · 💬 12</span>
              </div>
            </div>
            <div className="ccb-feed-item">
              <div className="ccb-feed-av" style={{ background: "linear-gradient(135deg,#d97706,#fbbf24)" }}>J</div>
              <div>
                <b>Jean-Pierre</b>
                <p>« Rejoignez le groupe Intercession ce soir à 20h 🙏 »</p>
                <span className="ccb-feed-meta">❤️ 28 · 💬 7</span>
              </div>
            </div>
            <div className="ccb-feed-groups">
              <span>👥 Cellule Douala</span><span>🙏 Intercession</span><span>🎓 École de foi</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="ccb-split-text">
          <SectionKicker>Communauté CCB</SectionKicker>
          <h2 className="ccb-h2">Ne marchez plus seul dans votre foi</h2>
          <p className="ccb-lead">
            Rejoignez une communauté chrétienne active et bienveillante : fil d&apos;actualité,
            groupes, échanges, prière et entraide.
          </p>
          <ul className="ccb-feature-list">
            <li>📰 Fil d&apos;actualité spirituel</li>
            <li>👥 Groupes publics & privés</li>
            <li>🙏 Prions ensemble</li>
            <li>🤝 Membres & connexions</li>
          </ul>
          <Link href="/community" className="ccb-btn">Rejoindre la communauté</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── CCB MEET ─────────────────────── */
function MeetSection() {
  return (
    <section className="ccb-section">
      <div className="ccb-container ccb-split">
        <Reveal className="ccb-split-text">
          <SectionKicker>CCB Meet</SectionKicker>
          <h2 className="ccb-h2">Rencontrez, apprenez et priez ensemble, où que vous soyez</h2>
          <p className="ccb-lead">
            Réunions vidéo, partage d&apos;écran, formations live, mentorat et cellules de
            maison — directement dans la plateforme.
          </p>
          <ul className="ccb-feature-list">
            <li>🎥 Réunions vidéo & audio</li>
            <li>🖥️ Partage d&apos;écran</li>
            <li>🎓 Formations en direct</li>
            <li>🏠 Cellules de maison</li>
          </ul>
          <Link href="/community/groups" className="ccb-btn">Démarrer une réunion</Link>
        </Reveal>

        <Reveal delay={160} className="ccb-split-visual">
          <div className="ccb-mock ccb-mock-meet">
            {["#5B21B6", "#d97706", "#16a34a", "#0891b2", "#9f1239", "#7c3aed"].map((c, i) => (
              <div key={i} className="ccb-meet-tile" style={{ background: `linear-gradient(135deg,${c},#1a1525)` }}>
                <span>{["P", "M", "J", "S", "A", "R"][i]}</span>
              </div>
            ))}
            <div className="ccb-meet-bar">
              <span>🎤</span><span>🎥</span><span className="ccb-meet-end">⛔</span><span>💬</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── JESUS DAILY TV (Netflix style) ─────────────────────── */
const JDTV_ROWS = [
  { title: "À la une", items: ["La puissance de la foi", "Marcher dans l'Esprit", "Le Royaume de Dieu", "Identité en Christ"] },
  { title: "Enseignements", items: ["Les fondements", "La prière efficace", "La grâce", "Le discipulat"] },
  { title: "Lives & Podcasts", items: ["Culte du dimanche", "Nuit de prière", "Jesus Daily", "Q&R pastorale"] },
];
const JDTV_GRADS = [
  "linear-gradient(135deg,#4C1D95,#5B21B6)",
  "linear-gradient(135deg,#92400e,#d97706)",
  "linear-gradient(135deg,#164e63,#0891b2)",
  "linear-gradient(135deg,#4c0519,#9f1239)",
];

function JdtvSection() {
  return (
    <section className="ccb-section ccb-jdtv">
      <div className="ccb-container">
        <Reveal><SectionKicker light>Jesus Daily TV</SectionKicker></Reveal>
        <Reveal delay={60}><h2 className="ccb-h2 ccb-h2-light">Votre chaîne chrétienne, à la demande</h2></Reveal>
        <Reveal delay={120}><p className="ccb-lead ccb-lead-light">Lives, replays, enseignements, prédications et podcasts — disponibles partout, tout le temps.</p></Reveal>

        {JDTV_ROWS.map((row, ri) => (
          <Reveal key={row.title} delay={80 + ri * 80} className="ccb-jdtv-row">
            <h3 className="ccb-jdtv-row-title">{row.title}</h3>
            <div className="ccb-jdtv-rail">
              {row.items.map((it, i) => (
                <Link key={it} href="/jesus-daily" className="ccb-jdtv-card" style={{ background: JDTV_GRADS[(i + ri) % JDTV_GRADS.length] }}>
                  <span className="ccb-jdtv-play">▶</span>
                  <span className="ccb-jdtv-card-title">{it}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        ))}

        <Reveal delay={120} style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/jesus-daily" className="ccb-btn ccb-btn-gold">Regarder maintenant</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── BOOTCAMP ─────────────────────── */
function BootcampSection() {
  const c = useCountdown(BOOTCAMP_DATE);
  return (
    <section className="ccb-section ccb-bootcamp">
      <div className="ccb-orb ccb-orb-gold" />
      <div className="ccb-container" style={{ position: "relative", zIndex: 2 }}>
        <Reveal style={{ textAlign: "center" }}>
          <SectionKicker light>L&apos;événement de l&apos;année</SectionKicker>
          <h2 className="ccb-h2 ccb-h2-light" style={{ fontSize: "clamp(2rem,6vw,3.4rem)" }}>BOOTCAMP CCB</h2>
          <p className="ccb-lead ccb-lead-light" style={{ maxWidth: 640, margin: "0 auto" }}>
            Une retraite annuelle de transformation spirituelle, de formation,
            d&apos;activation et de communion fraternelle.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="ccb-countdown">
            {[["Jours", c.days], ["Heures", c.hours], ["Min", c.minutes], ["Sec", c.seconds]].map(([l, v]) => (
              <div key={l as string} className="ccb-cd-cell">
                <div className="ccb-cd-num">{String(v).padStart(2, "0")}</div>
                <div className="ccb-cd-label">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200} style={{ textAlign: "center" }}>
          <p className="ccb-bootcamp-date">📍 26 – 28 Juin 2026 · Douala &amp; en ligne</p>
          <a href={BOOTCAMP_URL} target="_blank" rel="noopener noreferrer" className="ccb-btn ccb-btn-gold ccb-btn-lg">
            Découvrir le Bootcamp
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── TÉMOIGNAGES ─────────────────────── */
const TESTIMONIALS = [
  { name: "Christiana", img: "/testimonie-christiana.jpg", text: "Le CCB a transformé ma manière de vivre ma foi au quotidien. Les méditations me nourrissent chaque matin." },
  { name: "Cabrelle", img: "/testimonie-cabrelle.jpg", text: "Grâce à la communauté, je ne marche plus seule. J'ai trouvé une vraie famille spirituelle." },
  { name: "Daïna", img: "/testimonie-daina.jpg", text: "Les formations de l'Institut Berakah m'ont permis de grandir et de mieux comprendre la Parole." },
  { name: "Kevin", img: "/testimonie-kevin.jpg", text: "Jesus Daily TV et les lives m'accompagnent partout. Un ministère vraiment moderne et puissant." },
];

function Testimonials() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="ccb-section ccb-section-soft">
      <div className="ccb-container">
        <Reveal><SectionKicker>Témoignages</SectionKicker></Reveal>
        <Reveal delay={60}><h2 className="ccb-h2">Des vies transformées</h2></Reveal>

        <Reveal delay={120}>
          <div className="ccb-testi">
            <div className="ccb-testi-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="ccb-testi-card">
                  <div className="ccb-testi-quote">“</div>
                  <blockquote>{t.text}</blockquote>
                  <figcaption>
                    { }
                    <img src={t.img} alt={t.name} />
                    <span><b>{t.name}</b><em>Membre CCB</em></span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="ccb-testi-dots">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={i === idx ? "active" : ""} aria-label={`Témoignage ${i + 1}`} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── LE VISIONNAIRE ─────────────────────── */
function Visionnaire() {
  // Affiche la vraie photo si /rev-elvis.jpg existe, sinon fallback élégant "RE"
  const [imgOk, setImgOk] = useState(true);
  return (
    <section className="ccb-section">
      <div className="ccb-container ccb-split">
        <Reveal className="ccb-split-visual">
          <div className="ccb-vision-photo">
            <div className="ccb-vision-ring" />
            {imgOk ? (
              <img
                src="/rev-elvis-v2.jpg"
                alt="Rév. Elvis NGUIFFO — Visionnaire du Centre Chrétien Berakah"
                className="ccb-vision-img"
                onError={() => setImgOk(false)}
                loading="lazy"
              />
            ) : (
              <div className="ccb-vision-av">RE</div>
            )}
            <span className="ccb-vision-badge">
              <Image src="/logo-officiel.png" alt="" width={34} height={34} />
            </span>
          </div>
        </Reveal>

        <Reveal delay={140} className="ccb-split-text">
          <SectionKicker>Le visionnaire</SectionKicker>
          <h2 className="ccb-h2">Rév. Elvis NGUIFFO</h2>
          <p className="ccb-lead" style={{ marginBottom: 12 }}>
            Visionnaire du Centre Chrétien Berakah.
          </p>
          <p className="ccb-text">
            Serviteur de Dieu passionné par le discipulat et la formation, le Rév. Elvis
            NGUIFFO porte une vision claire : <b>former des disciples solides, transformer
            des vies par la Parole et manifester la bénédiction</b> de Dieu dans toutes les
            sphères de la société.
          </p>
          <p className="ccb-text">
            À travers le CCB, il bâtit un ministère du 21ᵉ siècle qui allie profondeur
            spirituelle et excellence, pour équiper une génération à impacter le monde
            pour le Royaume.
          </p>
          <Link href="/a-propos" className="ccb-btn ccb-btn-ghost">Découvrir le visionnaire</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── ÉVÉNEMENTS ─────────────────────── */
const EVENTS = [
  { icon: "⛪", title: "Culte du Dimanche", date: "Tous les dimanches · 17h30 (Belgique)", tag: "Culte" },
  { icon: "🌙", title: "Nuit de Prière", date: "Prochaine : 29 Mai · 23h30", tag: "Prière" },
  { icon: "🎓", title: "Formation Institut Berakah", date: "Cohorte 2026 · Inscriptions ouvertes", tag: "Formation" },
  { icon: "🔥", title: "Bootcamp CCB 2026", date: "26 – 28 Juin 2026 · Douala & Online", tag: "Bootcamp" },
];

function EventsSection() {
  const c = useCountdown(BOOTCAMP_DATE);
  return (
    <section className="ccb-section ccb-section-soft">
      <div className="ccb-container">
        <Reveal><SectionKicker>Événements à venir</SectionKicker></Reveal>
        <Reveal delay={60}><h2 className="ccb-h2">Vivez la présence de Dieu, ensemble</h2></Reveal>

        <Reveal delay={100}>
          <div className="ccb-next-event">
            <div>
              <span className="ccb-next-tag">🔥 Prochain grand rendez-vous</span>
              <h3>Bootcamp CCB 2026</h3>
              <p>Dans {c.days} jours, {String(c.hours).padStart(2, "0")}h {String(c.minutes).padStart(2, "0")}m</p>
            </div>
            <a href={BOOTCAMP_URL} target="_blank" rel="noopener noreferrer" className="ccb-btn ccb-btn-gold">S&apos;inscrire</a>
          </div>
        </Reveal>

        <div className="ccb-events-list">
          {EVENTS.map((e, i) => (
            <Reveal key={e.title} delay={60 + i * 60} className="ccb-event-row">
              <span className="ccb-event-icon">{e.icon}</span>
              <div className="ccb-event-info">
                <b>{e.title}</b>
                <span>📅 {e.date}</span>
              </div>
              <span className="ccb-event-tag">{e.tag}</span>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120} style={{ textAlign: "center", marginTop: 22 }}>
          <Link href="/events" className="ccb-btn ccb-btn-ghost">Voir le calendrier complet</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── DON ─────────────────────── */
const DONS = [
  { icon: "🅿️", label: "PayPal" },
  { icon: "🟠", label: "Orange Money" },
  { icon: "🟡", label: "MTN Mobile Money" },
  { icon: "💳", label: "Carte bancaire" },
];

function DonSection() {
  return (
    <section className="ccb-section">
      <div className="ccb-container ccb-don">
        <Reveal style={{ textAlign: "center" }}>
          <SectionKicker>Faire un don</SectionKicker>
          <h2 className="ccb-h2">Soutenez l&apos;œuvre du Seigneur</h2>
          <p className="ccb-lead" style={{ maxWidth: 600, margin: "0 auto 8px" }}>
            Votre générosité permet de former des disciples, d&apos;annoncer l&apos;Évangile et de
            bénir des vies. Chaque don compte.
          </p>
        </Reveal>

        <div className="ccb-don-grid">
          {DONS.map((d, i) => (
            <Reveal key={d.label} delay={60 + i * 70} className="ccb-don-card">
              <span className="ccb-don-icon">{d.icon}</span>
              <span>{d.label}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} style={{ textAlign: "center" }}>
          <div className="ccb-don-secure">🔒 Paiements sécurisés &amp; reçus disponibles</div>
          <Link href="/dons" className="ccb-btn ccb-btn-lg">Faire un don</Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── CTA FINAL ─────────────────────── */
function FinalCTA() {
  return (
    <section className="ccb-cta-final">
      <div className="ccb-orb ccb-orb-cta" />
      <div className="ccb-container" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <Reveal>
          <h2 className="ccb-cta-title">Prêt à grandir dans votre foi&nbsp;?</h2>
          <p className="ccb-cta-sub">Rejoignez dès aujourd&apos;hui la communauté Berakah.</p>
          <div className="ccb-hero-cta" style={{ justifyContent: "center" }}>
            <Link href="/auth/register" className="ccb-btn ccb-btn-gold ccb-btn-lg">Créer un compte</Link>
            <Link href="/auth/login" className="ccb-btn ccb-btn-ghost-light ccb-btn-lg">Se connecter</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────── FOOTER ─────────────────────── */
function Footer() {
  return (
    <footer className="ccb-footer">
      <div className="ccb-container ccb-footer-inner">
        <div className="ccb-footer-brand">
          <Image src="/logo-ccb.png" alt="CCB" width={48} height={48} style={{ borderRadius: "50%" }} />
          <strong>Centre Chrétien Berakah</strong>
          <p>Former des disciples. Transformer des vies. Manifester la bénédiction.</p>
        </div>

        <div className="ccb-footer-cols">
          <div>
            <h4>Plateforme</h4>
            <Link href="/dashboard">Méditons Ensemble</Link>
            <Link href="/bible">Ma Bible</Link>
            <Link href="/jesus-daily">Jesus Daily TV</Link>
            <Link href="/community">Communauté</Link>
          </div>
          <div>
            <h4>Ministère</h4>
            <Link href="/a-propos">À propos</Link>
            <Link href="/institut">Institut Berakah</Link>
            <Link href="/events">Événements</Link>
            <Link href="/dons">Faire un don</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <Link href="/contact">Nous joindre</Link>
            <Link href="/nous-suivre">Réseaux sociaux</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/conditions">Conditions d&apos;utilisation</Link>
          </div>
        </div>
      </div>
      <div className="ccb-footer-bottom">
        <span>© {new Date().getFullYear()} Centre Chrétien Berakah. Tous droits réservés.</span>
        <div className="ccb-footer-social">
          <Link href="/nous-suivre" aria-label="Facebook">f</Link>
          <Link href="/nous-suivre" aria-label="YouTube">▶</Link>
          <Link href="/nous-suivre" aria-label="Instagram">◎</Link>
          <Link href="/nous-suivre" aria-label="TikTok">♪</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── petits helpers UI ─────────────────────── */
function SectionKicker({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`ccb-kicker ${light ? "ccb-kicker-light" : ""}`}>{children}</div>;
}

/* ─────────────────────── STYLES ─────────────────────── */
function LandingStyles() {
  return (
    <style>{`
      .ccb-land {
        --v:#5B21B6; --v-light:#7C3AED; --v-dark:#4C1D95;
        --gold:#D4AF37; --gold-dark:#b8971e;
        --bg:#ffffff; --bg-soft:#F5F1E8; --surface:#ffffff;
        --text:#121212; --text-soft:#4a4a4a; --text-muted:#8a8a8a;
        --border:rgba(18,18,18,0.08); --shadow:0 10px 40px rgba(91, 33, 182,0.10);
        background:var(--bg); color:var(--text);
        font-family:'Montserrat',var(--font-montserrat),system-ui,sans-serif;
        overflow-x:hidden;
      }
      [data-theme="dark"] .ccb-land {
        --bg:#0c0913; --bg-soft:#13101d; --surface:#1a1525;
        --text:#f5f1e8; --text-soft:#cbc4d6; --text-muted:#8a8296;
        --border:rgba(255,255,255,0.09); --shadow:0 10px 40px rgba(0,0,0,0.45);
      }
      .ccb-land *{box-sizing:border-box;}
      .ccb-container{width:100%;max-width:1160px;margin:0 auto;padding:0 22px;}
      .ccb-h2{font-family:'Cinzel',var(--font-cinzel),serif;font-weight:800;
        font-size:clamp(1.6rem,4.2vw,2.6rem);line-height:1.18;color:var(--text);
        margin:0 0 14px;letter-spacing:0.01em;}
      .ccb-h2-light{color:#fff;}
      .ccb-lead{font-size:clamp(0.98rem,2.2vw,1.18rem);line-height:1.65;color:var(--text-soft);margin:0 0 22px;max-width:60ch;}
      .ccb-lead-light{color:rgba(255,255,255,0.82);}
      .ccb-text{font-size:0.98rem;line-height:1.75;color:var(--text-soft);margin:0 0 14px;}
      .ccb-kicker{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.22em;
        text-transform:uppercase;color:var(--v);background:rgba(91, 33, 182,0.08);
        padding:7px 14px;border-radius:999px;margin-bottom:16px;border:1px solid rgba(91, 33, 182,0.16);}
      [data-theme="dark"] .ccb-kicker{background:rgba(123,75,196,0.16);color:#c4a7f5;border-color:rgba(123,75,196,0.3);}
      .ccb-kicker-light{color:var(--gold);background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.3);}
      .ccb-grad{background:linear-gradient(120deg,var(--v),var(--v-light) 55%,var(--gold));
        -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
      .ccb-gold-text{color:var(--gold-dark);font-weight:600;}
      [data-theme="dark"] .ccb-gold-text{color:var(--gold);}

      /* Buttons */
      .ccb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
        background:var(--v);color:#fff;font-weight:700;font-size:0.9rem;letter-spacing:0.02em;
        padding:13px 26px;border-radius:999px;text-decoration:none;border:none;cursor:pointer;
        box-shadow:0 8px 24px rgba(91, 33, 182,0.28);transition:transform .2s,box-shadow .2s,background .2s;}
      .ccb-btn:hover{background:var(--v-light);transform:translateY(-2px);box-shadow:0 12px 32px rgba(91, 33, 182,0.36);}
      .ccb-btn-lg{padding:16px 34px;font-size:0.96rem;}
      .ccb-btn-sm{padding:9px 18px;font-size:0.82rem;}
      .ccb-btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#1a1206;box-shadow:0 8px 24px rgba(212,175,55,0.36);}
      .ccb-btn-gold:hover{background:linear-gradient(135deg,#e6c14e,var(--gold));}
      .ccb-btn-ghost{background:transparent;color:var(--v);border:1.5px solid var(--v);box-shadow:none;}
      .ccb-btn-ghost:hover{background:rgba(91, 33, 182,0.07);}
      [data-theme="dark"] .ccb-btn-ghost{color:#c4a7f5;border-color:#7C3AED;}
      .ccb-btn-ghost-light{background:rgba(255,255,255,0.1);color:#fff;border:1.5px solid rgba(255,255,255,0.35);box-shadow:none;}
      .ccb-btn-ghost-light:hover{background:rgba(255,255,255,0.18);}

      /* Nav */
      .ccb-nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:all .3s;padding:14px 0;}
      .ccb-nav-scrolled{background:color-mix(in srgb,var(--bg) 86%,transparent);
        backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        box-shadow:0 1px 0 var(--border);padding:9px 0;}
      .ccb-nav-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      .ccb-nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0;}
      .ccb-nav-brand-text{display:flex;flex-direction:column;line-height:1.1;min-width:0;}
      .ccb-nav-brand-text strong{font-family:'Cinzel',serif;font-size:17px;color:var(--text);letter-spacing:0.08em;}
      .ccb-nav-brand-text em{font-size:9.5px;color:var(--text-muted);font-style:normal;letter-spacing:0.04em;white-space:nowrap;}
      .ccb-nav-actions{display:flex;align-items:center;gap:10px;}
      .ccb-nav-theme{width:38px;height:38px;border-radius:50%;border:1px solid var(--border);
        background:var(--surface);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:transform .2s;}
      .ccb-nav-theme:hover{transform:scale(1.08);}
      .ccb-nav-link{color:var(--text-soft);text-decoration:none;font-weight:600;font-size:0.88rem;padding:8px 6px;}
      .ccb-nav-link:hover{color:var(--v);}
      @media(max-width:560px){.ccb-nav-link{display:none;} .ccb-nav-brand-text em{display:none;}}

      /* Hero */
      .ccb-hero{position:relative;min-height:100dvh;display:flex;align-items:center;
        justify-content:center;text-align:center;padding:110px 0 70px;overflow:hidden;}
      .ccb-hero-bg{position:absolute;inset:0;z-index:0;
        background:radial-gradient(ellipse at 50% 0%,rgba(91, 33, 182,0.14),transparent 60%),
        linear-gradient(170deg,var(--bg) 0%,var(--bg-soft) 60%,var(--bg) 100%);}
      .ccb-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none;z-index:0;}
      .ccb-orb-1{width:520px;height:520px;top:-120px;left:-100px;background:rgba(91, 33, 182,0.16);animation:ccb-glow 7s ease-in-out infinite;}
      .ccb-orb-2{width:440px;height:440px;bottom:-120px;right:-90px;background:rgba(212,175,55,0.14);animation:ccb-glow 9s ease-in-out infinite;}
      .ccb-grain{position:absolute;inset:0;z-index:0;opacity:.4;pointer-events:none;
        background-image:radial-gradient(rgba(91, 33, 182,0.05) 1px,transparent 1px);background-size:22px 22px;}
      .ccb-hero-inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:18px;max-width:780px;}
      .ccb-hero-logo{position:relative;display:inline-flex;align-items:center;justify-content:center;
        width:140px;height:140px;animation:ccb-float 5s ease-in-out infinite;}
      .ccb-hero-halo{position:absolute;inset:0;border-radius:50%;
        background:radial-gradient(circle,rgba(91, 33, 182,0.16),transparent 68%);
        box-shadow:inset 0 0 0 1px rgba(91, 33, 182,0.16);}
      .ccb-pill{font-size:11px;font-weight:700;letter-spacing:0.28em;color:var(--v);
        background:color-mix(in srgb,var(--v) 8%,transparent);padding:8px 18px;border-radius:999px;
        border:1px solid color-mix(in srgb,var(--v) 22%,transparent);}
      [data-theme="dark"] .ccb-pill{color:#c4a7f5;}
      /* TITRE — 1 ligne par défaut (desktop + tablette), nowrap auto-fit */
      .ccb-hero-title{font-family:'Cinzel',serif;font-weight:900;margin:4px 0 0;
        font-size:clamp(1.9rem,5.6vw,3.6rem);line-height:1.04;letter-spacing:0.04em;
        color:var(--text);text-transform:uppercase;white-space:nowrap;}
      .ccb-title-main{color:var(--text);}
      .ccb-title-accent{display:inline;}
      /* TAGLINE — flex colonne ; 1er segment toujours sur une ligne */
      .ccb-hero-tagline{font-family:'Cinzel',serif;font-weight:600;line-height:1.45;
        color:var(--text);margin:6px 0 0;display:flex;flex-direction:column;align-items:center;gap:2px;}
      .ccb-tag-1{white-space:nowrap;font-size:clamp(0.72rem,3.2vw,1.42rem);}
      .ccb-tag-2{font-size:clamp(0.9rem,2.9vw,1.4rem);}
      .ccb-hero-sub{font-size:clamp(0.92rem,2.2vw,1.06rem);line-height:1.7;color:var(--text-soft);
        max-width:600px;margin:6px 0 4px;}
      .ccb-hero-cta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:8px;}
      @media(max-width:520px){.ccb-hero-cta{width:100%;flex-direction:column;} .ccb-hero-cta .ccb-btn{width:100%;}}
      .ccb-scroll-cue{margin-top:30px;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:.7;}
      .ccb-scroll-cue span{width:22px;height:36px;border:2px solid var(--text-muted);border-radius:12px;position:relative;}
      .ccb-scroll-cue span::after{content:"";position:absolute;top:6px;left:50%;width:3px;height:7px;border-radius:2px;
        background:var(--text-muted);transform:translateX(-50%);animation:ccb-scroll 1.6s ease-in-out infinite;}
      .ccb-scroll-cue em{font-style:normal;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-muted);}

      /* Sections */
      .ccb-section{padding:clamp(56px,9vw,108px) 0;position:relative;}
      .ccb-section-soft{background:var(--bg-soft);}
      .ccb-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center;}
      .ccb-split-text{min-width:0;}
      .ccb-split-visual{min-width:0;display:flex;justify-content:center;}
      @media(max-width:860px){.ccb-split{grid-template-columns:1fr;} .ccb-split-rev .ccb-split-text{order:-1;}}
      .ccb-feature-list{list-style:none;padding:0;margin:0 0 22px;display:grid;gap:10px;}
      .ccb-feature-list li{font-size:0.96rem;color:var(--text-soft);font-weight:500;}

      /* Counters + stats */
      .ccb-counters{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:30px 0 36px;}
      @media(max-width:680px){.ccb-counters{grid-template-columns:repeat(2,1fr);}}
      .ccb-counter{text-align:center;padding:18px 10px;background:var(--surface);border:1px solid var(--border);
        border-radius:18px;box-shadow:var(--shadow);}
      .ccb-counter-num{font-family:'Cinzel',serif;font-weight:800;font-size:clamp(1.8rem,5vw,2.6rem);
        background:linear-gradient(120deg,var(--v),var(--gold));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
      .ccb-counter-label{font-size:12px;color:var(--text-muted);margin-top:4px;font-weight:600;}
      .ccb-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
      @media(max-width:760px){.ccb-stats-grid{grid-template-columns:repeat(2,1fr);}}
      .ccb-stat-card{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
        padding:22px 14px;background:var(--surface);border:1px solid var(--border);border-radius:18px;transition:transform .25s,box-shadow .25s;}
      .ccb-stat-card:hover{transform:translateY(-4px);box-shadow:var(--shadow);}
      .ccb-stat-icon{font-size:30px;}
      .ccb-stat-label{font-size:13px;font-weight:600;color:var(--text-soft);line-height:1.3;}

      /* Ecosystem */
      .ccb-eco-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:36px;}
      @media(max-width:900px){.ccb-eco-grid{grid-template-columns:repeat(2,1fr);}}
      @media(max-width:560px){.ccb-eco-grid{grid-template-columns:1fr;}}
      .ccb-eco-card{display:flex;flex-direction:column;gap:10px;padding:26px 22px;border-radius:22px;
        background:var(--surface);border:1px solid var(--border);text-decoration:none;
        transition:transform .25s,box-shadow .25s,border-color .25s;height:100%;}
      .ccb-eco-card:hover{transform:translateY(-6px);box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--v) 35%,transparent);}
      .ccb-eco-icon{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;
        font-size:26px;box-shadow:0 6px 18px rgba(0,0,0,0.12);}
      .ccb-eco-title{font-family:'Cinzel',serif;font-weight:700;font-size:1.18rem;color:var(--text);margin:4px 0 0;}
      .ccb-eco-desc{font-size:0.92rem;line-height:1.55;color:var(--text-soft);margin:0;flex:1;}
      .ccb-eco-arrow{font-size:0.85rem;font-weight:700;color:var(--v);margin-top:6px;}
      [data-theme="dark"] .ccb-eco-arrow{color:#c4a7f5;}

      /* Mockups */
      .ccb-mock{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--border);
        border-radius:26px;padding:20px;box-shadow:var(--shadow);}
      .ccb-mock-top{display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--text);margin-bottom:14px;}
      .ccb-mock-badge{font-size:11px;background:var(--v);color:#fff;padding:3px 10px;border-radius:999px;}
      .ccb-mock-verse{font-size:0.92rem;line-height:1.6;color:var(--text-soft);padding:8px 10px;border-radius:10px;margin-bottom:8px;}
      .ccb-mock-verse b{color:var(--v);margin-right:6px;}
      .ccb-mock-hl{background:rgba(212,175,55,0.14);border-left:3px solid var(--gold);color:var(--text);}
      .ccb-mock-progress{margin:14px 0 12px;}
      .ccb-mock-progress-bar{height:8px;border-radius:999px;background:var(--bg-soft);overflow:hidden;margin-bottom:6px;}
      .ccb-mock-progress-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--v),var(--gold));border-radius:999px;}
      .ccb-mock-progress span{font-size:11px;color:var(--text-muted);}
      .ccb-mock-chips{display:flex;gap:8px;flex-wrap:wrap;}
      .ccb-mock-chips span{font-size:11px;font-weight:600;color:var(--text-soft);background:var(--bg-soft);padding:6px 11px;border-radius:999px;}

      .ccb-mock-feed{display:flex;flex-direction:column;gap:12px;}
      .ccb-feed-item{display:flex;gap:11px;}
      .ccb-feed-av{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;}
      .ccb-feed-item b{font-size:0.9rem;color:var(--text);}
      .ccb-feed-item p{font-size:0.86rem;color:var(--text-soft);margin:3px 0;line-height:1.45;}
      .ccb-feed-meta{font-size:11px;color:var(--text-muted);}
      .ccb-feed-groups{display:flex;gap:7px;flex-wrap:wrap;margin-top:4px;}
      .ccb-feed-groups span{font-size:11px;font-weight:600;color:var(--v);background:rgba(91, 33, 182,0.08);padding:6px 11px;border-radius:999px;}
      [data-theme="dark"] .ccb-feed-groups span{color:#c4a7f5;background:rgba(123,75,196,0.16);}

      .ccb-mock-meet{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:400px;}
      .ccb-meet-tile{aspect-ratio:1;border-radius:14px;display:flex;align-items:center;justify-content:center;}
      .ccb-meet-tile span{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;}
      .ccb-meet-bar{grid-column:1/-1;display:flex;justify-content:center;gap:14px;padding:12px;background:var(--bg-soft);border-radius:14px;margin-top:2px;font-size:18px;}
      .ccb-meet-end{filter:hue-rotate(0);}

      /* JDTV */
      .ccb-jdtv{background:#0b0712;color:#fff;}
      [data-theme="dark"] .ccb-jdtv{background:#070510;}
      .ccb-jdtv-row{margin-top:30px;}
      .ccb-jdtv-row-title{font-family:'Cinzel',serif;font-weight:700;font-size:1.1rem;color:#fff;margin:0 0 12px;}
      .ccb-jdtv-rail{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none;scroll-snap-type:x mandatory;}
      .ccb-jdtv-rail::-webkit-scrollbar{display:none;}
      .ccb-jdtv-card{position:relative;flex:0 0 200px;height:118px;border-radius:14px;text-decoration:none;
        display:flex;align-items:flex-end;padding:13px;scroll-snap-align:start;overflow:hidden;
        box-shadow:0 8px 22px rgba(0,0,0,0.4);transition:transform .25s;}
      .ccb-jdtv-card:hover{transform:scale(1.04);}
      .ccb-jdtv-play{position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;
        background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;}
      .ccb-jdtv-card-title{font-size:0.92rem;font-weight:700;color:#fff;line-height:1.25;text-shadow:0 1px 6px rgba(0,0,0,0.6);}

      /* Bootcamp */
      .ccb-bootcamp{background:linear-gradient(160deg,#2a1458,#5B21B6 55%,#4C1D95);color:#fff;overflow:hidden;}
      .ccb-orb-gold{width:560px;height:560px;top:-160px;right:-120px;background:rgba(212,175,55,0.22);}
      .ccb-countdown{display:flex;justify-content:center;gap:14px;margin:34px 0;}
      .ccb-cd-cell{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:18px;
        padding:18px 14px;min-width:78px;text-align:center;backdrop-filter:blur(8px);}
      @media(max-width:480px){.ccb-cd-cell{min-width:64px;padding:14px 8px;}}
      .ccb-cd-num{font-family:'Cinzel',serif;font-weight:800;font-size:clamp(1.7rem,7vw,2.6rem);color:var(--gold);line-height:1;}
      .ccb-cd-label{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.72);margin-top:6px;}
      .ccb-bootcamp-date{font-size:1rem;font-weight:600;color:rgba(255,255,255,0.92);margin:0 0 20px;}

      /* Testimonials */
      .ccb-testi{margin-top:30px;overflow:hidden;}
      .ccb-testi-track{display:flex;transition:transform .6s cubic-bezier(.22,1,.36,1);}
      .ccb-testi-card{flex:0 0 100%;padding:0 4px;}
      .ccb-testi-card{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:34px 30px;
        box-shadow:var(--shadow);max-width:720px;margin:0 auto;position:relative;}
      .ccb-testi-quote{font-family:'Cinzel',serif;font-size:60px;line-height:0.6;color:var(--gold);opacity:.6;height:30px;}
      .ccb-testi-card blockquote{font-size:clamp(1.05rem,2.6vw,1.32rem);line-height:1.6;color:var(--text);
        margin:0 0 22px;font-weight:500;font-style:italic;}
      .ccb-testi-card figcaption{display:flex;align-items:center;gap:12px;}
      .ccb-testi-card figcaption img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);}
      .ccb-testi-card figcaption span{display:flex;flex-direction:column;}
      .ccb-testi-card figcaption b{color:var(--text);font-size:0.98rem;}
      .ccb-testi-card figcaption em{color:var(--text-muted);font-size:0.82rem;font-style:normal;}
      .ccb-testi-dots{display:flex;justify-content:center;gap:8px;margin-top:22px;}
      .ccb-testi-dots button{width:9px;height:9px;border-radius:50%;border:none;background:var(--border);cursor:pointer;transition:all .25s;}
      .ccb-testi-dots button.active{background:var(--v);width:26px;border-radius:999px;}

      /* Visionnaire */
      .ccb-vision-photo{position:relative;width:230px;height:230px;display:flex;align-items:center;justify-content:center;}
      .ccb-vision-ring{position:absolute;inset:0;border-radius:50%;
        background:conic-gradient(from 180deg,var(--v),var(--gold),var(--v));padding:4px;
        -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 0);mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 0);
        animation:ccb-spin 14s linear infinite;}
      .ccb-vision-av{width:198px;height:198px;border-radius:50%;background:linear-gradient(145deg,var(--v-dark),var(--v));
        display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-weight:800;font-size:64px;color:var(--gold);}
      .ccb-vision-img{width:198px;height:198px;border-radius:50%;object-fit:cover;object-position:center top;
        box-shadow:0 10px 30px rgba(91, 33, 182,0.22);}
      .ccb-vision-badge{position:absolute;bottom:14px;right:14px;width:50px;height:50px;border-radius:50%;background:var(--surface);
        display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.2);}

      /* Events */
      .ccb-next-event{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;
        background:linear-gradient(135deg,var(--v),var(--v-dark));color:#fff;border-radius:22px;padding:24px 26px;margin:28px 0 22px;box-shadow:var(--shadow);}
      .ccb-next-tag{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);}
      .ccb-next-event h3{font-family:'Cinzel',serif;font-size:1.4rem;margin:6px 0 4px;color:#fff;}
      .ccb-next-event p{margin:0;color:rgba(255,255,255,0.85);font-size:0.92rem;}
      .ccb-events-list{display:flex;flex-direction:column;gap:11px;}
      .ccb-event-row{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--border);
        border-radius:16px;padding:15px 18px;transition:transform .2s;}
      .ccb-event-row:hover{transform:translateX(4px);}
      .ccb-event-icon{font-size:24px;}
      .ccb-event-info{flex:1;display:flex;flex-direction:column;min-width:0;}
      .ccb-event-info b{color:var(--text);font-size:0.98rem;}
      .ccb-event-info span{color:var(--text-muted);font-size:0.82rem;}
      .ccb-event-tag{font-size:11px;font-weight:700;color:var(--v);background:rgba(91, 33, 182,0.08);padding:5px 12px;border-radius:999px;white-space:nowrap;}
      [data-theme="dark"] .ccb-event-tag{color:#c4a7f5;background:rgba(123,75,196,0.16);}

      /* Don */
      .ccb-don-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:30px 0;}
      @media(max-width:680px){.ccb-don-grid{grid-template-columns:repeat(2,1fr);}}
      .ccb-don-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 14px;text-align:center;
        background:var(--surface);border:1px solid var(--border);border-radius:18px;font-weight:700;color:var(--text);font-size:0.9rem;transition:transform .2s,box-shadow .2s;}
      .ccb-don-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);}
      .ccb-don-icon{font-size:30px;}
      .ccb-don-secure{font-size:0.85rem;color:var(--text-muted);margin-bottom:16px;}

      /* CTA final */
      .ccb-cta-final{position:relative;overflow:hidden;padding:clamp(60px,10vw,120px) 0;
        background:linear-gradient(135deg,var(--v-dark),var(--v) 60%,#6d36c9);color:#fff;}
      .ccb-orb-cta{width:500px;height:500px;top:-150px;left:50%;transform:translateX(-50%);background:rgba(212,175,55,0.18);}
      .ccb-cta-title{font-family:'Cinzel',serif;font-weight:900;font-size:clamp(1.8rem,5.5vw,3.2rem);margin:0 0 12px;color:#fff;}
      .ccb-cta-sub{font-size:clamp(1rem,2.4vw,1.2rem);color:rgba(255,255,255,0.86);margin:0 0 28px;}

      /* Footer */
      .ccb-footer{background:var(--bg-soft);border-top:1px solid var(--border);padding:56px 0 0;}
      .ccb-footer-inner{display:grid;grid-template-columns:1.3fr 2fr;gap:40px;padding-bottom:40px;}
      @media(max-width:760px){.ccb-footer-inner{grid-template-columns:1fr;gap:28px;}}
      .ccb-footer-brand strong{display:block;font-family:'Cinzel',serif;font-size:1.1rem;color:var(--text);margin:10px 0 8px;}
      .ccb-footer-brand p{font-size:0.88rem;color:var(--text-soft);line-height:1.6;max-width:34ch;margin:0;}
      .ccb-footer-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
      @media(max-width:520px){.ccb-footer-cols{grid-template-columns:1fr 1fr;}}
      .ccb-footer-cols h4{font-size:0.78rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin:0 0 12px;}
      .ccb-footer-cols a{display:block;color:var(--text-soft);text-decoration:none;font-size:0.9rem;margin-bottom:9px;transition:color .2s;}
      .ccb-footer-cols a:hover{color:var(--v);}
      .ccb-footer-bottom{border-top:1px solid var(--border);padding:18px 22px;display:flex;justify-content:space-between;
        align-items:center;gap:14px;flex-wrap:wrap;max-width:1160px;margin:0 auto;}
      .ccb-footer-bottom span{font-size:0.8rem;color:var(--text-muted);}
      .ccb-footer-social{display:flex;gap:10px;}
      .ccb-footer-social a{width:34px;height:34px;border-radius:50%;background:var(--surface);border:1px solid var(--border);
        display:flex;align-items:center;justify-content:center;color:var(--text-soft);text-decoration:none;font-weight:700;transition:all .2s;}
      .ccb-footer-social a:hover{background:var(--v);color:#fff;transform:translateY(-2px);}

      /* =========================================================
         OPTIMISATION RESPONSIVE — mobile · tablette · desktop · TV
         ========================================================= */

      /* Scroll fluide + ancrage propre sous la nav fixe */
      html{scroll-behavior:smooth;}
      .ccb-land section{scroll-margin-top:72px;}

      /* ---- TABLETTE (768 – 1024px) ---- */
      @media(min-width:768px) and (max-width:1024px){
        .ccb-container{padding:0 30px;}
        .ccb-eco-grid{grid-template-columns:repeat(2,1fr);gap:16px;}
        .ccb-stats-grid{grid-template-columns:repeat(4,1fr);}
        .ccb-counters{grid-template-columns:repeat(4,1fr);}
        .ccb-mock{max-width:340px;}
      }

      /* ---- MOBILE GÉNÉRAL (≤ 768px) ---- */
      @media(max-width:768px){
        .ccb-section{padding:clamp(46px,11vw,72px) 0;}
        .ccb-hero{min-height:auto;padding:96px 0 56px;}
        .ccb-hero-inner{gap:15px;}
        .ccb-hero-logo{width:112px;height:112px;}
        .ccb-h2{font-size:clamp(1.45rem,6.4vw,2rem);}
        .ccb-lead{font-size:1rem;}
        .ccb-split{gap:30px;}
        /* mockups toujours centrés et pas trop larges */
        .ccb-mock{max-width:100%;}
        .ccb-split-visual{width:100%;}
        /* JDTV : cartes un peu plus petites pour voir le "peek" suivant */
        .ccb-jdtv-card{flex:0 0 165px;height:104px;}
        /* Témoignages : padding réduit */
        .ccb-testi-card{padding:26px 20px;}
        /* Événement vedette : empile proprement */
        .ccb-next-event{flex-direction:column;align-items:flex-start;}
        .ccb-next-event .ccb-btn{width:100%;}
        /* Footer bottom empilé */
        .ccb-footer-bottom{flex-direction:column;align-items:flex-start;gap:12px;}
      }

      /* ---- TITRE EN 2 LIGNES SUR MOBILE (≤ 600px) ---- */
      /* Desktop + tablette : "Centre Chrétien Berakah" sur une seule ligne.
         Mobile : "Centre Chrétien" (ligne 1) + "Berakah" (ligne 2). */
      @media(max-width:600px){
        .ccb-hero-title{white-space:normal;font-size:clamp(2.4rem,12vw,3.4rem);line-height:1.06;}
        .ccb-title-main{display:block;font-size:0.56em;letter-spacing:0.1em;margin-bottom:2px;}
        .ccb-title-accent{display:block;}
      }

      /* ---- PETIT MOBILE (≤ 430px) ---- */
      @media(max-width:430px){
        .ccb-container{padding:0 16px;}
        .ccb-section{padding:42px 0;}
        .ccb-h2{font-size:1.42rem;line-height:1.22;}
        .ccb-lead{font-size:0.96rem;}
        .ccb-hero-sub{font-size:0.92rem;}
        .ccb-pill{font-size:9.5px;letter-spacing:0.2em;padding:7px 14px;}
        /* compteurs + stats en 2 colonnes serrées */
        .ccb-counters{grid-template-columns:repeat(2,1fr);gap:10px;}
        .ccb-counter{padding:14px 8px;}
        .ccb-stats-grid{grid-template-columns:repeat(2,1fr);gap:10px;}
        .ccb-stat-card{padding:18px 10px;}
        .ccb-eco-card{padding:22px 18px;}
        /* boutons pleine largeur, cibles tactiles confortables */
        .ccb-btn{padding:14px 22px;}
        .ccb-btn-lg{padding:16px 24px;width:100%;}
        /* visionnaire un peu plus petit */
        .ccb-vision-photo{width:200px;height:200px;}
        .ccb-vision-av,.ccb-vision-img{width:172px;height:172px;}
        .ccb-vision-av{font-size:54px;}
        /* don en 2 colonnes */
        .ccb-don-grid{grid-template-columns:repeat(2,1fr);}
        /* countdown bootcamp compact */
        .ccb-countdown{gap:8px;}
        .ccb-cd-cell{min-width:60px;padding:12px 6px;}
        /* nav : resserre */
        .ccb-nav-actions{gap:7px;}
        .ccb-btn-sm{padding:9px 14px;font-size:0.8rem;}
      }

      /* ---- GRAND DESKTOP / TV (≥ 1440px) ---- */
      @media(min-width:1440px){
        .ccb-container{max-width:1280px;}
        .ccb-h2{font-size:2.8rem;}
        .ccb-hero-inner{max-width:860px;}
        .ccb-eco-grid{gap:22px;}
      }

      /* keyframes */
      @keyframes ccb-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
      @keyframes ccb-glow{0%,100%{opacity:.5;transform:scale(1);}50%{opacity:.8;transform:scale(1.08);}}
      @keyframes ccb-spin{to{transform:rotate(360deg);}}
      @keyframes ccb-scroll{0%{opacity:0;transform:translate(-50%,0);}50%{opacity:1;}100%{opacity:0;transform:translate(-50%,8px);}}
      @media(prefers-reduced-motion:reduce){
        html{scroll-behavior:auto;}
        .ccb-land *{animation:none !important;}
      }
    `}</style>
  );
}
