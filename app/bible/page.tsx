import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Ma Bible — CCB" };

export default async function BiblePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/bible");

  return (
    <div style={{
      maxWidth: 560,
      margin: "0 auto",
      padding: "40px 20px 80px",
      fontFamily: "var(--font-body)",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>📖</div>
        <h1 style={{
          fontFamily: "var(--font-title)",
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 8px",
        }}>
          Ma Bible
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Que veux-tu faire aujourd&apos;hui ?
        </p>
      </div>

      {/* Les 2 choix */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Choix 1 — Lire la Bible */}
        <Link href="/bible/lire" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "28px 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            transition: "border-color 0.2s, transform 0.2s",
            cursor: "pointer",
            overflow: "hidden",
            position: "relative",
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            {/* Accent bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, #1e40af, #3b82f6, transparent)",
            }} />
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: "var(--radius-xl)", flexShrink: 0,
              background: "linear-gradient(145deg, #1e3a5f, #1e40af 55%, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30,
              boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
            }}>
              📖
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-title)",
                fontSize: 18, fontWeight: 800,
                color: "var(--text-primary)", marginBottom: 4,
              }}>
                Lire la Bible
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Explore l&apos;Ancien et le Nouveau Testament, sauvegarde tes versets préférés et ajoute des notes personnelles.
              </div>
            </div>
            {/* Arrow */}
            <div style={{
              fontSize: 20, color: "var(--text-muted)", flexShrink: 0,
            }}>→</div>
          </div>
        </Link>

        {/* Choix 2 — Plan de Lecture */}
        <Link href="/plan-biblique" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "28px 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            transition: "border-color 0.2s, transform 0.2s",
            cursor: "pointer",
            overflow: "hidden",
            position: "relative",
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            {/* Accent bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, #92400e, #d97706, transparent)",
            }} />
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: "var(--radius-xl)", flexShrink: 0,
              background: "linear-gradient(145deg, #92400e, #d97706 55%, #fbbf24)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30,
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            }}>
              📅
            </div>
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-title)",
                fontSize: 18, fontWeight: 800,
                color: "var(--text-primary)", marginBottom: 4,
              }}>
                Plan de Lecture
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Lis la Bible en 1 an grâce à un programme guidé. Suis ta progression et reçois des rappels quotidiens.
              </div>
            </div>
            {/* Arrow */}
            <div style={{
              fontSize: 20, color: "var(--text-muted)", flexShrink: 0,
            }}>→</div>
          </div>
        </Link>
      </div>

      {/* Verset inspirant */}
      <div style={{
        marginTop: 36,
        padding: "18px 20px",
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xl)",
        textAlign: "center",
      }}>
        <p style={{
          color: "var(--text-muted)", fontSize: 13,
          fontStyle: "italic", margin: 0, lineHeight: 1.7,
        }}>
          &ldquo;Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.&rdquo;
        </p>
        <p style={{ color: "var(--gold)", fontSize: 11, fontWeight: 700, margin: "6px 0 0" }}>
          — Psaume 119:105
        </p>
      </div>

    </div>
  );
}
