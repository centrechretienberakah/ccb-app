// Charte visuelle module Prière — apaisé, sacré, doux
// Or doux + violet liturgique + bleu paisible sur fond crème

export const PRAYER_THEME = {
  // Palette principale
  bg:           "#F8F5F1",       // crème
  card:         "#FFFFFF",
  surface2:     "#F2EDE5",
  border:       "#E5DECC",
  borderSoft:   "#EFE9DA",
  text:         "#1F1A33",
  textSoft:     "#3A3340",
  textMuted:    "#857C95",

  // Couleurs symboliques
  violet:       "#5A2CA0",
  violetDark:   "#3E1C70",
  violetSoft:   "rgba(90,44,160,0.08)",
  gold:         "#D4AF37",
  goldDark:     "#A8862B",
  blue:         "#3A6FB5",       // bleu paisible
  blueSoft:     "rgba(58,111,181,0.08)",

  // Status colors
  answered:     "#2E9B47",       // vert exaucé
  pending:      "#857C95",

  // Shadows
  shadowSoft:   "0 2px 12px rgba(90,44,160,0.06)",
  shadowMd:     "0 6px 24px rgba(90,44,160,0.10)",
  shadowGlow:   "0 0 40px rgba(212,175,55,0.15)",
} as const;

export const PRAYER_FONTS = {
  title: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// ─── Catégories de prière ─────────────────────────────────────────
export type PrayerCategory =
  | "sante" | "finances" | "famille" | "salut"
  | "travail" | "delivrance" | "spirituel" | "autre";

export interface PrayerCategoryDef {
  id: PrayerCategory;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const PRAYER_CATEGORIES: PrayerCategoryDef[] = [
  { id: "sante",       label: "Santé",                emoji: "❤️‍🩹", color: "#D4AF37", description: "Guérison physique ou mentale" },
  { id: "finances",    label: "Finances",             emoji: "💰",   color: "#2E9B47", description: "Provision, bénédiction financière" },
  { id: "famille",     label: "Famille",              emoji: "👨‍👩‍👧", color: "#5A2CA0", description: "Couple, enfants, parents" },
  { id: "salut",       label: "Salut",                emoji: "✝️",   color: "#D4AF37", description: "Conversion d'un proche" },
  { id: "travail",     label: "Travail",              emoji: "💼",   color: "#3A6FB5", description: "Emploi, carrière, projets" },
  { id: "delivrance",  label: "Délivrance",           emoji: "🔥",   color: "#5A2CA0", description: "Combat spirituel, oppression" },
  { id: "spirituel",   label: "Croissance spirituelle", emoji: "📖", color: "#5A2CA0", description: "Foi, marche chrétienne" },
  { id: "autre",       label: "Autre",                emoji: "🙏",   color: "#857C95", description: "Autre sujet de prière" },
];

export function getPrayerCategoryDef(id: string | null | undefined): PrayerCategoryDef {
  return PRAYER_CATEGORIES.find((c) => c.id === id) ?? PRAYER_CATEGORIES[PRAYER_CATEGORIES.length - 1];
}

// ─── Visibilité ──────────────────────────────────────────────────
export type PrayerVisibility = "private" | "members" | "public";

export const VISIBILITY_OPTIONS: Array<{ id: PrayerVisibility; label: string; emoji: string; desc: string }> = [
  { id: "private", label: "Privée",   emoji: "🔒", desc: "Toi + équipe pastorale" },
  { id: "members", label: "Membres",  emoji: "👥", desc: "Tous les membres connectés" },
  { id: "public",  label: "Publique", emoji: "🌍", desc: "Visible par tous" },
];

// ─── Helper notif staff ──────────────────────────────────────────
export async function notifyPrayerStaff(title: string, body: string, url = "/prayer"): Promise<void> {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, audience: "admins" }),
    });
  } catch {
    // noop
  }
}
