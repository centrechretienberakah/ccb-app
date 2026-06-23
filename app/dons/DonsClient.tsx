"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  CURRENCIES, type CurrencyCode, getCurrency, formatAmount, toXAF,
  DONATION_KINDS, type DonationKind, getKind,
  type PayRegion, type PaymentMode,
  DONATION_USES,
  type DonationCampaign, campaignProgress, daysLeft,
} from "@/lib/dons/theme";

interface Props {
  heroTitle: string;
  heroIntro: string;
  campaigns: DonationCampaign[];
  isAdmin: boolean;
  paymentModes: PaymentMode[];
}

const VERSES = [
  { ref: "2 Corinthiens 9:7", text: "Que chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie." },
  { ref: "Proverbes 3:9-10",  text: "Honore l'Éternel avec tes biens et avec les prémices de tout ton revenu ; alors tes greniers seront remplis d'abondance." },
  { ref: "Malachie 3:10",      text: "Apportez à la maison du trésor toutes les dîmes… mettez-moi de la sorte à l'épreuve, dit l'Éternel des armées, et vous verrez si je n'ouvre pas pour vous les écluses des cieux." },
  { ref: "Luc 6:38",           text: "Donnez, et il vous sera donné : on versera dans votre sein une bonne mesure, serrée, secouée et qui déborde." },
];

const REGION_LABELS: Record<PayRegion, { label: string; emoji: string; sub: string }> = {
  CM:   { label: "Cameroun",        emoji: "🇨🇲", sub: "Mobile Money & Express Union" },
  EU:   { label: "Europe",          emoji: "🇪🇺", sub: "Virement SEPA depuis la Belgique" },
  INTL: { label: "International",    emoji: "🌐", sub: "PayPal & Wise" },
  CD:   { label: "RDC",              emoji: "🇨🇩", sub: "M-Pesa & Airtel Money" },
};

const REGION_ORDER: PayRegion[] = ["CM", "EU", "INTL", "CD"];

type Tab = "give" | "where";

