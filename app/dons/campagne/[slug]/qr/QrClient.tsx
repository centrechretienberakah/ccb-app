"use client";
import Link from "next/link";
import {
  DONS_THEME as T, DONS_FONTS as F,
  type DonationCampaign,
  getKind, formatAmount, campaignProgress,
} from "@/lib/dons/theme";

interface Props {
  campaign: DonationCampaign;
  targetUrl: string;
}

export default function QrClient({ campaign, targetUrl }: Props) {
  const k = getKind(campaign.kind);
  const pct = campaignProgress(campaign);
  // QR via service public (pas de dépendance npm) — taille 600x600 noir CCB violet
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(targetUrl)}&color=${"4C1D95".replace("#","")}&bgcolor=FFFFFF`;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: F.body, color: T.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .qr-wrap { padding: 0 !important; background: white !important; }
          .qr-paper { box-shadow: none !important; border: 2px solid ${T.violetDark} !important; }
        }
        @page { size: A4 portrait; margin: 14mm; }
      `}</style>

      <div className="no-print" style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
      }}>
        <Link href="/dons/admin" style={{
          padding: "6px 12px", background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.violet, fontSize: 12, fontWeight: 700, textDecoration: "none",
        }}>← Console admin</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={qrUrl} download={`qr-${campaign.slug}.png`} style={{
            padding: "8px 16px", background: T.card, color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 8, fontWeight: 700, fontSize: 13,
            textDecoration: "none",
          }}>💾 Télécharger PNG</a>
          <button
            onClick={() => typeof window !== "undefined" && window.print()}
            style={{
              padding: "8px 16px", background: T.violet, color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>🖨️ Imprimer A4</button>
        </div>
      </div>

      <div className="qr-wrap" style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 80px" }}>
        <div className="qr-paper" style={{
          background: "#FFFFFF", border: `2px solid ${T.violetDark}`,
          padding: "40px 40px 30px", textAlign: "center", boxShadow: T.shadowMd,
        }}>
          {/* Header */}
          <div style={{
            display: "inline-block", padding: "5px 14px",
            background: T.gold, color: "#000", borderRadius: 999,
            fontWeight: 800, fontSize: 11, letterSpacing: 1, marginBottom: 14,
          }}>{k.emoji} {k.label.toUpperCase()}</div>

          <h1 style={{
            fontFamily: F.title, fontSize: 26, margin: "0 0 6px",
            fontWeight: 800, color: T.violetDark, lineHeight: 1.15,
          }}>{campaign.title}</h1>
          {campaign.subtitle ? (
            <p style={{ color: T.textSoft, fontSize: 14, lineHeight: 1.5, margin: "0 0 20px", maxWidth: 480, marginInline: "auto" }}>
              {campaign.subtitle}
            </p>
          ) : null}

          {/* Jauge */}
          <div style={{ maxWidth: 360, margin: "0 auto 26px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", marginBottom: 5,
              fontSize: 11.5, color: T.textMuted, fontWeight: 600,
            }}>
              <span>{formatAmount(campaign.current_amount_xaf, "XAF")}</span>
              <span>sur {formatAmount(campaign.target_amount_xaf, "XAF")}</span>
            </div>
            <div style={{ height: 8, background: T.surface2, borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: `linear-gradient(90deg, ${k.color}, ${T.gold})`,
              }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: T.violetDark, fontWeight: 800 }}>
              {pct}% collectés · {campaign.donors_count} donateur{campaign.donors_count > 1 ? "s" : ""}
            </div>
          </div>

          {/* QR géant */}
          <div style={{
            display: "inline-block", padding: 16,
            background: "#FFFFFF",
            border: `3px solid ${T.gold}`, borderRadius: 18,
            marginBottom: 16,
          }}>
            { }
            <img loading="lazy" decoding="async" src={qrUrl} alt={`QR code vers ${campaign.title}`}
              width={280} height={280}
              style={{ display: "block" }} />
          </div>

          <div style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 4px", color: T.violetDark, fontWeight: 800 }}>
            📲 Scanne pour soutenir
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace", wordBreak: "break-all", padding: "0 12px" }}>
            {targetUrl}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 26, paddingTop: 16, borderTop: `1px dashed ${T.border}`,
            fontSize: 11.5, color: T.textMuted, lineHeight: 1.5,
          }}>
            <strong style={{ color: T.violetDark, fontFamily: F.title, fontSize: 13 }}>
              Centre Chrétien Berakah
            </strong>
            <br />
            ASBL · Belgique · Cameroun · centrechretienberakah@gmail.com
          </div>
        </div>
      </div>
    </div>
  );
}
