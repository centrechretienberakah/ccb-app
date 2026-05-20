"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  CURRENCIES, type CurrencyCode, getCurrency, formatAmount,
  DONATION_KINDS, type DonationKind,
  PAYMENT_MODES, type PayRegion, type PaymentMode,
  DONATION_USES,
} from "@/lib/dons/theme";

interface Props {
  heroTitle: string;
  heroIntro: string;
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

export default function DonsClient({ heroTitle, heroIntro }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>("XAF");
  const [kind, setKind] = useState<DonationKind>("offering");
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [region, setRegion] = useState<PayRegion>("CM");
  const [tab, setTab] = useState<Tab>("give");
  const [verseIdx, setVerseIdx] = useState<number>(() => Math.floor(Math.random() * VERSES.length));

  const cur = getCurrency(currency);
  const verse = VERSES[verseIdx];
  const selectedKind = DONATION_KINDS.find((k) => k.id === kind)!;

  const finalAmount: number | null = useMemo(() => {
    if (amount && amount > 0) return amount;
    const parsed = parseFloat(customAmount.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return null;
  }, [amount, customAmount]);

  const regionModes = useMemo(() => PAYMENT_MODES.filter((m) => m.region === region), [region]);

  function rotateVerse() {
    setVerseIdx((i) => (i + 1) % VERSES.length);
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

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: "26px auto 0", padding: "0 16px" }}>
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
                    border: `1.5px solid ${kind === k.id ? T.violet : T.border}`,
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
                    background: currency === c.code ? T.violet : T.card,
                    color: currency === c.code ? "#fff" : T.textSoft,
                    border: `1px solid ${currency === c.code ? T.violet : T.border}`,
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
                    background: region === r ? T.violet : T.card,
                    color: region === r ? "#fff" : T.textSoft,
                    border: `1px solid ${region === r ? T.violet : T.border}`,
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
                />
              ))}
              {regionModes.length === 0 ? (
                <p style={{ color: T.textMuted, fontSize: 13, fontStyle: "italic" }}>
                  Aucun moyen disponible pour cette région — contacte-nous.
                </p>
              ) : null}
            </div>
          </Section>

          {/* 4. Récap */}
          <Section title="4. Récap de ton intention">
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
              <Link href="/contact" style={{
                padding: "12px 22px", background: T.heart, color: "#fff",
                borderRadius: 999, fontWeight: 800, fontSize: 13, textDecoration: "none",
                whiteSpace: "nowrap",
              }}>📬 Confirmer mon don</Link>
            </div>
            <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10, textAlign: "center" }}>
              💡 Pour un reçu fiscal ou un don récurrent, contacte-nous directement après ton virement.
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
                background: T.violet, color: "#fff", borderRadius: 999,
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

function ModeCard({ mode, amount, currency, kind }: {
  mode: PaymentMode; amount: number | null; currency: CurrencyCode; kind: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
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
    <div style={{
      padding: "14px 14px 12px",
      background: T.card, border: `1.5px solid ${mode.color}33`,
      borderRadius: 14,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${mode.color}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>{mode.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{mode.title}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted }}>{mode.detail}</div>
        </div>
        {mode.type === "instant" ? (
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
