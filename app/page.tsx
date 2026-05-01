"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

// ─── Design tokens ────────────────────────────────────────────
const C = {
  bg: "#07040f",
  bgAlt: "#0d0820",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.07)",
  border: "rgba(212,175,55,0.18)",
  borderSoft: "rgba(255,255,255,0.07)",
  gold: "#d4af37",
  goldLight: "#f0d060",
  goldDark: "#b8941f",
  violet: "#7c3aed",
  violetLight: "#a78bfa",
  violetGlow: "rgba(124,58,237,0.25)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.70)",
  textMuted: "rgba(255,255,255,0.40)",
  goldMuted: "rgba(212,175,55,0.60)",
};

// ─── Data ────────────────────────────────────────────────────
const navLinks = [
  ["Accueil", "/"],
  ["Dévotions", "/devotion"],
  ["Cours", "/courses"],
  ["Événements", "/events"],
  ["À propos", "/about"],
];

const features = [
  {
    symbol: "✦",
    title: "Plans de Lecture",
    description: "Parcourez la Bible avec des plans structurés adaptés à votre niveau spirituel.",
    href: "/bible",
  },
  {
    symbol: "◈",
    title: "École de Disciples",
    description: "Cours en ligne complets pour grandir dans la foi et la connaissance de Dieu.",
    href: "/courses",
  },
  {
    symbol: "◇",
    title: "Requêtes de Prière",
    description: "Partagez vos besoins et intercédez pour votre famille spirituelle.",
    href: "/prayer",
  },
  {
    symbol: "▷",
    title: "Live & Cultes",
    description: "Suivez les cultes en direct et accédez aux rediffusions des messages.",
    href: "/live",
  },
  {
    symbol: "☀",
    title: "Dévotion du Jour",
    description: "Une parole quotidienne et une prière pour commencer votre journée.",
    href: "/devotion",
  },
  {
    symbol: "◎",
    title: "Communauté",
    description: "Connectez-vous avec les membres, partagez vos témoignages.",
    href: "/community",
  },
];

const upcomingEvents = [
  {
    date: "10",
    month: "MAI",
    title: "Bootcamp Annuel CCB 2026",
    subtitle: "SEMBLABLE À CHRIST",
    location: "Yaoundé, Cameroun",
    special: true,
  },
  {
    date: "04",
    month: "MAI",
    title: "Culte du Dimanche",
    subtitle: "Rejoignez-nous chaque semaine",
    location: "En ligne & En présentiel",
    special: false,
  },
  {
    date: "07",
    month: "MAI",
    title: "Nuit de Prière",
    subtitle: "Intercession collective",
    location: "Centre Berakah",
    special: false,
  },
];

const testimonies = [
  {
    name: "Marie K.",
    text: "Grâce à CCB, j'ai trouvé ma vocation et ma famille spirituelle. Dieu a transformé ma vie !",
    role: "Membre depuis 3 ans",
    initial: "M",
  },
  {
    name: "Jean-Paul N.",
    text: "Les cours de disciples m'ont donné les bases solides dont j'avais besoin pour ma foi.",
    role: "Leader de cellule",
    initial: "J",
  },
  {
    name: "Esther T.",
    text: "Le JESUS DAILY me rappelle chaque jour la puissance de la Parole de Dieu.",
    role: "Membre actif",
    initial: "E",
  },
];

