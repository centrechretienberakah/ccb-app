import Link from "next/link";
import Image from "next/image";

// =====================================================
// DATA
// =====================================================

const stats = [
  { value: "500+", label: "Membres actifs" },
  { value: "21", label: "Modules spirituels" },
  { value: "5+", label: "Années de ministère" },
  { value: "∞", label: "Bénédictions" },
];

const features = [
  {
    icon: "📖",
    title: "Plans de Lecture",
    description:
      "Parcourez la Bible avec des plans structurés adaptés à votre niveau spirituel.",
    href: "/bible",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: "🎓",
    title: "École de Disciples",
    description:
      "Cours en ligne complets pour grandir dans la foi et dans la connaissance de Dieu.",
    href: "/courses",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: "🙏",
    title: "Requêtes de Prière",
    description:
      "Partagez vos besoins et intercédez pour votre famille spirituelle.",
    href: "/prayer",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: "🔴",
    title: "Live & Cultes",
    description:
      "Suivez les cultes en direct et accédez aux rediffusions des messages.",
    href: "/live",
    color: "from-red-500 to-orange-500",
  },
  {
    icon: "☀️",
    title: "Dévotion du Jour",
    description:
      "Une parole quotidienne, une méditation et une prière pour commencer votre journée.",
    href: "/devotion",
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: "🤝",
    title: "Espace Communauté",
    description:
      "Connectez-vous avec les membres, partagez des témoignages et grandissez ensemble.",
    href: "/community",
    color: "from-green-500 to-teal-500",
  },
];

const upcomingEvents = [
  {
    date: "10",
    month: "MAI",
    title: "Bootcamp Annuel CCB 2026",
    subtitle: "SEMBLABLE À CHRIST",
    location: "Yaoundé, Cameroun",
    type: "special",
  },
  {
    date: "04",
    month: "MAI",
    title: "Culte du Dimanche",
    subtitle: "Rejoignez-nous chaque semaine",
    location: "En ligne & En présentiel",
    type: "regular",
  },
  {
    date: "07",
    month: "MAI",
    title: "Nuit de Prière",
    subtitle: "Intercession collective",
    location: "Centre Berakah",
    type: "prayer",
  },
];

const testimonies = [
  {
    name: "Marie K.",
    text: "Grâce à CCB, j'ai trouvé ma vocation et ma famille spirituelle. Dieu a transformé ma vie !",
    role: "Membre depuis 3 ans",
    avatar: "M",
  },
  {
    name: "Jean-Paul N.",
    text: "Les cours de disciples m'ont donné les bases solides dont j'avais besoin pour ma foi.",
    role: "Leader de cellule",
    avatar: "J",
  },
  {
    name: "Esther T.",
    text: "Le JESUS DAILY me rappelle chaque jour la puissance de la Parole de Dieu.",
    role: "Membre actif",
    avatar: "E",
  },
];

