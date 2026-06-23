"use client";
import Link from "next/link";
import {
  DONS_THEME as T, DONS_FONTS as F,
  type DonationRecord,
  getKind,
  PAYMENT_MODES,
  formatAmount,
} from "@/lib/dons/theme";

interface Props {
  record: DonationRecord;
  donorName: string;
  campaignTitle: string | null;
}

function fmtDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function RecuClient({ record, donorName, campaignTitle }: Props) {
  const k = getKind(record.kind);
  const mode = record.payment_mode ? PAYMENT_MODES.find((m) => m.id === record.payment_mode) : null;
  const dateRef = record.paid_at ?? record.confirmed_at ?? record.created_at;
  const receiptNo = record.receipt_number ?? `CCB-${new Date(dateRef).getFullYear()}-${record.id.slice(0, 5).toUpperCase()}`;
  const approxEur = Math.round((record.amount_xaf / 656) * 100) / 100;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: F.body, color: T.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .recu-wrap { padding: 0 !important; background: white !important; }
          .recu-paper { box-shadow: none !important; border: 2px solid ${T.gold} !important; }
        }
        @page { size: A4 portrait; margin: 16mm; }
      `}</style>

      {/* Top bar non imprimable */}
      <div className="no-print" style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between",
      }}>
        <Link href="/dons/mes-dons" style={{
          padding: "6px 12px",
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.violet, fontSize: 12, fontWeight: 700,
          textDecoration: "none",
        }}>← Mes dons</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => typeof window !== "undefined" && window.print()}
            style={{
              padding: "8px 16px", background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>🖨️ Imprimer / Télécharger PDF</button>
        </div>
      </div>

      {/* Document */}
      <div className="recu-wrap" style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div className="recu-paper" style={{
          background: "#FFFFFF",
          border: `2px solid ${T.gold}`,
          padding: "36px 40px 28px",
          position: "relative",
          boxShadow: T.shadowMd,
        }}>
          {/* Filigrane décoratif */}
          <div style={{
            position: "absolute", top: 40, right: 30, fontSize: 240, color: T.violetSoft,
            lineHeight: 1, pointerEvents: "none", userSelect: "none",
          }}>💝</div>

          {/* Header */}
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 26, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: F.title, fontSize: 22, fontWeight: 800, color: T.violetDark, lineHeight: 1 }}>
                Centre Chrétien Berakah
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                Église évangélique · Belgique · Cameroun
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                centrechretienberakah@gmail.com
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block", padding: "5px 12px",
                background: T.gold, color: "#000",
                borderRadius: 6, fontWeight: 800, fontSize: 11, letterSpacing: 1,
              }}>REÇU DE DON</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>N°</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: T.text }}>
                {receiptNo}
              </div>
            </div>
          </div>

          {/* Donateur */}
          <div style={{ position: "relative", marginBottom: 22, padding: "14px 16px", background: T.surface2, borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
              Donateur {record.is_anonymous ? <span style={{ color: T.gold }}>· anonyme publiquement</span> : null}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{donorName}</div>
            {record.donor_email ? (
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{record.donor_email}</div>
            ) : null}
            {record.dedication ? (
              <div style={{ marginTop: 8, padding: "6px 10px", background: T.heartSoft, borderRadius: 6, fontSize: 12, color: T.heart, fontStyle: "italic" }}>
                🕊️ {record.dedication}
              </div>
            ) : null}
          </div>

          {/* Détail */}
          <div style={{ position: "relative", marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Détail du don
            </div>
            <table style={{
              width: "100%", borderCollapse: "collapse", fontSize: 13,
              fontFamily: F.body,
            }}>
              <tbody>
                <Row label="Type">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: `${k.color}22`, color: k.color,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13,
                    }}>{k.emoji}</span>
                    <strong>{k.label}</strong>
                  </span>
                </Row>
                {campaignTitle ? (
                  <Row label="Campagne">🎯 {campaignTitle}</Row>
                ) : null}
                <Row label="Date du paiement">{fmtDateFR(dateRef)}</Row>
                {mode ? (
                  <Row label="Moyen">{mode.emoji} {mode.title} <span style={{ color: T.textMuted }}>· {mode.detail}</span></Row>
                ) : null}
                {record.reference ? (
                  <Row label="Référence">
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{record.reference}</span>
                  </Row>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Montant principal */}
          <div style={{
            position: "relative", padding: "20px 22px",
            background: `linear-gradient(135deg, ${T.violetSoft}, rgba(212,175,55,0.10))`,
            border: `1.5px solid ${T.gold}`, borderRadius: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
            marginBottom: 24,
          }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Montant reçu
              </div>
              <div style={{
                fontFamily: F.title, fontSize: 36, fontWeight: 800, lineHeight: 1.1, marginTop: 2,
                color: T.violetDark, fontVariantNumeric: "tabular-nums",
              }}>{formatAmount(record.amount_native, record.currency)}</div>
              {record.currency !== "XAF" ? (
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                  ≈ {formatAmount(record.amount_xaf, "XAF")} · ≈ {approxEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              ) : (
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                  ≈ {approxEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              )}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 6,
              background: T.green, color: "#fff",
              fontWeight: 800, fontSize: 11, letterSpacing: 0.6,
            }}>✓ CONFIRMÉ</div>
          </div>

          {/* Verset */}
          <blockquote style={{
            position: "relative",
            margin: "0 0 20px", padding: "14px 18px",
            background: "rgba(212,175,55,0.06)",
            borderLeft: `3px solid ${T.gold}`,
            fontStyle: "italic", fontSize: 12.5, lineHeight: 1.6, color: T.textSoft,
          }}>
            &ldquo;Apportez à la maison du trésor toutes les dîmes… mettez-moi de la sorte à l&apos;épreuve, dit l&apos;Éternel des armées, et vous verrez si je n&apos;ouvre pas pour vous les écluses des cieux.&rdquo;
            <span style={{ display: "block", marginTop: 6, fontStyle: "normal", fontSize: 11, color: T.goldDark, fontWeight: 700 }}>
              — Malachie 3:10
            </span>
          </blockquote>

          {/* Signature & sceau */}
          <div style={{
            position: "relative",
            display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20,
            marginTop: 24, paddingTop: 18, borderTop: `1px dashed ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Pour le ministère
              </div>
              <div style={{
                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                fontSize: 26, color: T.violetDark, lineHeight: 1, marginTop: 4,
              }}>
                Rév. Elvis NGUIFFO
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                Pasteur principal · Centre Chrétien Berakah
              </div>
            </div>
            <div style={{
              width: 100, height: 100, borderRadius: 999,
              border: `2.5px solid ${T.violetDark}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              textAlign: "center", color: T.violetDark, padding: 6,
              transform: "rotate(-8deg)",
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>BERAKAH</div>
              <div style={{ fontSize: 7, fontWeight: 700, marginTop: 2 }}>OFFICIEL</div>
              <div style={{ fontSize: 20, lineHeight: 1, margin: "3px 0" }}>✝️</div>
              <div style={{ fontSize: 7, fontWeight: 700 }}>BÉNÉDICTION</div>
              <div style={{ fontSize: 7, fontWeight: 800 }}>{new Date(dateRef).getFullYear()}</div>
            </div>
          </div>

          {/* Footer note légale */}
          <div style={{
            marginTop: 20, padding: "10px 12px",
            background: T.surface2, borderRadius: 8,
            fontSize: 10.5, color: T.textMuted, lineHeight: 1.5,
          }}>
            <strong>Conservez ce reçu</strong> — il peut être utilisé dans le cadre de votre déclaration fiscale.
            Pour une attestation fiscale annuelle officielle, voir <em>/dons/declaration-fiscale</em>.
            Centre Chrétien Berakah · ASBL · Belgique.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td style={{
        width: 140, padding: "8px 0", borderBottom: `1px solid ${T.borderSoft}`,
        color: T.textMuted, fontSize: 12, fontWeight: 600, verticalAlign: "top",
      }}>{label}</td>
      <td style={{
        padding: "8px 0", borderBottom: `1px solid ${T.borderSoft}`,
        color: T.text, fontSize: 13,
      }}>{children}</td>
    </tr>
  );
}
