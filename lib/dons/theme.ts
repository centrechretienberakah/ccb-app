// Charte visuelle module Dons — premium CCB violet royal + or
// avec accent rouge cœur pour les CTA "donner"

export const DONS_THEME = {
  bg:           "#F8F5F1",       // ivoire (page)
  card:         "#FFFFFF",
  surface2:     "#F2EDE5",
  border:       "#E5DECC",
  borderSoft:   "#EFE9DA",
  text:         "#111111",
  textSoft:     "#3A3340",
  textMuted:    "#857C95",

  violet:       "#5A2CA0",
  violetDark:   "#3E1C70",
  violetSoft:   "rgba(90,44,160,0.08)",
  lavender:     "#EDE7FA",

  gold:         "#D4AF37",
  goldDark:     "#A8862B",
  goldSoft:     "rgba(212,175,55,0.10)",

  heart:        "#E11D48",       // rouge cœur pour CTA donner
  heartSoft:    "rgba(225,29,72,0.10)",

  green:        "#2E9B47",       // progression jauges

  shadowSoft:   "0 2px 12px rgba(90,44,160,0.06)",
  shadowMd:     "0 6px 24px rgba(90,44,160,0.10)",
} as const;

export const DONS_FONTS = {
  title: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// ─── Devises ─────────────────────────────────────────────────────────
export type CurrencyCode = "XAF" | "EUR" | "USD" | "CDF";

export interface CurrencyDef {
  code: CurrencyCode;
  label: string;       // "Franc CFA"
  symbol: string;      // "FCFA"
  flag: string;        // emoji drapeau
  /** Conversion approximative depuis XAF (pour affichage seulement, pas pour comptabilité) */
  fromXAF: number;
  /** Montants suggérés natifs */
  presets: number[];
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "XAF", label: "Franc CFA",         symbol: "FCFA", flag: "🇨🇲", fromXAF: 1,        presets: [5_000, 10_000, 25_000, 50_000, 100_000] },
  { code: "EUR", label: "Euro",              symbol: "€",    flag: "🇪🇺", fromXAF: 1 / 656,   presets: [10, 25, 50, 100, 250] },
  { code: "USD", label: "Dollar américain",  symbol: "$",    flag: "🇺🇸", fromXAF: 1 / 600,   presets: [10, 25, 50, 100, 250] },
  { code: "CDF", label: "Franc congolais",   symbol: "FC",   flag: "🇨🇩", fromXAF: 3.8,       presets: [10_000, 25_000, 50_000, 100_000, 250_000] },
];

export function getCurrency(code: string): CurrencyDef {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatAmount(amount: number, currency: CurrencyCode): string {
  const c = getCurrency(currency);
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: currency === "XAF" || currency === "CDF" ? 0 : 2,
  });
  return `${formatter.format(amount)} ${c.symbol}`;
}

// ─── Types de don ────────────────────────────────────────────────────
export type DonationKind = "tithe" | "offering" | "project" | "social" | "missions";