// =====================================================
// COMPONENTS
// =====================================================

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#0a0614]/90 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo-ccb.png"
            alt="Centre Chrétien Berakah"
            width={40}
            height={40}
            className="rounded-full object-contain"
            priority
          />
          <span
            className="font-cinzel font-bold text-base hidden sm:block"
            style={{ color: "var(--violet)", letterSpacing: "0.05em" }}
          >
            BERAKAH
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {[
            ["Accueil", "/"],
            ["Dévotions", "/devotion"],
            ["Cours", "/courses"],
            ["Événements", "/events"],
            ["À propos", "/about"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-[var(--text-secondary)] hover:text-[var(--violet)] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-[var(--violet)] hover:text-[var(--violet-dark)] transition-colors px-3 py-1.5"
          >
            Connexion
          </Link>
          <Link
            href="/auth/register"
            className="btn-primary text-sm py-2 px-4"
            style={{ background: "var(--violet)", color: "white", borderRadius: "var(--radius-full)", fontWeight: 600 }}
          >
            Rejoindre
          </Link>
        </div>
      </div>
    </nav>
  );
}

// =====================================================
// PAGE
// =====================================================

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      {/* ─── HERO ─── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, var(--violet-dark) 0%, var(--violet) 40%, #7c3aed 70%, var(--violet-light) 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10"
          style={{ background: "var(--gold)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-20 left-10 w-48 h-48 rounded-full opacity-15"
          style={{ background: "var(--gold-light)", filter: "blur(40px)" }}
        />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-8"
            style={{
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "var(--gold)",
            }}
          >
            ✦ Former · Transformer · Bénir ✦
          </div>

          {/* Title */}
          <h1
            className="font-cinzel font-bold text-white mb-6"
            style={{
              fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
              lineHeight: 1.15,
              letterSpacing: "0.03em",
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            Centre Chrétien{" "}
            <span style={{ color: "var(--gold)" }}>Berakah</span>
          </h1>

          {/* Tagline */}
          <p
            className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-body)", fontWeight: 300 }}
          >
            Former des disciples, Transformer des vies,{" "}
            <span style={{ color: "var(--gold-light)", fontWeight: 500 }}>
              Manifester la bénédiction
            </span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-sm tracking-wide transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                color: "var(--violet-dark)",
                boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
              }}
            >
              ✨ Rejoindre la famille CCB
            </Link>
            <Link
              href="/live"
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
              }}
            >
              🔴 Regarder le Live
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="font-cinzel font-bold text-2xl md:text-3xl"
                  style={{ color: "var(--gold)" }}
                >
                  {s.value}
                </div>
                <div className="text-white/60 text-xs mt-1 uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div
            className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1"
          >
            <div
              className="w-1 h-2 rounded-full bg-white/60"
              style={{ animation: "float 2s ease-in-out infinite" }}
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-20 px-4 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--violet)" }}
            >
              Notre Plateforme
            </span>
            <h2
              className="font-cinzel font-bold mt-3 mb-4"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                color: "var(--text-primary)",
              }}
            >
              Tout pour votre croissance{" "}
              <span style={{ color: "var(--violet)" }}>spirituelle</span>
            </h2>
            <p
              className="max-w-xl mx-auto"
              style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}
            >
              Des outils conçus pour vous accompagner chaque jour dans votre
              marche avec Dieu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group card-ccb cursor-pointer"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.5rem",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{
                    background: "var(--violet-pale)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  className="font-semibold text-base mb-2"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {f.description}
                </p>
                <div
                  className="mt-4 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
                  style={{ color: "var(--violet)" }}
                >
                  Découvrir <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EVENTS ─── */}
      <section
        className="py-20 px-4"
        style={{ background: "var(--violet-50)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--violet)" }}
            >
              Agenda
            </span>
            <h2
              className="font-cinzel font-bold mt-3"
              style={{
                fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                color: "var(--text-primary)",
              }}
            >
              Événements à venir
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {upcomingEvents.map((e) => (
              <div
                key={e.title}
                className="flex items-center gap-5 p-5 rounded-2xl bg-white dark:bg-[var(--surface)] border border-[var(--border)] hover:shadow-md transition-all cursor-pointer"
              >
                {/* Date badge */}
                <div
                  className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{
                    background:
                      e.type === "special"
                        ? "linear-gradient(135deg, var(--gold-dark), var(--gold))"
                        : "var(--violet-pale)",
                  }}
                >
                  <span
                    className="font-cinzel font-bold text-xl leading-none"
                    style={{
                      color: e.type === "special" ? "var(--violet-dark)" : "var(--violet)",
                    }}
                  >
                    {e.date}
                  </span>
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{
                      color: e.type === "special" ? "var(--violet-dark)" : "var(--violet-light)",
                    }}
                  >
                    {e.month}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4
                    className="font-bold text-sm truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {e.title}
                  </h4>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--violet)" }}
                  >
                    {e.subtitle}
                  </p>
                  <p
                    className="text-xs mt-1 flex items-center gap-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    📍 {e.location}
                  </p>
                </div>

                <div
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    background: "var(--violet-pale)",
                    color: "var(--violet)",
                  }}
                >
                  Détails →
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--violet)",
                color: "white",
                boxShadow: "var(--shadow-md)",
              }}
            >
              Voir tous les événements
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIES ─── */}
      <section className="py-20 px-4 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--gold)" }}
            >
              Témoignages
            </span>
            <h2
              className="font-cinzel font-bold mt-3"
              style={{
                fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                color: "var(--text-primary)",
              }}
            >
              Des vies transformées
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonies.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-2xl"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: "var(--violet)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                <div
                  className="mt-3 flex gap-0.5"
                  style={{ color: "var(--gold)" }}
                >
                  {"★★★★★"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section
        className="py-20 px-4"
        style={{
          background:
            "linear-gradient(135deg, var(--violet-dark) 0%, var(--violet) 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="text-4xl mb-4"
            style={{ animation: "float 3s ease-in-out infinite" }}
          >
            🕊️
          </div>
          <h2
            className="font-cinzel font-bold text-white mb-4"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.5rem)" }}
          >
            Prêt à commencer votre voyage ?
          </h2>
          <p className="text-white/75 mb-8 leading-relaxed">
            Rejoignez des centaines de croyants qui grandissent ensemble dans la
            foi et la connaissance de Dieu.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="px-8 py-4 rounded-full font-bold text-sm transition-all hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                color: "var(--violet-dark)",
                boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
              }}
            >
              Créer un compte gratuit
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 rounded-full font-semibold text-sm transition-all hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
              }}
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer
        className="py-10 px-4"
        style={{
          background: "var(--violet-dark)",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-ccb.png"
                alt="Centre Chrétien Berakah"
                width={32}
                height={32}
                className="rounded-full object-contain"
              />
              <span
                className="font-cinzel font-bold text-sm"
                style={{ color: "var(--gold)" }}
              >
                CENTRE CHRÉTIEN BERAKAH
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs">
              {[
                ["Confidentialité", "/privacy"],
                ["Conditions", "/terms"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="text-xs text-center">
              © 2026 Centre Chrétien Berakah.{" "}
              <span style={{ color: "var(--gold-light)" }}>
                Tous droits réservés.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
                      