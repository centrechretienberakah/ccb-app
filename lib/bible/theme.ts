// Charte visuelle dédiée au module Ma Bible (Phase 1)
// Beige doux, violet royal, or subtil. Cinzel pour les titres, Montserrat pour le texte.

export const BIBLE_THEME = {
  // Theme-réactif (prototype clair/sombre) : les tokens structurels suivent
  // les variables CSS globales (clair OU sombre). Le violet reste littéral
  // (lisible sur les deux fonds) ; l'or suit --gold (assombri en mode clair).
  bg:          "var(--page-bg)",
  card:        "var(--card-bg)",
  surface2:    "var(--surface-2)",
  border:      "var(--border)",
  borderSoft:  "var(--border-subtle)",
  text:        "var(--text-primary)",
  textSoft:    "var(--text-secondary)",
  textMuted:   "var(--text-muted)",
  violet:      "#7C3AED",
  violetDark:  "#5A2CA0",
  violetSoft:  "rgba(124,58,237,0.16)",
  gold:        "var(--gold)",
  goldDark:    "var(--gold-dark)",

  // Couleurs de surlignage — teintes translucides lisibles sur les deux fonds
  hlYellow: "rgba(212,175,55,0.30)",
  hlGreen:  "rgba(52,208,88,0.26)",
  hlBlue:   "rgba(96,165,250,0.28)",
  hlPink:   "rgba(244,114,182,0.28)",
} as const;

export const BIBLE_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Promesse",  bg: BIBLE_THEME.hlYellow, ring: "#E0B400" },
  { id: "green",  label: "Vie",       bg: BIBLE_THEME.hlGreen,  ring: "#2E9B47" },
  { id: "blue",   label: "Sagesse",   bg: BIBLE_THEME.hlBlue,   ring: "#2A6FBE" },
  { id: "pink",   label: "Amour",     bg: BIBLE_THEME.hlPink,   ring: "#C24B7A" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["id"];

export function highlightBg(color: HighlightColor | null | undefined): string | undefined {
  if (!color) return undefined;
  const c = HIGHLIGHT_COLORS.find((h) => h.id === color);
  return c?.bg;
}
