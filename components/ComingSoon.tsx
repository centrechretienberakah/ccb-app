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
  emoji, title, description,
  features, accentColor = "var(--violet)",
  notifyLabel = "Me notifier au lancement",
}: Props) {
  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)", minHeight: "calc(100dvh - 62px)", paddingBottom: 48 }}>

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", overflowX: "auto" }}>
          <span style={{
            padding: "13px 16px",
            borderBottom: `2px solid ${accentColor}`,
            color: accentColor,
            fontWeight: 700, fontSize: 13,
            whiteSpace: "nowrap", fontFamily: "var(--font-body)",
          }}>{emoji} {title}</span>
          <span style={{
            marginLeft: "auto", padding: "4px 12px", flexShrink: 0,
            background: "rgba(212,175,55,0.12)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: "var(--radius-full)",
            color: "var(--gold)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase" as const,
            margin: "auto 16px auto auto",
          }}>Bientôt</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 48px" }}>

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
            boxShadow: "0 4px 16px rgba(91, 33, 182,0.3)",
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