// ─── NavBar ──────────────────────────────────────────────────
function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(7,4,15,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Main bar */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1.25rem",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <Image
            src="/logo-ccb.png"
            alt="Centre Chrétien Berakah"
            width={38}
            height={38}
            className="rounded-full object-contain"
            priority
          />
          <span
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: C.gold,
              letterSpacing: "0.08em",
              display: "none",
            }}
            className="sm:block"
          >
            BERAKAH
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: "2rem", alignItems: "center" }}>
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                color: C.textSecondary,
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA desktop + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user ? (
            /* Logged in — show dashboard button */
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.25rem",
                borderRadius: "9999px",
                background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                color: "#0d0820",
                fontSize: "0.8rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Mon espace →
            </Link>
          ) : (
            /* Not logged in — show login + register */
            <>
              <Link
                href="/auth/login"
                className="hidden sm:block"
                style={{
                  color: C.goldMuted,
                  textDecoration: "none",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.goldMuted)}
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "9999px",
                  background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                  color: "#0d0820",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Rejoindre
              </Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.4rem",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
            aria-label="Menu"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: "22px",
                  height: "2px",
                  background: C.gold,
                  borderRadius: "2px",
                  transition: "all 0.25s",
                  transform:
                    mobileOpen && i === 0 ? "rotate(45deg) translate(5px,5px)" :
                    mobileOpen && i === 1 ? "scaleX(0)" :
                    mobileOpen && i === 2 ? "rotate(-45deg) translate(5px,-5px)" : "none",
                  opacity: mobileOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            background: "rgba(7,4,15,0.98)",
            borderTop: `1px solid ${C.border}`,
            padding: "1rem 1.25rem 1.5rem",
          }}
        >
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                padding: "0.75rem 0",
                color: C.textSecondary,
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
                borderBottom: `1px solid ${C.borderSoft}`,
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "0.75rem",
                  borderRadius: "9999px",
                  background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                  color: "#0d0820",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                Mon espace →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "0.65rem",
                    border: `1px solid ${C.border}`,
                    borderRadius: "9999px",
                    color: C.gold,
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "0.65rem",
                    borderRadius: "9999px",
                    background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                    color: "#0d0820",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  Rejoindre
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.textPrimary, fontFamily: "var(--font-body, sans-serif)" }}>
      <NavBar />

      {/* ──── HERO ──── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          paddingTop: "68px",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.28) 0%, transparent 70%),
                          radial-gradient(ellipse 60% 50% at 80% 80%, rgba(212,175,55,0.08) 0%, transparent 60%),
                          linear-gradient(180deg, #0d0820 0%, ${C.bg} 60%)`,
          }}
        />

        {/* Soft glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            padding: "2rem 1.25rem",
            maxWidth: "860px",
            margin: "0 auto",
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: "1.75rem" }}>
            <Image
              src="/logo-ccb.png"
              alt="CCB Logo"
              width={90}
              height={90}
              className="object-contain mx-auto"
              priority
              style={{ filter: "drop-shadow(0 0 24px rgba(212,175,55,0.35))" }}
            />
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 1.2rem",
              borderRadius: "9999px",
              background: "rgba(212,175,55,0.08)",
              border: `1px solid ${C.border}`,
              color: C.gold,
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            ✦ Former · Transformer · Bénir ✦
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "clamp(2.2rem, 6vw, 4.2rem)",
              lineHeight: 1.12,
              letterSpacing: "0.04em",
              color: C.textPrimary,
              marginBottom: "1.25rem",
              textShadow: "0 2px 40px rgba(0,0,0,0.5)",
            }}
          >
            Centre Chrétien{" "}
            <span style={{ color: C.gold }}>Berakah</span>
          </h1>

          {/* Verse / tagline */}
          <p
            style={{
              color: C.textSecondary,
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              fontWeight: 300,
              lineHeight: 1.75,
              maxWidth: "560px",
              margin: "0 auto 0.75rem",
            }}
          >
            Former des disciples, Transformer des vies,
          </p>
          <p
            style={{
              color: C.gold,
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              fontWeight: 500,
              fontStyle: "italic",
              marginBottom: "2.5rem",
            }}
          >
            Manifester la Bénédiction
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <Link
              href="/auth/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.9rem 2rem",
                borderRadius: "9999px",
                background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                color: "#0d0820",
                fontSize: "0.88rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.05em",
                boxShadow: `0 0 32px rgba(212,175,55,0.35)`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 40px rgba(212,175,55,0.5)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 32px rgba(212,175,55,0.35)`; }}
            >
              ✦ Rejoindre la famille CCB
            </Link>
            <Link
              href="/live"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.9rem 2rem",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: C.textSecondary,
                fontSize: "0.88rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.05em",
                transition: "background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = C.textSecondary; }}
            >
              ▶ Regarder le Live
            </Link>
          </div>

          {/* Scroll indicator */}
          <div
            style={{
              marginTop: "4rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              color: C.textMuted,
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span>Découvrir</span>
            <div
              style={{
                width: "1px",
                height: "40px",
                background: `linear-gradient(to bottom, ${C.gold}, transparent)`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section style={{ padding: "6rem 1.25rem", background: C.bgAlt }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p
              style={{
                color: C.gold,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Notre Plateforme
            </p>
            <h2
              style={{
                fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                color: C.textPrimary,
                letterSpacing: "0.04em",
                marginBottom: "1rem",
              }}
            >
              Tout pour votre croissance{" "}
              <span style={{ color: C.violetLight }}>spirituelle</span>
            </h2>
            <p style={{ color: C.textMuted, maxWidth: "480px", margin: "0 auto", lineHeight: 1.8, fontSize: "0.95rem" }}>
              Des outils conçus pour vous accompagner chaque jour dans votre marche avec Dieu.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                style={{
                  display: "block",
                  padding: "1.75rem",
                  borderRadius: "16px",
                  background: C.bgCard,
                  border: `1px solid ${C.borderSoft}`,
                  textDecoration: "none",
                  transition: "background 0.2s, border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.bgCardHover;
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.bgCard;
                  e.currentTarget.style.borderColor = C.borderSoft;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(212,175,55,0.08)",
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.gold,
                    fontSize: "1.1rem",
                    marginBottom: "1rem",
                  }}
                >
                  {f.symbol}
                </div>
                <h3
                  style={{
                    color: C.textPrimary,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    marginBottom: "0.5rem",
                    letterSpacing: "0.02em",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: C.textMuted, fontSize: "0.85rem", lineHeight: 1.75 }}>
                  {f.description}
                </p>
                <div
                  style={{
                    marginTop: "1.25rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: C.gold,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Découvrir →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──── EVENTS ──── */}
      <section style={{ padding: "6rem 1.25rem", background: C.bg }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                color: C.gold,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Agenda
            </p>
            <h2
              style={{
                fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2.3rem)",
                color: C.textPrimary,
                letterSpacing: "0.04em",
              }}
            >
              Événements à venir
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {upcomingEvents.map((e) => (
              <div
                key={e.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  borderRadius: "16px",
                  background: C.bgCard,
                  border: `1px solid ${e.special ? C.border : C.borderSoft}`,
                  cursor: "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(el) => {
                  el.currentTarget.style.background = C.bgCardHover;
                  el.currentTarget.style.borderColor = C.border;
                }}
                onMouseLeave={(el) => {
                  el.currentTarget.style.background = C.bgCard;
                  el.currentTarget.style.borderColor = e.special ? C.border : C.borderSoft;
                }}
              >
                {/* Date */}
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "12px",
                    background: e.special
                      ? `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`
                      : "rgba(124,58,237,0.15)",
                    border: e.special ? "none" : "1px solid rgba(124,58,237,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      lineHeight: 1,
                      color: e.special ? "#0d0820" : C.violetLight,
                    }}
                  >
                    {e.date}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: e.special ? "#0d0820" : C.violetLight,
                    }}
                  >
                    {e.month}
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ color: C.textPrimary, fontWeight: 600, fontSize: "0.92rem", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title}
                  </h4>
                  <p style={{ color: e.special ? C.gold : C.violetLight, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    {e.subtitle}
                  </p>
                  <p style={{ color: C.textMuted, fontSize: "0.78rem" }}>
                    ✦ {e.location}
                  </p>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    padding: "0.4rem 1rem",
                    borderRadius: "9999px",
                    background: "rgba(212,175,55,0.08)",
                    border: `1px solid ${C.border}`,
                    color: C.gold,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  Détails →
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link
              href="/events"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 2rem",
                borderRadius: "9999px",
                border: `1px solid ${C.border}`,
                color: C.gold,
                fontSize: "0.82rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "transparent",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Voir tous les événements →
            </Link>
          </div>
        </div>
      </section>

      {/* ──── TESTIMONIES ──── */}
      <section style={{ padding: "6rem 1.25rem", background: C.bgAlt }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                color: C.gold,
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
              }}
            >
              Témoignages
            </p>
            <h2
              style={{
                fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2.3rem)",
                color: C.textPrimary,
                letterSpacing: "0.04em",
              }}
            >
              Des vies transformées
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {testimonies.map((t) => (
              <div
                key={t.name}
                style={{
                  padding: "1.75rem",
                  borderRadius: "16px",
                  background: C.bgCard,
                  border: `1px solid ${C.borderSoft}`,
                }}
              >
                {/* Stars */}
                <div style={{ color: C.gold, fontSize: "0.8rem", marginBottom: "1rem", letterSpacing: "0.1em" }}>
                  ★★★★★
                </div>
                <p
                  style={{
                    color: C.textSecondary,
                    fontSize: "0.9rem",
                    lineHeight: 1.8,
                    fontStyle: "italic",
                    marginBottom: "1.5rem",
                  }}
                >
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${C.violet}, ${C.violetLight})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div style={{ color: C.textPrimary, fontWeight: 600, fontSize: "0.88rem" }}>{t.name}</div>
                    <div style={{ color: C.textMuted, fontSize: "0.75rem" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── CTA BANNER ──── */}
      <section
        style={{
          padding: "6rem 1.25rem",
          background: `linear-gradient(135deg, #0d0820 0%, rgba(124,58,237,0.2) 50%, #0d0820 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 80% at 50% 50%, rgba(212,175,55,0.05) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "640px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {/* Decorative line */}
          <div
            style={{
              width: "60px",
              height: "1px",
              background: `linear-gradient(to right, transparent, ${C.gold}, transparent)`,
              margin: "0 auto 2rem",
            }}
          />

          <h2
            style={{
              fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
              color: C.textPrimary,
              letterSpacing: "0.04em",
              marginBottom: "1rem",
            }}
          >
            Prêt à commencer votre voyage ?
          </h2>
          <p
            style={{
              color: C.textSecondary,
              lineHeight: 1.8,
              fontSize: "0.95rem",
              marginBottom: "2.5rem",
            }}
          >
            Rejoignez des centaines de croyants qui grandissent ensemble dans la foi et la connaissance de Dieu.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <Link
              href="/auth/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.9rem 2.2rem",
                borderRadius: "9999px",
                background: `linear-gradient(135deg, ${C.goldDark}, ${C.gold})`,
                color: "#0d0820",
                fontSize: "0.88rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.05em",
                boxShadow: `0 0 32px rgba(212,175,55,0.3)`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 40px rgba(212,175,55,0.5)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 0 32px rgba(212,175,55,0.3)`; }}
            >
              Créer un compte gratuit
            </Link>
            <Link
              href="/about"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.9rem 2.2rem",
                borderRadius: "9999px",
                border: `1px solid ${C.border}`,
                color: C.gold,
                fontSize: "0.88rem",
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.05em",
                background: "transparent",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,175,55,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              En savoir plus
            </Link>
          </div>

          <div
            style={{
              width: "60px",
              height: "1px",
              background: `linear-gradient(to right, transparent, ${C.gold}, transparent)`,
              margin: "2.5rem auto 0",
            }}
          />
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer
        style={{
          padding: "2.5rem 1.25rem",
          background: "#05030a",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Image
              src="/logo-ccb.png"
              alt="Centre Chrétien Berakah"
              width={30}
              height={30}
              className="rounded-full object-contain"
            />
            <span
              style={{
                fontFamily: "var(--font-cinzel, 'Cinzel', serif)",
                fontWeight: 700,
                fontSize: "0.78rem",
                color: C.gold,
                letterSpacing: "0.1em",
              }}
            >
              CENTRE CHRÉTIEN BERAKAH
            </span>
          </div>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            {[["Confidentialité", "/privacy"], ["Conditions", "/terms"], ["Contact", "/contact"]].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{
                  color: C.textMuted,
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
              >
                {label}
              </Link>
            ))}
          </div>

          <p style={{ color: C.textMuted, fontSize: "0.72rem" }}>
            © 2026 Centre Chrétien Berakah
          </p>
        </div>
      </footer>
    </div>
  );
}
