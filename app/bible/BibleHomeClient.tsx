import Link from "next/link";

interface Props {
  chaptersRead: number;
  notesCount: number;
  versesCount: number;
}

/**
 * Accueil « Ma Bible » — navigation simple et épurée (style appli biblique
 * moderne). Uniquement 5 cartes : Lire la Bible · Plans de lecture ·
 * Ma progression · Mes notes · Mes versets.
 * Aucune bannière promotionnelle, audio, verset du jour, recommandation, etc.
 */
export default function BibleHomeClient({ chaptersRead, notesCount, versesCount }: Props) {
  const cards = [
    { href: "/bible/lire",       emoji: "📖", title: "Lire la Bible",    desc: "Accéder au texte biblique complet.",       badge: "" },
    { href: "/plan-biblique",    emoji: "🗓️", title: "Plans de lecture", desc: "Suivre un programme de lecture biblique.", badge: "" },
    { href: "/bible/progression",emoji: "📊", title: "Ma progression",   desc: "Consulter l'avancement de lecture.",       badge: chaptersRead > 0 ? `${chaptersRead} chap.` : "" },
    { href: "/bible/notes",      emoji: "📝", title: "Mes notes",        desc: "Retrouver toutes les notes personnelles.", badge: notesCount > 0 ? `${notesCount}` : "" },
    { href: "/bible/versets",    emoji: "🔖", title: "Mes versets",      desc: "Retrouver les versets enregistrés.",       badge: versesCount > 0 ? `${versesCount}` : "" },
  ];

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)", paddingBottom: 40 }}>
      <style>{`
        .biblehome-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 600px) { .biblehome-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .biblehome-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .biblehome-card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
        .biblehome-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--gold); }
      `}</style>

      {/* En-tête compact (pas de bannière promotionnelle) */}
      <div style={{
        background: "linear-gradient(135deg, var(--violet-dark, #4C1D95) 0%, var(--violet, #5B21B6) 100%)",
        color: "#fff", padding: "16px 16px calc(14px + env(safe-area-inset-top, 0px))",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--gold), transparent)" }} />
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-title)", fontWeight: 700, margin: 0, fontSize: "clamp(1.2rem, 4.5vw, 1.6rem)", letterSpacing: "0.04em" }}>
            📖 MA BIBLE
          </h1>
          <p style={{ margin: "3px 0 0", opacity: 0.9, fontStyle: "italic", fontSize: "clamp(11px, 2.8vw, 13px)", color: "#EDE7FA" }}>
            Lire, étudier et suivre la Parole de Dieu.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "18px 14px 0" }}>
        <div className="biblehome-grid">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="biblehome-card" style={{
              display: "flex", flexDirection: "column", gap: 6,
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl, 18px)", padding: "18px 16px",
              textDecoration: "none", color: "var(--text-primary)",
              boxShadow: "var(--shadow-sm)", position: "relative", minHeight: 112,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                  background: "var(--violet-soft, rgba(91,33,182,0.10))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                }}>{c.emoji}</span>
                {c.badge && (
                  <span style={{
                    background: "rgba(212,175,55,0.16)", border: "1px solid var(--gold)",
                    color: "var(--gold-dark, #B8860B)", fontWeight: 800, fontSize: 11,
                    borderRadius: 999, padding: "3px 10px",
                  }}>{c.badge}</span>
                )}
              </div>
              <div style={{ fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
                {c.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
