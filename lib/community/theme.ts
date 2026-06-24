// Charte visuelle Communauté CCB — premium chrétien, sombre immersif
// (flyer « Semblable à Christ ») : violet royal + or sur noir #0a0a0a.

export const COMMUNITY_THEME = {
  // Palette
  violet:       "#7C3AED",       // violet lumineux (lisible sur sombre)
  violetDark:   "#5A2CA0",
  violetSoft:   "rgba(124,58,237,0.16)",
  gold:         "var(--gold)",
  goldDark:     "var(--gold-dark)",
  white:        "#FFFFFF",
  ivory:        "#F8F5F1",
  lavender:     "#EDE7FA",
  black:        "#111111",

  // UI tokens dérivés (sombre immersif)
  bg:           "var(--page-bg)",       // noir immersif (fond page)
  card:         "var(--card-bg)",
  surface2:     "var(--surface-2)",
  border:       "var(--border)",
  borderSoft:   "var(--border-subtle)",
  text:         "var(--text-primary)",
  textSoft:     "var(--text-secondary)",
  textMuted:    "var(--text-muted)",

  // Shadows
  shadowSoft:   "var(--shadow-sm)",
  shadowMd:     "var(--shadow-md)",
  shadowGlow:   "var(--shadow-lg)",
} as const;

export const COMMUNITY_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
  body:  "var(--font-montserrat), system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// Types de posts (thématique, distinct du media post_type)
export interface PostKindDef {
  id: PostKind;
  emoji: string;
  label: string;
  description: string;
  color: string;
}

export type PostKind =
  | "discussion"
  | "testimony"
  | "prayer"
  | "announcement"
  | "teaching"
  | "question"
  | "encouragement";

export const POST_KINDS: PostKindDef[] = [
  { id: "discussion",    emoji: "💬", label: "Discussion",   description: "Échange libre",                       color: "#D4AF37" },
  { id: "testimony",     emoji: "✨", label: "Témoignage",   description: "Partage ce que Dieu a fait pour toi", color: "#D4AF37" },
  { id: "prayer",        emoji: "🙏", label: "Prière",       description: "Demande de prière",                    color: "#D4AF37" },
  { id: "announcement",  emoji: "📣", label: "Annonce",      description: "Information importante",               color: "#D4AF37" },
  { id: "teaching",      emoji: "📖", label: "Enseignement", description: "Partage d'enseignement biblique",      color: "#D4AF37" },
  { id: "question",      emoji: "❓", label: "Question",     description: "Question / Q&R",                       color: "#D4AF37" },
  { id: "encouragement", emoji: "💝", label: "Encouragement",description: "Mots d'encouragement",                 color: "#D4AF37" },
];

export function getPostKindDef(id: string | null | undefined): PostKindDef {
  return POST_KINDS.find((k) => k.id === id) ?? POST_KINDS[0];
}

// Helper notif staff pour le module communauté
export async function notifyCommunityStaff(title: string, body: string, url = "/community"): Promise<void> {
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
