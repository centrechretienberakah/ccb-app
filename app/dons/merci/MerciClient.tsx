"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  PAYMENT_MODES,
  getKind,
  formatAmount,
  type DonationRecord,
  type PaymentMode,
} from "@/lib/dons/theme";

interface GuestIntent {
  kind: string;
  amount_native: number;
  currency: "XAF" | "EUR" | "USD" | "CDF";
  payment_mode: string | null;
  reference: string | null;
  kindLabel?: string;
  modeTitle?: string | null;
  modeInfo?: string | null;
  campaignTitle?: string | null;
}

export default function MerciClient({
  record, campaignTitle, isGuest,
}: {
  record: DonationRecord | null;
  campaignTitle: string | null;
  isGuest: boolean;
}) {
  const [guestIntent, setGuestIntent] = useState<GuestIntent | null>(null);

  useEffect(() => {
    if (!isGuest || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("ccb_donation_intent");
      if (raw) setGuestIntent(JSON.parse(raw));
    } catch { /* noop */ }
  }, [isGuest]);

  // Source de vérité : record DB > guestIntent sessionStorage
  const data = record
    ? {
        kindId:   record.kind,
        kindLabel: getKind(record.kind).label,
        kindEmoji: getKind(record.kind).emoji,
        amount: record.amount_native,
        currency: record.currency,
        amountXaf: record.amount_xaf,
        modeId: record.payment_mode,
        reference: record.reference,
        campaignTitle,
      }
    : guestIntent
    ? {
        kindId: guestIntent.kind,
        kindLabel: guestIntent.kindLabel ?? getKind(guestIntent.kind).label,
        kindEmoji: getKind(guestIntent.kind).emoji,
        amount: guestIntent.amount_native,
        currency: guestIntent.currency,
        amountXaf: 0,
        modeId: guestIntent.payment_mode,
        reference: guestIntent.reference,
        campaignTitle: guestIntent.campaignTitle ?? null,
      }
    : null;

  const mode: PaymentMode | null = data?.modeId
    ? PAYMENT_MODES.find((m) => m.id === data.modeId) ?? null
    : null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* Hero */}
      <div style={{
        padding: "60px 24px 30px",
        background: `linear-gradient(135deg, ${T.violetDark} 0%, ${T.violet} 60%, ${T.goldDark} 100%)`,
        color: "#fff", textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 10 }}>🙏</div>
        <h1 style={{
          fontFamily: F.title, fontSize: "clamp(28px, 4.5vw, 38px)", margin: "0 0 8px",
          fontWeight: 800, lineHeight: 1.15,
        }}>Merci pour ton geste de générosité</h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14.5, margin: 0, lineHeight: 1.6 }}>
          Ton intention a été enregistrée. Voici les instructions pour la concrétiser.
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: "-22px auto 0", padding: "0 16px 80px" }}>
        {/* Récap */}
        {data ? (
          <section style={{
            background: T.card, border: `2px solid ${T.gold}`, borderRadius: 16,
            padding: "20px 22px", boxShadow: T.shadowMd, marginBottom: 22,
          }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
              📋 Récap
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{data.kindEmoji} {data.kindLabel}</span>
              <span style={{ fontFamily: F.title, fontSize: 28, fontWeight: 800, color: T.violetDark, fontVariantNumeric: "tabular-nums" }}>
                {formatAmount(data.amount, data.currency)}
              </span>
            </div>
            {data.currency !== "XAF" && data.amountXaf > 0 ? (
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                ≈ {formatAmount(data.amountXaf, "XAF")}
              </div>
            ) : null}
            {data.campaignTitle ? (
              <div style={{ marginTop: 10, fontSize: 13, color: T.violetDark }}>
                🎯 Affecté à : <strong>{data.campaignTitle}</strong>
              </div>
            ) : null}
            {data.reference ? (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: T.surface2, borderRadius: 8,
                fontFamily: "monospace", fontSize: 12.5, color: T.textSoft,
              }}>📎 Référence : <strong>{data.reference}</strong></div>
            ) : null}
          </section>
        ) : null}

        {/* Instructions */}
        <section style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: "20px 22px", marginBottom: 22,
        }}>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px", color: T.text }}>
            📲 Comment finaliser ton don
          </h2>
          {mode ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${mode.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>{mode.emoji}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{mode.title}</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{mode.detail}</div>
                </div>
              </div>
              <div style={{
                padding: "12px 14px", background: T.surface2, borderRadius: 10,
                fontFamily: "monospace", fontSize: 15, fontWeight: 700,
                wordBreak: "break-all", color: T.text, marginBottom: 12,
              }}>{mode.info}</div>
            </div>
          ) : (
            <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 12px" }}>
              Aucun moyen de paiement sélectionné. Retourne à la page Dons pour le choisir.
            </p>
          )}
          <ol style={{
            paddingLeft: 20, fontSize: 13.5, color: T.textSoft, lineHeight: 1.7, margin: 0,
          }}>
            <li>Effectue le transfert vers le numéro / IBAN ci-dessus.</li>
            <li>{data?.reference ? <>Pense à mentionner la référence : <strong>{data.reference}</strong></> : "Mentionne ton nom dans la référence du transfert."}</li>
            <li>L'équipe confirmera la réception sous 24-48h.</li>
            <li>Tu peux suivre l'historique de tes dons dans <Link href="/dons/mes-dons" style={{ color: T.violet, fontWeight: 700 }}>Mes dons</Link>.</li>
          </ol>
        </section>

        {/* Verset */}
        <section style={{
          background: "rgba(212,175,55,0.08)", border: `1px solid ${T.gold}`,
          borderRadius: 16, padding: "20px 22px", textAlign: "center", marginBottom: 22,
        }}>
          <p style={{ fontStyle: "italic", color: T.text, fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>
            &ldquo;Et mon Dieu pourvoira à tous vos besoins selon sa richesse,
            avec gloire, en Jésus-Christ.&rdquo;
          </p>
          <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 700, display: "block", marginTop: 8 }}>
            — Philippiens 4:19
          </span>
        </section>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/dons" style={{
            padding: "11px 22px", background: T.violet, color: "#fff",
            borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>← Retour aux dons</Link>
          <Link href="/dons/mes-dons" style={{
            padding: "11px 22px", background: T.card, color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>📋 Voir mes dons</Link>
          <Link href="/contact" style={{
            padding: "11px 22px", background: T.card, color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>📬 Nous contacter</Link>
        </div>
      </div>
    </div>
  );
}
