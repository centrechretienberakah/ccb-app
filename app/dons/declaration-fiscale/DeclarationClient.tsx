"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DONS_THEME as T, DONS_FONTS as F,
  type DonationRecord,
  getKind, formatAmount,
} from "@/lib/dons/theme";

interface Props {
  year: number;
  availableYears: number[];
  records: DonationRecord[];
  donorName: string;
  donorEmail: string;
  campaigns: { id: string; title: string }[];
}

function fmtDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DeclarationClient({
  year, availableYears, records, donorName, donorEmail, campaigns,
}: Props) {
  const router = useRouter();
  const campaignsById = new Map(campaigns.map((c) => [c.id, c.title]));

  const totalXaf = records.reduce((acc, r) => acc + r.amount_xaf, 0);
  const totalEur = Math.round((totalXaf / 656) * 100) / 100;
  const issueDate = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const docNo = `CCB-DECL-${year}-${donorEmail.split("@")[0].slice(0, 6).toUpperCase() || "USER"}`;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: F.body, color: T.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .decl-wrap { padding: 0 !important; background: white !important; }
          .decl-paper { box-shadow: none !important; border: 2px solid ${T.violetDark} !important; }
        }
        @page { size: A4 portrait; margin: 14mm; }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between",
      }}>
        <Link href="/dons/mes-dons" style={{
          padding: "6px 12px", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.violet, fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>← Mes dons</Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Année :</label>
          <select value={year}
            onChange={(e) => router.push(`/dons/declaration-fiscale?year=${e.target.value}`)}
            style={{
              padding: "7px 12px", background: T.card, color: T.text,
              border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer",
            }}>
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => typeof window !== "undefined" && window.print()}
            style={{
              padding: "8px 16px", background: T.violet, color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>🖨️ Imprimer / PDF</button>
        </div>
      </div>

      {/* Document */}
      <div className="decl-wrap" style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div className="decl-paper" style={{
          background: "#FFFFFF", border: `2px solid ${T.violetDark}`,
          padding: "36px 40px 32px", position: "relative", boxShadow: T.shadowMd,
        }}>
          {/* Filigrane */}
          <div style={{
            position: "absolute", top: 50, right: 30, fontSize: 260, color: T.violetSoft,
            lineHeight: 1, pointerEvents: "none", userSelect: "none",
          }}>📋</div>

          {/* Header */}
          <div style={{ position: "relative", marginBottom: 28, textAlign: "center", borderBottom: `2px solid ${T.gold}`, paddingBottom: 18 }}>
            <div style={{ fontFamily: F.title, fontSize: 24, fontWeight: 800, color: T.violetDark }}>
              Centre Chrétien Berakah
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              ASBL · Belgique · centrechretienberakah@gmail.com
            </div>
            <div style={{
              display: "inline-block", marginTop: 16, padding: "6px 16px",
              background: T.violetDark, color: "#fff",
              borderRadius: 999, fontWeight: 800, fontSize: 12, letterSpacing: 1.2,
            }}>RÉCAPITULATIF ANNUEL DE DONS — {year}</div>
          </div>

          {/* Info bloc */}
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 26 }}>
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                Donateur
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{donorName}</div>
              {donorEmail ? <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{donorEmail}</div> : null}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Document n°
              </div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, marginTop: 4 }}>{docNo}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                Émis le {issueDate}
              </div>
            </div>
          </div>

          {/* Total mis en avant */}
          <div style={{
            position: "relative", marginBottom: 26,
            padding: "18px 22px",
            background: `linear-gradient(135deg, ${T.violetSoft}, rgba(212,175,55,0.08))`,
            border: `1.5px solid ${T.gold}`, borderRadius: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Total des dons reçus en {year}
              </div>
              <div style={{
                fontFamily: F.title, fontSize: 30, fontWeight: 800, color: T.violetDark, lineHeight: 1.1, marginTop: 4,
                fontVariantNumeric: "tabular-nums",
              }}>
                {totalEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                ≈ {formatAmount(totalXaf, "XAF")} (équivalent comptable interne)
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block", padding: "4px 11px",
                background: T.violet, color: "#fff",
                borderRadius: 6, fontWeight: 800, fontSize: 11, letterSpacing: 0.6,
              }}>{records.length} DON{records.length > 1 ? "S" : ""}</div>
            </div>
          </div>

          {/* Détail */}
          <div style={{ position: "relative", marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Détail des dons
            </div>
            {records.length === 0 ? (
              <div style={{
                padding: "24px 20px", textAlign: "center",
                background: T.surface2, border: `1px dashed ${T.border}`,
                borderRadius: 10, color: T.textMuted, fontSize: 13,
              }}>
                Aucun don confirmé enregistré pour l&apos;année {year}.
              </div>
            ) : (
              <table style={{
                width: "100%", borderCollapse: "collapse", fontSize: 11.5,
              }}>
                <thead>
                  <tr style={{ background: T.surface2, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.6 }}>
                    <th style={th}>Date</th>
                    <th style={th}>N° reçu</th>
                    <th style={th}>Type</th>
                    <th style={th}>Affectation</th>
                    <th style={{ ...th, textAlign: "right" }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const k = getKind(r.kind);
                    const dateRef = r.paid_at ?? r.confirmed_at ?? r.created_at;
                    const campaignTitle = r.campaign_id ? campaignsById.get(r.campaign_id) : null;
                    const recEur = Math.round((r.amount_xaf / 656) * 100) / 100;
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                        <td style={td}>{fmtDateFR(dateRef)}</td>
                        <td style={{ ...td, fontFamily: "monospace", fontSize: 10.5 }}>
                          {r.receipt_number ?? "—"}
                        </td>
                        <td style={td}>{k.emoji} {k.label}</td>
                        <td style={{ ...td, color: T.textSoft }}>{campaignTitle ?? "Affectation générale"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {formatAmount(r.amount_native, r.currency)}
                          {r.currency !== "EUR" ? (
                            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 400 }}>
                              ≈ {recEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: T.violetSoft, fontWeight: 800 }}>
                    <td style={{ ...td, fontWeight: 800 }} colSpan={4}>TOTAL {year}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 13, color: T.violetDark, fontVariantNumeric: "tabular-nums" }}>
                      {totalEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Mention fiscale */}
          <div style={{
            position: "relative",
            padding: "12px 14px", background: T.surface2,
            border: `1px solid ${T.border}`, borderRadius: 10,
            fontSize: 10.5, color: T.textSoft, lineHeight: 1.55, marginBottom: 20,
          }}>
            <strong>Mention fiscale (Belgique)</strong> — Les dons effectués au profit
            d&apos;associations à but philanthropique reconnues peuvent ouvrir droit
            à une réduction d&apos;impôt fédérale de 45 % sur le montant donné,
            sous réserve d&apos;un don annuel d&apos;au moins 40 € à un même bénéficiaire
            et de la production d&apos;une attestation fiscale officielle (art. 145³³ CIR 1992).
            Ce récapitulatif tient lieu d&apos;information ; pour l&apos;attestation fiscale
            officielle (formulaire 281.71), contactez le trésorier du CCB ASBL.
          </div>

          {/* Signature */}
          <div style={{
            position: "relative",
            display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20,
            marginTop: 22, paddingTop: 18, borderTop: `1px dashed ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Pour le ministère
              </div>
              <div style={{
                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                fontSize: 24, color: T.violetDark, lineHeight: 1, marginTop: 4,
              }}>
                Rév. Elvis NGUIFFO
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
                Pasteur principal · Centre Chrétien Berakah ASBL
              </div>
            </div>
            <div style={{
              width: 90, height: 90, borderRadius: 999,
              border: `2.5px solid ${T.violetDark}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              textAlign: "center", color: T.violetDark, padding: 6,
              transform: "rotate(-6deg)",
            }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 1 }}>BERAKAH</div>
              <div style={{ fontSize: 7, fontWeight: 700, marginTop: 1 }}>OFFICIEL</div>
              <div style={{ fontSize: 18, lineHeight: 1, margin: "2px 0" }}>✝️</div>
              <div style={{ fontSize: 7, fontWeight: 700 }}>EXERCICE</div>
              <div style={{ fontSize: 8, fontWeight: 800 }}>{year}</div>
            </div>
          </div>
        </div>

        {/* Note non imprimable */}
        <p className="no-print" style={{
          marginTop: 16, fontSize: 12, color: T.textMuted, textAlign: "center",
        }}>
          💡 Cette attestation est générée automatiquement à partir des dons confirmés dans ton compte.
          Pour une attestation fiscale officielle 281.71, <Link href="/contact" style={{ color: T.violet }}>contacte le trésorier</Link>.
        </p>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", textAlign: "left" };
const td: React.CSSProperties = { padding: "9px 10px", verticalAlign: "top" };
