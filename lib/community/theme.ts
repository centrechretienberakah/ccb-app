// Charte visuelle Communauté CCB — Skool style, premium chrétien
// Violet royal + or + lavande sur fond ivoire/blanc.

export const COMMUNITY_THEME = {
  // Palette
  violet:       "#5B21B6",
  violetDark:   "#4C1D95",
  violetSoft:   "rgba(91, 33, 182,0.08)",
  gold:         "#D4AF37",
  goldDark:     "#A8862B",
  white:        "#FFFFFF",
  ivory:        "#F8F5F1",
  lavender:     "#EDE7FA",
  black:        "#111111",

  // UI tokens dérivés
  bg:           "#F8F5F1",       // ivoire (fond page)
  card:         "#FFFFFF",
  surface2:     "#F2EDE5",
  border:       "#E5DECC",
  borderSoft:   "#EFE9DA",
  text:         "#111111",
  textSoft:     "#3A3340",
  textMuted:    "#857C95",

  // Shadows
  shadowSoft:   "0 2px 12px rgba(91, 33, 182,0.06)",
  shadowMd:     "0 6px 24px rgba(91, 33, 182,0.10)",
  shadowGlow:   "0 0 40px rgba(91, 33, 182,0.18)",
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
  { id: "discussion",    emoji: "💬", label: "Discussion",   description: "Échange libre",                       color: "#5B21B6" },
  { id: "testimony",     emoji: "✨", label: "Témoignage",   description: "Partage ce que Dieu a fait pour toi", color: "#D4AF37" },
  { id: "prayer",        emoji: "🙏", label: "Prière",       description: "Demande de prière",                    color: "#5B21B6" },
  { id: "announcement",  emoji: "📣", label: "Annonce",      description: "Information importante",               color: "#D4AF37" },
  { id: "teaching",      emoji: "📖", label: "Enseignement", description: "Partage d'enseignement biblique",      color: "#5B21B6" },
  { id: "question",      emoji: "❓", label: "Question",     description: "Question / Q&R",                       color: "#5B21B6" },
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
