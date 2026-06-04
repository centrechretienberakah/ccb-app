"use client";

import Link from "next/link";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  formatDuration,
  type Course, type Category,
} from "@/lib/institut/theme";

interface Props {
  course: Course;
  category: Category | null;
  studentName: string;
  completedAt: string;
  totalLessons: number;
}

function fmtDateFR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function CertificatClient({ course, category, studentName, completedAt, totalLessons }: Props) {
  // ID unique du certificat (déterministe à partir du cours + date)
  const certId = `CCB-${course.slug.substring(0, 8).toUpperCase()}-${new Date(completedAt).getFullYear()}-${Math.abs(course.slug.length * 7 + studentName.length).toString(36).toUpperCase()}`;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: F.body }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .certificat-wrapper { padding: 0 !important; background: white !important; }
          .certificat-card { box-shadow: none !important; border: none !important; }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        .certificat-card {
          aspect-ratio: 1.414 / 1;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .certificat-card { aspect-ratio: auto; }
        }
      `}</style>

      {/* Top bar (non imprimable) */}
      <div className="no-print" style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <Link href={`/institut/cours/${course.slug}`} style={{
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "6px 12px",
          color: T.violet, fontSize: 12, fontWeight: 700,
          textDecoration: "none",
        }}>← Retour au cours</Link>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff", border: "none",
          borderRadius: 10, padding: "8px 18px",
          fontWeight: 700, fontSize: 12, cursor: "pointer",
          fontFamily: F.body,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          🖨 Imprimer / Sauvegarder en PDF
        </button>
      </div>

      <div className="certificat-wrapper" style={{
        padding: "24px 16px 60px",
        display: "flex", justifyContent: "center",
      }}>
        <div className="certificat-card" style={{
          background: "#FFFFFF",
          border: `8px double ${T.gold}`,
          borderRadius: 12,
          padding: "40px 32px",
          width: "100%", maxWidth: 1000,
          position: "relative",
          boxShadow: "0 20px 60px rgba(91, 33, 182,0.18)",
          color: T.text,
        }}>
          {/* Filet intérieur or */}
          <div style={{
            position: "absolute", inset: 14,
            border: `1px solid ${T.gold}`,
            borderRadius: 6, pointerEvents: "none",
          }} />

          {/* Coins ornement */}
          <div style={cornerStyle("top", "left")}>✦</div>
          <div style={cornerStyle("top", "right")}>✦</div>
          <div style={cornerStyle("bottom", "left")}>✦</div>
          <div style={cornerStyle("bottom", "right")}>✦</div>

          <div style={{
            position: "relative", textAlign: "center",
            padding: "30px 20px 20px",
          }}>
            {/* Logo / Marque */}
            <div style={{
              fontSize: 36, marginBottom: 4,
            }}>🕊️</div>
            <div style={{
              fontFamily: F.title, fontSize: 16, fontWeight: 700,
              color: T.violet, letterSpacing: "0.2em",
              marginBottom: 4,
            }}>
              CENTRE CHRÉTIEN BERAKAH
            </div>
            <div style={{
              fontSize: 11, color: T.textMuted, marginBottom: 28,
              letterSpacing: "0.1em",
            }}>
              INSTITUT BERAKAH
            </div>

            {/* Titre */}
            <div style={{
              fontFamily: F.title, fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
              fontWeight: 700, color: T.text,
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}>
              CERTIFICAT
            </div>
            <div style={{
              fontFamily: F.title, fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
              fontWeight: 400, color: T.violet,
              letterSpacing: "0.15em", marginBottom: 28,
            }}>
              D&apos;ACCOMPLISSEMENT
            </div>

            {/* Décerné à */}
            <div style={{
              fontSize: 13, color: T.textMuted, marginBottom: 8,
              fontStyle: "italic",
            }}>
              Décerné à
            </div>
            <div style={{
              fontFamily: F.title, fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
              fontWeight: 700, color: T.text,
              borderBottom: `2px solid ${T.gold}`,
              paddingBottom: 8, marginBottom: 24,
              display: "inline-block",
              minWidth: "60%",
              letterSpacing: "0.02em",
            }}>
              {studentName}
            </div>

            {/* Body */}
            <p style={{
              fontSize: "clamp(13px, 2vw, 15px)",
              color: T.textSoft, lineHeight: 1.7,
              maxWidth: 720, margin: "0 auto 8px",
            }}>
              Pour avoir complété avec succès la formation
            </p>
            <div style={{
              fontFamily: F.title,
              fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)",
              fontWeight: 700, color: T.violet,
              marginBottom: 12, lineHeight: 1.3,
            }}>
              « {course.title} »
            </div>
            {category && (
              <div style={{
                fontSize: 12, color: T.textMuted,
                marginBottom: 24, fontStyle: "italic",
              }}>
                {category.icon ?? "📚"} {category.name}
                {course.duration_mins && ` · ${formatDuration(course.duration_mins)}`}
                {` · ${totalLessons} leçon${totalLessons > 1 ? "s" : ""}`}
              </div>
            )}

            <p style={{
              fontSize: 12, color: T.textMuted, lineHeight: 1.6,
              maxWidth: 640, margin: "0 auto 32px",
              fontStyle: "italic",
            }}>
              « Va, et toi aussi fais de même. » — Luc 10:37
            </p>

            {/* Footer avec signature + sceau + date */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-end", flexWrap: "wrap", gap: 20,
              marginTop: 30, textAlign: "left",
              maxWidth: 820, margin: "30px auto 0",
            }}>
              {/* Signature */}
              <div style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Brush Script MT', cursive",
                  fontSize: 22, color: T.violet,
                  borderBottom: `1px solid ${T.textMuted}`,
                  paddingBottom: 4, marginBottom: 4,
                  fontStyle: "italic",
                }}>
                  Rév. Elvis NGUIFFO
                </div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 0.05, textTransform: "uppercase" }}>
                  Fondateur — Centre Chrétien Berakah
                </div>
              </div>

              {/* Sceau */}
              <div style={{
                width: 110, height: 110, borderRadius: "50%",
                background: `radial-gradient(circle, ${T.violetSoft} 0%, transparent 70%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", inset: 8,
                  border: `2px solid ${T.gold}`, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 2,
                }}>
                  <div style={{ fontSize: 22 }}>✦</div>
                  <div style={{
                    fontSize: 8, fontWeight: 700, color: T.violet,
                    textAlign: "center", lineHeight: 1.1,
                    fontFamily: F.title, letterSpacing: 0.05,
                  }}>
                    BERAKAH<br/>OFFICIEL
                  </div>
                </div>
              </div>

              {/* Date */}
              <div style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
                <div style={{
                  fontSize: 16, color: T.text, fontWeight: 700,
                  borderBottom: `1px solid ${T.textMuted}`,
                  paddingBottom: 4, marginBottom: 4,
                  fontFamily: F.title, letterSpacing: 0.02,
                }}>
                  {fmtDateFR(completedAt)}
                </div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 0.05, textTransform: "uppercase" }}>
                  Date de délivrance
                </div>
              </div>
            </div>

            {/* ID Cert */}
            <div style={{
              marginTop: 24, fontSize: 9, color: T.textMuted,
              letterSpacing: 0.1, fontFamily: "monospace",
            }}>
              N° {certId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cornerStyle(vert: "top" | "bottom", horiz: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [vert]: 18,
    [horiz]: 18,
    color: T.gold,
    fontSize: 16,
  };
}