export interface DonationKindDef {
  id: DonationKind;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

export const DONATION_KINDS: DonationKindDef[] = [
  { id: "tithe",    label: "Dîme",                   emoji: "✝️",  description: "Mes 10 % pour le Seigneur", color: "#D4AF37" },
  { id: "offering", label: "Offrande libre",         emoji: "🤲",  description: "Un don du cœur",            color: "#5A2CA0" },
  { id: "missions", label: "Missions",               emoji: "🌍",  description: "Évangélisation & terrain",  color: "#2E9B47" },
  { id: "project",  label: "Projet de l'église",     emoji: "🏗️",  description: "Construction & équipement",  color: "#0EA5E9" },
  { id: "social",   label: "Action sociale",         emoji: "❤️",  description: "Aider une famille",          color: "#E11D48" },
];

export function getKind(id: string): DonationKindDef {
  return DONATION_KINDS.find((k) => k.id === id) ?? DONATION_KINDS[1];
}

// ─── Moyens de paiement (par région) ────────────────────────────────
export type PayRegion = "CM" | "EU" | "INTL" | "CD";

export interface PaymentMode {
  id: string;
  region: PayRegion;
  emoji: string;
  title: string;
  detail: string;
  info: string;             // numéro / IBAN / etc.
  copyValue?: string;       // valeur à copier (souvent === info)
  color: string;
  /** "instant" : Mobile Money / paiement en ligne ; "manual" : virement/cash */
  type: "instant" | "manual" | "contact";
}

export const PAYMENT_MODES: PaymentMode[] = [
  // Cameroun (XAF) — priorité 1
  { id: "mtn-momo",       region: "CM",   emoji: "📱", title: "MTN Mobile Money",   detail: "Cameroun · MoMo",         info: "+237 6XX XXX XXX",            color: "#FFCC00", type: "instant" },
  { id: "orange-momo-cm", region: "CM",   emoji: "🟧", title: "Orange Money",       detail: "Cameroun",                info: "+237 6XX XXX XXX",            color: "#FF7900", type: "instant" },
  { id: "express-union",  region: "CM",   emoji: "🏦", title: "Express Union",      detail: "Mandat / transfert",      info: "Bénéficiaire : CCB",          color: "#0066B3", type: "manual" },
  // Europe (EUR)
  { id: "iban-be",        region: "EU",   emoji: "🇪🇺", title: "Virement SEPA",     detail: "Belgique · Compte CCB",   info: "BE00 0000 0000 0000",         color: "#003399", type: "manual" },
  // International (USD)
  { id: "paypal",         region: "INTL", emoji: "💳", title: "PayPal",            detail: "International · USD/EUR", info: "donate@centrechretienberakah.com", color: "#003087", type: "instant" },
  { id: "wise",           region: "INTL", emoji: "🌐", title: "Wise (TransferWise)", detail: "International multi-devises", info: "centrechretienberakah@gmail.com", color: "#9FE870", type: "manual" },
  // RDC (CDF)
  { id: "mpesa-cd",       region: "CD",   emoji: "🟢", title: "M-Pesa Vodacom",     detail: "RDC",                     info: "+243 8XX XXX XXX",            color: "#00B040", type: "instant" },
  { id: "airtel-cd",      region: "CD",   emoji: "🔴", title: "Airtel Money",       detail: "RDC",                     info: "+243 9XX XXX XXX",            color: "#ED1C24", type: "instant" },
];

export function modesByRegion(region: PayRegion): PaymentMode[] {
  return PAYMENT_MODES.filter((m) => m.region === region);
}

// ─── Campagne (DB) ───────────────────────────────────────────────────
export interface DonationCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  kind: DonationKind;
  target_amount_xaf: number;
  current_amount_xaf: number;
  donors_count: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  is_featured: boolean;
  order_index: number;
}

export function campaignProgress(c: DonationCampaign): number {
  if (c.target_amount_xaf <= 0) return 0;
  return Math.min(100, Math.round((c.current_amount_xaf / c.target_amount_xaf) * 100));
}

export function daysLeft(c: DonationCampaign): number | null {
  if (!c.ends_at) return null;
  const ms = new Date(c.ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}


// ─── Records ─────────────────────────────────────────────────────────
export type DonationStatus = "pending" | "confirmed" | "cancelled";

export interface DonationRecord {
  id: string;
  user_id: string | null;
  campaign_id: string | null;
  kind: DonationKind;
  amount_native: number;
  currency: CurrencyCode;
  amount_xaf: number;
  payment_mode: string | null;
  reference: string | null;
  status: DonationStatus;
  donor_name: string | null;
  donor_email: string | null;
  is_anonymous: boolean;
  notes: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

/** Conversion approximative vers XAF (cohérent avec CURRENCIES fromXAF). */
export function toXAF(amount: number, currency: CurrencyCode): number {
  const c = getCurrency(currency);
  if (currency === "XAF") return Math.round(amount);
  // amount (native) ÷ taux fromXAF = montant en XAF (puisque fromXAF = 1/taux XAF→native)
  return Math.round(amount / c.fromXAF);
}


// ─── Utilisations des dons ───────────────────────────────────────────
export const DONATION_USES = [
  { emoji: "🎙️", label: "Production de prédications et enseignements" },
  { emoji: "📺", label: "Studio livestream & équipement Jesus Daily TV" },
  { emoji: "🎓", label: "Formation et bourses Institut Berakah" },
  { emoji: "🏗️", label: "Construction et entretien du lieu de culte" },
  { emoji: "🌍", label: "Missions et évangélisation" },
  { emoji: "🤲", label: "Actions sociales et aide aux familles" },
  { emoji: "👨‍👩‍👧", label: "Soutien aux jeunes et enfants" },
  { emoji: "🙏", label: "Ministère de prière & intercession" },
] as const;
