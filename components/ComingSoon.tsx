import Link from "next/link";

interface Feature {
  icon: string;
  label: string;
}

interface Props {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  accentColor?: string;
  accentGlow?: string;
  notifyLabel?: string;
}

export default function ComingSoon({
  emoji, title, subtitle, description,
  features, accentColor = "var(--violet)", accentGlow = "rgba(90,44,160,0.2)",
  notifyLabel = "Me notifier au lancement",
}: Props) {
  return (
    <div style={{ background: "var(--background)", minHeight: "calc(100dvh - 62px)", paddingBottom: 48 }}>

      {/* Hero */}
      <div style={{
        background: "var(--header-gradient)",
        padding: "40px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: 280, height: 280, borderRadius: "50%",
          background: `radial-gradient(circle, ${accentGlow} 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{emoji}</div>
          <div style={{
            display: "inline-block",
            background: "rgba(212,175,55,0.2)",
            border: "1px solid rgba(212,175,55,0.4)",
            color: "var(--gold-light)",
            padding: "4px 14px",
            borderRadius: "var(--radius-full)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Bientot disponible
          </div>
          <h1 style={{
            fontFamily: "var(--font-title)",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 700,
            color: "white",
            margin: "0 0 8px",
            letterSpacing: "0.02em",
          }}>{title}</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", margin: 0 }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "-24px auto 0", padding: "0 20px" }}>

        {/* Description card */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
          marginBottom: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)", margin: 0 }}>
            {description}
          </p>
        </div>

        {/* Features preview */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{
            fontFamily: "var(--font-title)",
            fontSize: 13, fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Ce qui vous attend
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {features.map(({ icon, label }) => (
              <div key={label} style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{
            width: "100%",
            padding: "13px",
            borderRadius: "var(--radius-lg)",
            border: "none",
            background: `linear-gradient(135deg, var(--violet-dark), var(--violet))`,
            color: "white",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            letterSpacing: "0.03em",
            boxShadow: "0 4px 16px rgba(90,44,160,0.3)",
          }}>
            🔔 {notifyLabel}
          </button>
          <Link href="/dashboard" style={{
            display: "block",
            textAlign: "center",
            padding: "12px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}>
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
