"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DONS_THEME as T, DONS_FONTS as F,
  type DonationRecord,
  getKind, formatAmount,
} from "@/lib/dons/theme";

interface Props {
  record: DonationRecord;
  paypalClientId: string;
  paypalEnv: string;
  notchPayEnabled: boolean;
  justPaid: boolean;
}

declare global {
  interface Window {
    // PayPal SDK injecte window.paypal après chargement du script
    paypal?: {
      Buttons: (opts: PayPalButtonsOpts) => { render: (sel: string) => Promise<void> };
    };
  }
}

interface PayPalButtonsOpts {
  style?: { layout?: string; color?: string; shape?: string; label?: string };
  createOrder?: () => Promise<string>;
  onApprove?: (data: { orderID: string }) => Promise<void>;
  onError?: (err: unknown) => void;
  onCancel?: () => void;
}

export default function PayerClient({
  record, paypalClientId, paypalEnv, notchPayEnabled, justPaid,
}: Props) {
  const router = useRouter();
  const k = getKind(record.kind);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"paypal" | "notchpay" | null>(null);
  const [polled, setPolled] = useState(false);
  const buttonsRef = useRef<HTMLDivElement | null>(null);

  // Si retour de Notch Pay (callback?paid=1) → poll le statut côté serveur 3-4 fois
  useEffect(() => {
    if (!justPaid || polled) return;
    setPolled(true);
    let cancelled = false;
    let attempts = 0;
    async function check() {
      attempts++;
      // On force un router.refresh qui re-fetch côté serveur → si status passé en confirmed, redirect kick in.
      router.refresh();
      if (attempts < 6 && !cancelled) {
        setTimeout(check, 2500);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [justPaid, polled, router]);

  // Charge le SDK PayPal si configuré
  useEffect(() => {
    if (!paypalClientId) return;
    if (typeof window === "undefined") return;
    if (window.paypal) { setPaypalReady(true); return; }

    const targetCurrency = record.currency === "USD" ? "USD" : "EUR";
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=${targetCurrency}&intent=capture&disable-funding=credit,card`;

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => setPaypalReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => setPaypalError("Échec chargement SDK PayPal");
    document.body.appendChild(script);
  }, [paypalClientId, record.currency]);

  // Render PayPal Smart Buttons
  useEffect(() => {
    if (!paypalReady || !buttonsRef.current || !window.paypal) return;
    if (buttonsRef.current.childElementCount > 0) return; // déjà rendu

    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "donate" },
      createOrder: async () => {
        setBusy("paypal");
        const res = await fetch("/api/dons/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id }),
        });
        if (!res.ok) {
          const err = await res.json();
          setPaypalError(err.error ?? "Erreur création commande");
          setBusy(null);
          throw new Error(err.error);
        }
        const data = await res.json() as { orderId: string };
        return data.orderId;
      },
      onApprove: async ({ orderID }) => {
        const res = await fetch("/api/dons/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderID, recordId: record.id }),
        });
        setBusy(null);
        if (!res.ok) {
          setPaypalError("Erreur capture");
          return;
        }
        const data = await res.json() as { status: string };
        if (data.status === "confirmed") {
          router.push(`/dons/merci?id=${record.id}&paid=1`);
        } else {
          setPaypalError("Paiement non finalisé. Réessaie ou contacte l'équipe.");
        }
      },
      onError: (err) => {
        setBusy(null);
        setPaypalError(typeof err === "string" ? err : "Erreur PayPal");
      },
      onCancel: () => { setBusy(null); },
    }).render("#paypal-buttons").catch((e: Error) => setPaypalError(e.message));
  }, [paypalReady, record.id, router]);

  async function payNotchPay() {
    if (busy) return;
    setBusy("notchpay");
    const res = await fetch("/api/dons/notchpay/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: record.id }),
    });
    setBusy(null);
    if (!res.ok) {
      const err = await res.json();
      alert("Erreur Notch Pay : " + (err.error ?? res.status));
      return;
    }
    const data = await res.json() as { authorization_url: string };
    // Redirige vers la page hosted Notch Pay
    if (typeof window !== "undefined") window.location.href = data.authorization_url;
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: F.body, color: T.text }}>
      {/* Hero */}
      <div style={{
        padding: "44px 24px 28px",
        background: `linear-gradient(135deg, ${T.violetDark} 0%, ${T.violet} 60%, ${T.goldDark} 100%)`,
        color: "#fff", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💳</div>
        <h1 style={{ fontFamily: F.title, fontSize: "clamp(24px, 4vw, 34px)", margin: "0 0 6px", fontWeight: 800 }}>
          Finalise ton don
        </h1>
        <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, margin: 0 }}>
          Choisis ton moyen de paiement pour confirmer immédiatement
        </p>
      </div>

      <div style={{ maxWidth: 580, margin: "-18px auto 0", padding: "0 16px 80px" }}>
        {/* Récap */}
        <div style={{
          background: T.card, border: `2px solid ${T.gold}`, borderRadius: 14,
          padding: "16px 20px", boxShadow: T.shadowMd, marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {k.emoji} {k.label}
            </div>
            <div style={{ fontFamily: F.title, fontSize: 28, fontWeight: 800, color: T.violetDark, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {formatAmount(record.amount_native, record.currency)}
            </div>
            {record.currency !== "XAF" ? (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>≈ {formatAmount(record.amount_xaf, "XAF")}</div>
            ) : null}
          </div>
          <span style={{
            padding: "4px 10px", borderRadius: 6,
            background: T.gold, color: "#000",
            fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
          }}>⏳ EN ATTENTE</span>
        </div>

        {justPaid ? (
          <div style={{
            padding: "12px 14px", marginBottom: 14,
            background: T.violetSoft, border: `1px solid ${T.violet}`, borderRadius: 10,
            fontSize: 13, color: T.violetDark, textAlign: "center",
          }}>
            ⏳ Vérification du paiement en cours… la page va se rafraîchir automatiquement.
          </div>
        ) : null}

        {/* PayPal */}
        <section style={{ marginBottom: 18 }}>
          <h2 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 10px" }}>
            🔵 PayPal {paypalEnv === "sandbox" ? <span style={{ color: T.gold, fontSize: 11 }}>(sandbox)</span> : null}
          </h2>
          {paypalClientId ? (
            <>
              {!paypalReady && !paypalError ? (
                <div style={{ padding: 14, background: T.surface2, borderRadius: 10, fontSize: 12.5, color: T.textMuted, textAlign: "center" }}>
                  Chargement du SDK PayPal…
                </div>
              ) : null}
              {paypalError ? (
                <div style={{ padding: 12, background: T.heartSoft, border: `1px solid ${T.heart}`, borderRadius: 10, fontSize: 12.5, color: T.heart }}>
                  ⚠️ {paypalError}
                </div>
              ) : null}
              <div ref={buttonsRef} id="paypal-buttons" />
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 6, textAlign: "center" }}>
                Don traité par PayPal · paiement sécurisé · pas de carte stockée chez CCB
              </p>
            </>
          ) : (
            <div style={{ padding: 14, background: T.surface2, borderRadius: 10, fontSize: 12.5, color: T.textMuted }}>
              ⚙️ Configuration requise : <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> + <code>PAYPAL_CLIENT_SECRET</code> dans .env
            </div>
          )}
        </section>

        {/* Notch Pay */}
        {(record.currency === "XAF") ? (
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 10px" }}>
              📱 Mobile Money (MTN MoMo + Orange Money)
            </h2>
            {notchPayEnabled ? (
              <button onClick={payNotchPay} disabled={busy !== null}
                style={{
                  display: "block", width: "100%", padding: "14px 20px",
                  background: "linear-gradient(90deg, #FFCC00, #FF7900)",
                  color: "#000", border: "none", borderRadius: 999,
                  fontWeight: 800, fontSize: 14, cursor: busy ? "wait" : "pointer", fontFamily: F.body,
                }}>
                {busy === "notchpay" ? "Redirection..." : "📱 Payer via MoMo / Orange Money"}
              </button>
            ) : (
              <div style={{ padding: 14, background: T.surface2, borderRadius: 10, fontSize: 12.5, color: T.textMuted }}>
                ⚙️ Configuration requise : <code>NEXT_PUBLIC_NOTCH_PAY_PUBLIC_KEY</code> + <code>NOTCH_PAY_SECRET_KEY</code> dans .env
              </div>
            )}
            <p style={{ fontSize: 11, color: T.textMuted, marginTop: 6, textAlign: "center" }}>
              Tu seras redirigé vers la page sécurisée Notch Pay pour finaliser
            </p>
          </section>
        ) : null}

        {/* Fallback manuel */}
        <section style={{
          padding: 16, background: T.surface2, border: `1px dashed ${T.border}`,
          borderRadius: 12, fontSize: 12.5, color: T.textSoft, lineHeight: 1.55,
        }}>
          💡 Tu préfères un virement manuel ou une autre méthode ?
          {" "}<Link href={`/dons/merci?id=${record.id}`} style={{ color: T.violet, fontWeight: 700 }}>
            Voir les instructions de paiement manuel
          </Link>.
        </section>

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link href="/dons/mes-dons" style={{ fontSize: 12.5, color: T.textMuted, textDecoration: "none" }}>
            ← Revenir à mes dons
          </Link>
        </div>
      </div>
    </div>
  );
}
