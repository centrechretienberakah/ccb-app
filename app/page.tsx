import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--page-bg)",
      fontFamily: "var(--font-body)",
      padding: "24px 20px",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Glow de fond */}
      <div style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(90,44,160,0.22) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        textAlign: "center",
        maxWidth: 480,
        width: "100%",
      }}>

        {/* Logo */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute",
            width: 148, height: 148,
            borderRadius: "50%",
            border: "1px solid rgba(90,44,160,0.35)",
          }} />
          <div style={{
            position: "absolute",
            width: 124, height: 124,
            borderRadius: "50%",
            border: "1px solid rgba(90,44,160,0.18)",
          }} />
          <div style={{
            position: "absolute",
            width: 140, height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(90,44,160,0.18) 0%, transparent 70%)",
          }} />
          <Image
            src="/logo-ccb.png"
            alt="Centre Chrétien Berakah"
            width={108}
            height={108}
            priority
            style={{
              position: "relative",
              zIndex: 1,
              objectFit: "contain",
              filter: "drop-shadow(0 0 28px rgba(90,44,160,0.6)) drop-shadow(0 0 8px rgba(90,44,160,0.35))",
            }}
          />
        </div>

        {/* Slogan — une seule ligne */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 18px",
          borderRadius: 999,
          background: "rgba(90,44,160,0.12)",
          border: "1px solid rgba(90,44,160,0.35)",
          color: "#9b6dff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>
          Former · Transformer · Bénir
        </div>

        {/* Titre — 2 lignes exactes sur mobile */}
        <div>
          <div style={{
            fontFamily: "var(--font-title)",
            fontWeight: 700,
            fontSize: "clamp(1.35rem, 5.5vw, 3.2rem)",
            lineHeight: 1.1,
            letterSpacing: "0.06em",
            color: "var(--text-primary)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            Centre Chrétien
          </div>
          <div style={{
            fontFamily: "var(--font-title)",
            fontWeight: 700,
            fontSize: "clamp(2.2rem, 8.5vw, 4.4rem)",
            lineHeight: 1.1,
            letterSpacing: "0.1em",
            color: "#5A2CA0",
            textTransform: "uppercase",
            textShadow: "0 0 40px rgba(90,44,160,0.5)",
            whiteSpace: "nowrap",
          }}>
            Berakah
          </div>
        </div>

        {/* Vision — une seule ligne */}
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "clamp(0.72rem, 3vw, 1rem)",
          fontWeight: 300,
          lineHeight: 1.6,
          margin: 0,
          whiteSpace: "nowrap",
        }}>
          Former des disciples, transformer les vies,{" "}
          <span style={{ color: "#9b6dff", fontStyle: "italic", fontWeight: 500 }}>
            manifester la Bénédiction
          </span>
        </p>

        {/* CTA — une seule ligne */}
        <Link
          href="/auth/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 32px",
            borderRadius: 999,
            background: "#5A2CA0",
            color: "#fff",
            fontSize: "0.88rem",
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            boxShadow: "0 0 32px rgba(90,44,160,0.45)",
          }}
        >
          Rejoindre la famille CCB
        </Link>

      </div>
    </div>
  );
}
