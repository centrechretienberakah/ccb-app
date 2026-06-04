// Charte visuelle dédiée au module Ma Bible (Phase 1)
// Beige doux, violet royal, or subtil. Cinzel pour les titres, Montserrat pour le texte.

export const BIBLE_THEME = {
  // Palette claire
  bg:          "#F5F1E8",
  card:        "#FAF8F4",
  surface2:    "#EFEAE0",
  border:      "#E5DECC",
  borderSoft:  "#EFE9DA",
  text:        "#1F1A33",
  textSoft:    "#4A4257",
  textMuted:   "#857C95",
  violet:      "#5A2CA0",
  violetDark:  "#3E1C70",
  violetSoft:  "rgba(90,44,160,0.08)",
  gold:        "#D4AF37",
  goldDark:    "#A8862B",

  // Couleurs de surlignage
  hlYellow: "#FFE680",
  hlGreen:  "#B6E2B2",
  hlBlue:   "#BFD9F7",
  hlPink:   "#F7C6D5",
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