export default function DonsClient({ heroTitle, heroIntro, campaigns, isAdmin, paymentModes }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>("XAF");
  const [kind, setKind] = useState<DonationKind>("offering");
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [region, setRegion] = useState<PayRegion>("CM");
  const [tab, setTab] = useState<Tab>("give");
  const [verseIdx, setVerseIdx] = useState<number>(() => Math.floor(Math.random() * VERSES.length));
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  const [selectedMode, setSelectedMode] = useState<PaymentMode | null>(null);
  const [busyConfirm, setBusyConfirm] = useState(false);
  const [dedication, setDedication] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(1);
  const router = useRouter();

  // Sélectionner une campagne → pré-remplit le wizard
  function selectCampaign(c: DonationCampaign) {
    setSelectedCampaign(c);
    setKind(c.kind);
    setTab("give");
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const el = document.getElementById("wizard");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  // Pré-remplit depuis ?campaign=slug (vient d'un QR code)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("campaign");
    if (!slug || selectedCampaign) return;
    const match = campaigns.find((c) => c.slug === slug);
    if (match) selectCampaign(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const cur = getCurrency(currency);
  const verse = VERSES[verseIdx];
  const selectedKind = DONATION_KINDS.find((k) => k.id === kind)!;

  const finalAmount: number | null = useMemo(() => {
    if (amount && amount > 0) return amount;
    const parsed = parseFloat(customAmount.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return null;
  }, [amount, customAmount]);

  const regionModes = useMemo(() => paymentModes.filter((m) => m.region === region), [region, paymentModes]);

  function rotateVerse() {
    setVerseIdx((i) => (i + 1) % VERSES.length);
  }

  async function handleConfirm(payNow: boolean = false) {
    if (busyConfirm) return;
    if (!finalAmount || finalAmount <= 0) { alert("Sélectionne un montant"); return; }
    setBusyConfirm(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const ref = `${selectedKind.label} ${formatAmount(finalAmount, currency)}${selectedCampaign ? ` · ${selectedCampaign.title}` : ""}`;
    const payload = {
      user_id: user?.id ?? null,
      campaign_id: selectedCampaign?.id ?? null,
      kind,
      amount_native: finalAmount,
      currency,
      amount_xaf: toXAF(finalAmount, currency),
      payment_mode: selectedMode?.id ?? null,
      reference: ref,
      status: "pending" as const,
      is_anonymous: false,
      dedication: dedication.trim() || null,
    };

    if (!user) {
      // Pas de session → on stocke en sessionStorage et on redirige vers la page merci
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("ccb_donation_intent", JSON.stringify({
          ...payload,
          kindLabel: selectedKind.label,
          modeTitle: selectedMode?.title ?? null,
          modeInfo: selectedMode?.info ?? null,
          campaignTitle: selectedCampaign?.title ?? null,
        })); } catch { /* noop */ }
      }
      // Pour payer maintenant, il faut être loggé
      if (payNow) {
        router.push(`/auth/login?redirect=/dons`);
        return;
      }
      router.push("/dons/merci?guest=1");
      return;
    }

    const { data, error } = await supabase.from("donations_records").insert(payload).select().single();
    if (error) {
      setBusyConfirm(false);
      // Fallback : si la table n'existe pas encore (SQL v34 non exécuté), on redirige quand même
      router.push("/dons/merci?intent=offline");
      return;
    }

    // Crée l'engagement récurrent si demandé
    if (isRecurring) {
      try {
        await supabase.from("donations_recurring").insert({
          user_id: user.id,
          kind,
          campaign_id: selectedCampaign?.id ?? null,
          amount_native: finalAmount,
          currency,
          amount_xaf: toXAF(finalAmount, currency),
          day_of_month: recurringDay,
          preferred_mode: selectedMode?.id ?? null,
          is_active: true,
        });
      } catch { /* table pas migrée — silencieux */ }
    }

    setBusyConfirm(false);
    const recordId = (data as { id: string }).id;
    if (payNow) {
      router.push(`/dons/payer/${recordId}`);
    } else {
      router.push(`/dons/merci?id=${recordId}${isRecurring ? "&recurring=1" : ""}`);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", padding: "56px 24px 28px",
        background: `linear-gradient(135deg, ${T.violetDark} 0%, ${T.violet} 60%, ${T.goldDark} 100%)`,
        color: "#fff", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, right: -60, fontSize: 280, opacity: 0.05,
          transform: "rotate(-12deg)", lineHeight: 1, pointerEvents: "none",
        }}>💝</div>
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <div style={{ fontSize: 56, marginBottom: 10, textAlign: "center" }}>💝</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(28px, 4.5vw, 40px)",
            margin: "0 0 10px", textAlign: "center", lineHeight: 1.15, fontWeight: 800,
            textShadow: "0 2px 12px rgba(0,0,0,0.25)",
          }}>{heroTitle}</h1>
          <p style={{
            color: "rgba(255,255,255,0.92)", fontSize: 15, lineHeight: 1.6,
            textAlign: "center", maxWidth: 560, margin: "0 auto", whiteSpace: "pre-wrap",
          }}>{heroIntro}</p>
        </div>
      </div>

      {/* ── Verset défilant ──────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: "-22px auto 0", padding: "0 16px", position: "relative", zIndex: 2 }}>
        <button onClick={rotateVerse} aria-label="Verset suivant"
          style={{
            display: "block", width: "100%", textAlign: "left",
            background: T.card, border: `1px solid ${T.gold}`, borderRadius: 16,
            padding: "18px 22px", boxShadow: T.shadowMd, cursor: "pointer",
            fontFamily: F.body,
          }}>
          <p style={{
            fontStyle: "italic", color: T.text, fontSize: 14.5, lineHeight: 1.65,
            margin: 0,
          }}>&ldquo;{verse.text}&rdquo;</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: T.goldDark, fontWeight: 700 }}>📖 {verse.ref}</span>
            <span style={{ fontSize: 11, color: T.textMuted }}>↻ tap pour changer</span>
          </div>
        </button>
      </div>

      {/* ── Campagnes en cours ────────────────────────────────────── */}
      {campaigns.length > 0 ? (
        <div style={{ maxWidth: 1000, margin: "30px auto 0", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontFamily: F.title, fontSize: 20, margin: 0, fontWeight: 700, color: T.text }}>
              🎯 Campagnes en cours
            </h2>
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
              {campaigns.length} projet{campaigns.length > 1 ? "s" : ""} actif{campaigns.length > 1 ? "s" : ""}
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14,
          }}>
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} onSelect={() => selectCampaign(c)} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Admin badge ──────────────────────────────────────────── */}
      {isAdmin ? (
        <div style={{ maxWidth: 1000, margin: "16px auto 0", padding: "0 16px" }}>
          <Link href="/dons/admin" style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: T.violetSoft, border: `1px solid ${T.violet}`, color: T.gold,
            borderRadius: 999, fontWeight: 700, fontSize: 12.5, textDecoration: "none",
          }}>⚙️ Gérer les campagnes</Link>
        </div>
      ) : null}

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div id="wizard" style={{ maxWidth: 760, margin: "26px auto 0", padding: "0 16px" }}>
        <div style={{
          display: "inline-flex", background: T.surface2, borderRadius: 999,
          padding: 4, gap: 4, border: `1px solid ${T.border}`,
        }}>
          <TabBtn active={tab === "give"} onClick={() => setTab("give")}>💝 Donner</TabBtn>
          <TabBtn active={tab === "where"} onClick={() => setTab("where")}>🙏 Où vont mes dons</TabBtn>
        </div>
      </div>

      {tab === "give" ? (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>
          {/* 1. Type de don */}
          <Section title="1. Quel type de don ?" hint="Choisis ce qui correspond le mieux à ton intention.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {DONATION_KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)}
                  style={{
                    textAlign: "left", padding: "14px 14px",
                    background: kind === k.id ? T.violetSoft : T.card,
                    border: `1.5px solid ${kind === k.id ? T.gold : T.border}`,
                    borderRadius: 12, cursor: "pointer", fontFamily: F.body,
                    transition: "transform 120ms ease, border-color 120ms ease",
                  }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{k.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{k.label}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{k.description}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* 2. Devise & montant */}
          <Section title="2. Montant" hint="Sélectionne ta devise puis un montant suggéré ou personnalisé.">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {CURRENCIES.map((c) => (
                <button key={c.code} onClick={() => { setCurrency(c.code); setAmount(""); setCustomAmount(""); }}
                  style={{
                    padding: "8px 14px", borderRadius: 999,
                    background: currency === c.code ? T.gold : T.card,
                    color: currency === c.code ? "#1a1206" : T.textSoft,
                    border: `1px solid ${currency === c.code ? T.gold : T.border}`,
                    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F.body,
                  }}>
                  {c.flag} {c.code}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 12 }}>
              {cur.presets.map((p) => (
                <button key={p} onClick={() => { setAmount(p); setCustomAmount(""); }}
                  style={{
                    padding: "12px 8px", borderRadius: 10, textAlign: "center",
                    background: amount === p ? T.gold : T.card,
                    color: amount === p ? "#000" : T.text,
                    border: `1.5px solid ${amount === p ? T.gold : T.border}`,
                    fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: F.body,
                    fontVariantNumeric: "tabular-nums",
                  }}>{formatAmount(p, currency)}</button>
              ))}
            </div>
            <label style={{ display: "block", fontFamily: F.body }}>
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Autre montant
              </span>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "stretch" }}>
                <input
                  type="number" inputMode="decimal" min="1"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount(""); }}
                  placeholder={`Ex. ${cur.presets[2]}`}
                  style={{
                    flex: 1, padding: "12px 14px",
                    background: T.card, color: T.text, border: `1px solid ${T.border}`,
                    borderRadius: 10, fontSize: 15, fontFamily: F.body,
                  }}
                />
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "0 16px",
                  background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10,
                  fontWeight: 700, color: T.textSoft, fontSize: 13,
                }}>{cur.symbol}</span>
              </div>
            </label>
          </Section>

          {/* 3. Région & moyen */}
          <Section title="3. Comment veux-tu donner ?" hint="Choisis ta région pour voir les moyens les plus rapides.">
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {REGION_ORDER.map((r) => (
                <button key={r} onClick={() => setRegion(r)}
                  style={{
                    padding: "8px 14px", borderRadius: 999,
                    background: region === r ? T.gold : T.card,
                    color: region === r ? "#1a1206" : T.textSoft,
                    border: `1px solid ${region === r ? T.gold : T.border}`,
                    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F.body,
                  }}>
                  {REGION_LABELS[r].emoji} {REGION_LABELS[r].label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 12px" }}>
              {REGION_LABELS[region].sub}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {regionModes.map((m) => (
                <ModeCard key={m.id} mode={m}
                  amount={finalAmount}
                  currency={currency}
                  kind={selectedKind.label}
                  selected={selectedMode?.id === m.id}
                  onSelect={() => setSelectedMode(m)}
                />
              ))}
              {regionModes.length === 0 ? (
                <p style={{ color: T.textMuted, fontSize: 13, fontStyle: "italic" }}>
                  Aucun moyen disponible pour cette région — contacte-nous.
                </p>
              ) : null}
            </div>
          </Section>

          {/* 3b. Options */}
          <Section title="Options (facultatif)" hint="Personnalise ton don selon ta convenance.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="dons-options-grid">

              <label style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px",
                background: isRecurring ? T.violetSoft : T.card,
                border: `1.5px solid ${isRecurring ? T.gold : T.border}`,
                borderRadius: 10, cursor: "pointer", fontFamily: F.body,
              }}>
                <input type="checkbox" checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ marginTop: 3, accentColor: T.violet }}
                  disabled={!finalAmount} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.text, display: "block" }}>
                    🔄 Don récurrent (chaque mois)
                  </span>
                  <span style={{ fontSize: 11.5, color: T.textMuted, display: "block", marginBottom: isRecurring ? 6 : 0 }}>
                    Engagement mensuel. Tu pourras l&apos;arrêter à tout moment.
                  </span>
                  {isRecurring ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11.5 }}>Jour du mois :</span>
                      <select value={recurringDay}
                        onChange={(e) => setRecurringDay(parseInt(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: "3px 8px", background: T.card,
                          border: `1px solid ${T.border}`, borderRadius: 6,
                          fontSize: 12, color: T.text,
                        }}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                🕊️ Dédier ce don (optionnel)
              </span>
              <input type="text" value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                maxLength={200}
                placeholder="Ex. En mémoire de mon père · Pour la guérison de Marie"
                style={{
                  marginTop: 6, width: "100%", padding: "10px 12px",
                  background: T.card, color: T.text, border: `1px solid ${T.border}`,
                  borderRadius: 8, fontSize: 13.5, fontFamily: F.body,
                }} />
            </label>
          </Section>

          {/* 4. Récap */}
          <Section title="4. Récap de ton intention">
            {selectedCampaign ? (
              <div style={{
                marginBottom: 10, padding: "10px 14px",
                background: T.violetSoft, border: `1px solid ${T.violet}`, borderRadius: 10,
                fontSize: 12.5, color: T.gold, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                <span>🎯 Affecté à la campagne <strong>{selectedCampaign.title}</strong></span>
                <button onClick={() => setSelectedCampaign(null)} style={{
                  background: "transparent", color: T.gold, border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: 12,
                }}>× retirer</button>
              </div>
            ) : null}
            {(isRecurring || dedication) ? (
              <div style={{
                marginBottom: 10, padding: "10px 14px",
                background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10,
                fontSize: 12, color: T.textSoft, display: "flex", gap: 16, flexWrap: "wrap",
              }}>
                {isRecurring ? <span>🔄 <strong>Mensuel</strong> (jour {recurringDay})</span> : null}
                {dedication ? <span>🕊️ <strong>{dedication}</strong></span> : null}
              </div>
            ) : null}
            <div style={{
              padding: "18px 20px", background: T.card,
              border: `1.5px solid ${T.gold}`, borderRadius: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {selectedKind.emoji} {selectedKind.label}
                </div>
                <div style={{ fontFamily: F.title, fontSize: 32, fontWeight: 800, color: T.text, lineHeight: 1.1, marginTop: 4 }}>
                  {finalAmount ? formatAmount(finalAmount, currency) : "—"}
                </div>
                {finalAmount && currency !== "XAF" ? (
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                    ≈ {formatAmount(Math.round(finalAmount / cur.fromXAF), "XAF")}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => handleConfirm(false)} disabled={busyConfirm || !finalAmount} style={{
                  padding: "12px 22px",
                  background: !finalAmount ? T.textMuted : T.card,
                  color: !finalAmount ? "#fff" : T.text,
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 999, fontWeight: 700, fontSize: 13,
                  cursor: busyConfirm || !finalAmount ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", fontFamily: F.body,
                  opacity: busyConfirm ? 0.6 : 1,
                }}>
                  💝 Déclarer l&apos;intention
                </button>
                <button onClick={() => handleConfirm(true)} disabled={busyConfirm || !finalAmount} style={{
                  padding: "12px 22px",
                  background: !finalAmount ? T.textMuted : T.heart,
                  color: "#fff", border: "none",
                  borderRadius: 999, fontWeight: 800, fontSize: 13,
                  cursor: busyConfirm || !finalAmount ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", fontFamily: F.body,
                  opacity: busyConfirm ? 0.6 : 1,
                }}>
                  ⚡ Payer maintenant
                </button>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10, textAlign: "center" }}>
              💡 <strong>Payer maintenant</strong> : PayPal / Mobile Money en quelques clics. <strong>Déclarer l&apos;intention</strong> : instructions pour virement / cash manuel.
            </p>
          </Section>
        </div>
      ) : (
        // ── Tab : où vont les dons ─────────────────────────────────────
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>
          <Section title="🙏 Ce que rendent possibles vos dons">
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {DONATION_USES.map((u) => (
                  <div key={u.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{u.emoji}</span>
                    <span style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.4 }}>{u.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="🌟 Engagements du CCB envers vos dons">
            <ul style={{
              listStyle: "none", padding: 0, margin: 0,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            }}>
              {[
                "Transparence totale : un rapport financier annuel est partagé avec les membres.",
                "Aucun don n'est utilisé pour des avantages personnels — tout reste au service du ministère.",
                "Les dîmes sont distinctement comptabilisées et utilisées prioritairement pour la mission.",
                "Les actions sociales restent confidentielles et préservent la dignité des bénéficiaires.",
              ].map((line, i) => (
                <li key={i} style={{
                  padding: "14px 18px", borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
                  fontSize: 13.5, color: T.textSoft, lineHeight: 1.5,
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ color: T.gold, fontWeight: 800, fontSize: 14 }}>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="📬 Une question ?">
            <div style={{
              padding: "20px 22px", background: T.violetSoft, border: `1px solid ${T.violet}`,
              borderRadius: 14, textAlign: "center",
            }}>
              <p style={{ fontSize: 13.5, color: T.textSoft, margin: "0 0 14px", lineHeight: 1.5 }}>
                Pour un reçu fiscal (Belgique), un don important, ou un legs au ministère, contacte-nous directement.
              </p>
              <Link href="/contact" style={{
                display: "inline-block", padding: "10px 24px",
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", borderRadius: 999,
                fontWeight: 700, fontSize: 13, textDecoration: "none",
              }}>📬 Écrire à l'équipe</Link>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Atoms ───────────────────────────────────────────────────────────
function Section({ title, hint, children }: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 4px", fontWeight: 700, color: T.text }}>{title}</h2>
      {hint ? <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px" }}>{hint}</p> : null}
      <div>{children}</div>
    </section>
  );
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 999,
      background: active ? T.card : "transparent",
      color: active ? T.text : T.textMuted,
      border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
      fontFamily: F.body, boxShadow: active ? T.shadowSoft : "none",
    }}>{children}</button>
  );
}

function CampaignCard({ campaign, onSelect }: {
  campaign: DonationCampaign; onSelect: () => void;
}) {
  const pct = campaignProgress(campaign);
  const remaining = Math.max(0, campaign.target_amount_xaf - campaign.current_amount_xaf);
  const days = daysLeft(campaign);
  const kindDef = getKind(campaign.kind);

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: T.shadowSoft,
    }}>
      {/* Cover */}
      <div style={{
        position: "relative", aspectRatio: "16/9",
        background: campaign.cover_url ? "#000" : `linear-gradient(135deg, ${kindDef.color}, ${T.violetDark})`,
      }}>
        {campaign.cover_url ? (
          <img loading="lazy" decoding="async" src={campaign.cover_url} alt={campaign.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64, color: "rgba(255,255,255,0.85)",
          }}>{kindDef.emoji}</div>
        )}
        <div style={{
          position: "absolute", top: 10, left: 10,
          padding: "4px 10px", borderRadius: 6,
          background: "rgba(0,0,0,0.7)", color: "#fff",
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
        }}>{kindDef.emoji} {kindDef.label.toUpperCase()}</div>
        {campaign.is_featured ? (
          <div style={{
            position: "absolute", top: 10, right: 10,
            padding: "4px 10px", borderRadius: 6,
            background: T.gold, color: "#000",
            fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
          }}>⭐ MIS EN AVANT</div>
        ) : null}
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3 style={{ fontFamily: F.title, fontSize: 17, margin: 0, fontWeight: 700, color: T.text, lineHeight: 1.25 }}>
          {campaign.title}
        </h3>
        {campaign.subtitle ? (
          <p style={{ fontSize: 13, color: T.textSoft, margin: 0, lineHeight: 1.45 }}>{campaign.subtitle}</p>
        ) : null}

        {/* Jauge */}
        <div style={{ marginTop: 6 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 4, fontSize: 12, color: T.textMuted, fontWeight: 600,
          }}>
            <span style={{ color: T.text, fontWeight: 800, fontSize: 14 }}>
              {formatAmount(campaign.current_amount_xaf, "XAF")}
            </span>
            <span>sur {formatAmount(campaign.target_amount_xaf, "XAF")}</span>
          </div>
          <div style={{ height: 8, background: T.surface2, borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: `linear-gradient(90deg, ${kindDef.color}, ${T.gold})`,
              transition: "width 400ms ease",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 4,
            fontSize: 11, color: T.textMuted, fontWeight: 600,
          }}>
            <span style={{ color: T.gold, fontWeight: 800 }}>{pct} % collectés</span>
            <span>{campaign.donors_count} donateur{campaign.donors_count > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.textMuted, marginTop: 2, flexWrap: "wrap" }}>
          {remaining > 0 ? <span>🎯 Reste {formatAmount(remaining, "XAF")}</span> : <span style={{ color: T.green, fontWeight: 700 }}>✓ Objectif atteint !</span>}
          {days != null ? <span>⏳ {days} jour{days > 1 ? "s" : ""}</span> : null}
        </div>

        <button onClick={onSelect} style={{
          marginTop: "auto", padding: "10px 14px",
          background: T.heart, color: "#fff", border: "none",
          borderRadius: 999, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: F.body,
        }}>💝 Soutenir cette campagne</button>
      </div>
    </div>
  );
}

function ModeCard({ mode, amount, currency, kind, selected, onSelect }: {
  mode: PaymentMode; amount: number | null; currency: CurrencyCode; kind: string;
  selected: boolean; onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(mode.copyValue ?? mode.info);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  }
  const note = amount
    ? `Don ${kind} — ${formatAmount(amount, currency)}`
    : null;

  return (
    <div onClick={onSelect} style={{
      padding: "14px 14px 12px",
      background: selected ? `${mode.color}10` : T.card,
      border: `2px solid ${selected ? mode.color : mode.color + "33"}`,
      borderRadius: 14, cursor: "pointer",
      display: "flex", flexDirection: "column", gap: 8,
      transition: "border-color 120ms ease, background 120ms ease",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${mode.color}, ${T.gold})` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${mode.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{mode.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 14, color: "#f0d060" }}>{mode.title}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted }}>{mode.detail}</div>
        </div>
        {selected ? (
          <span style={{
            padding: "2px 8px", borderRadius: 6,
            background: mode.color, color: "#fff",
            fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
          }}>✓ CHOISI</span>
        ) : mode.type === "instant" ? (
          <span style={{
            padding: "2px 8px", borderRadius: 6,
            background: T.green, color: "#fff",
            fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
          }}>RAPIDE</span>
        ) : null}
      </div>
      <div style={{
        padding: "8px 10px", background: T.surface2, borderRadius: 8,
        fontFamily: "monospace", fontSize: 13, fontWeight: 700,
        color: T.text, wordBreak: "break-all",
      }}>{mode.info}</div>
      {note ? (
        <div style={{
          fontSize: 11.5, color: T.textMuted,
          padding: "4px 0 0", lineHeight: 1.4,
        }}>💡 Référence à mentionner : <strong>{note}</strong></div>
      ) : null}
      <button onClick={copy} style={{
        marginTop: 4, padding: "7px 10px",
        background: copied ? T.green : "transparent",
        color: copied ? "#fff" : mode.color,
        border: `1px solid ${copied ? T.green : mode.color}`,
        borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer",
        fontFamily: F.body,
      }}>{copied ? "✓ Copié" : "📋 Copier le numéro"}</button>
    </div>
  );
}
