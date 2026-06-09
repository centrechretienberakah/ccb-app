"use client";

import Link from "next/link";
import { PRAYER_THEME as T, PRAYER_FONTS as F, getPrayerCategoryDef } from "@/lib/prayer/theme";

interface Profile { user_id: string; display_name: string | null; avatar_url: string | null }
interface AnsweredPrayer {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  category: string | null;
  is_anonymous: boolean;
  answered_at: string | null;
  answered_with: string | null;
  created_at: string;
  user_profiles: Profile | null;
  intercessionsCount: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ExauceesClient({ prayers }: { prayers: AnsweredPrayer[] }) {
  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 60,
    }}>
      {/* Hero vert exaucé */}
      <div style={{
        background: `linear-gradient(135deg, ${T.answered} 0%, #1e7a35 100%)`,
        color: "#fff", padding: "32px 18px 28px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎉</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.4rem, 4.5vw, 1.9rem)",
            fontWeight: 700, margin: "0 0 6px",
            letterSpacing: "0.04em",
          }}>
            DIEU NOUS A RÉPONDU
          </h1>
          <p style={{
            margin: 0, fontSize: 13, opacity: 0.92, fontStyle: "italic",
            color: "rgba(255,255,255,0.92)",
          }}>
            Célébrons ensemble les prières exaucées de notre communauté.
          </p>
        </div>
      </div>

      {/* Lien retour */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 0" }}>
        <Link href="/prayer" style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: "6px 12px",
          color: T.violet, fontSize: 12, fontWeight: 700,
          textDecoration: "none", fontFamily: F.body,
          display: "inline-block",
        }}>← Demandes actives</Link>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 40px" }}>

        {prayers.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "50px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🕊️</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              Aucun témoignage d&apos;exaucement pour l&apos;instant.
            </div>
            <div style={{ color: T.textMuted, fontSize: 12, marginTop: 8 }}>
              Quand une de tes prières sera exaucée, marque-la pour la partager ici.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {prayers.map((p) => {
              const catDef = getPrayerCategoryDef(p.category);
              const author = p.is_anonymous ? "Demande anonyme" : (p.user_profiles?.display_name || "Un membre");
              const initials = author.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={p.id} style={{
                  background: T.card, border: `2px solid ${T.answered}`,
                  borderRadius: 14, padding: 16,
                  boxShadow: T.shadowSoft,
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Ribbon "EXAUCÉE" */}
                  <div style={{
                    position: "absolute", top: 8, right: -28,
                    background: T.answered, color: "#fff",
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.1,
                    padding: "3px 32px", transform: "rotate(35deg)",
                    fontFamily: F.body,
                  }}>
                    EXAUCÉE
                  </div>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {p.is_anonymous || !p.user_profiles?.avatar_url ? (
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: p.is_anonymous ? T.surface2 : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                        color: p.is_anonymous ? T.textMuted : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: p.is_anonymous ? 16 : 14, fontWeight: 700,
                      }}>{p.is_anonymous ? "🤫" : initials}</div>
                    ) : (
                      <img loading="lazy" decoding="async" src={p.user_profiles.avatar_url} alt={author}
                        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 14, color: T.text }}>
                        {author}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                        Exaucée le {fmtDate(p.answered_at)}
                      </div>
                    </div>
                    <span style={{
                      background: `${catDef.color}1f`, border: `1px solid ${catDef.color}55`,
                      borderRadius: 999, padding: "3px 10px", fontSize: 10,
                      color: catDef.color, fontWeight: 700, flexShrink: 0,
                    }}>
                      {catDef.emoji} {catDef.label}
                    </span>
                  </div>

                  {/* Titre */}
                  {p.title && (
                    <h3 style={{
                      fontFamily: F.title, fontSize: 17, fontWeight: 800,
                      color: T.text, margin: "0 0 6px", lineHeight: 1.35,
                    }}>
                      {p.title}
                    </h3>
                  )}

                  {/* Demande originale */}
                  <div style={{
                    fontSize: 12, color: T.textMuted, marginBottom: 4, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 0.05,
                  }}>
                    Demande initiale
                  </div>
                  <p style={{
                    fontSize: 13, color: T.textSoft, lineHeight: 1.55,
                    margin: "0 0 12px", whiteSpace: "pre-wrap", fontFamily: F.body,
                    fontStyle: "italic",
                  }}>
                    « {p.content} »
                  </p>

                  {/* Témoignage */}
                  {p.answered_with && (
                    <div style={{
                      background: "rgba(46,155,71,0.06)",
                      border: `1px solid rgba(46,155,71,0.25)`,
                      borderLeft: `4px solid ${T.answered}`,
                      borderRadius: "0 10px 10px 0", padding: "12px 14px",
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: T.answered,
                        textTransform: "uppercase", letterSpacing: 0.07, marginBottom: 5,
                      }}>
                        ✨ Témoignage
                      </div>
                      <p style={{
                        margin: 0, fontSize: 14, color: T.textSoft, lineHeight: 1.6,
                        fontFamily: F.body,
                      }}>
                        « {p.answered_with} »
                      </p>
                    </div>
                  )}

                  {/* Pied : intercessions */}
                  {p.intercessionsCount > 0 && (
                    <div style={{
                      marginTop: 12, fontSize: 11, color: T.textMuted,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      🙏 {p.intercessionsCount} intercession{p.intercessionsCount > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
