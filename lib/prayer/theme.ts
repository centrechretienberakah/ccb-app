// Charte visuelle module Prière — apaisé, sacré, doux
// Or doux + violet liturgique + bleu paisible sur fond crème

export const PRAYER_THEME = {
  // Palette principale — sombre immersif (flyer « Semblable à Christ »)
  bg:           "#0a0a0a",       // noir immersif
  card:         "#140f1f",
  surface2:     "#1b1530",
  border:       "rgba(212,175,55,0.16)",
  borderSoft:   "rgba(255,255,255,0.07)",
  text:         "#f5f1e8",
  textSoft:     "#cbc4d6",
  textMuted:    "#8a8296",

  // Couleurs symboliques
  violet:       "#7C3AED",
  violetDark:   "#5A2CA0",
  violetSoft:   "rgba(124,58,237,0.16)",
  gold:         "#D4AF37",
  goldDark:     "#A8862B",
  blue:         "#60a5fa",       // bleu paisible (lumineux sur sombre)
  blueSoft:     "rgba(96,165,250,0.14)",

  // Status colors
  answered:     "#34d058",       // vert exaucé (lumineux sur sombre)
  pending:      "#8a8296",

  // Shadows
  shadowSoft:   "0 2px 12px rgba(0,0,0,0.40)",
  shadowMd:     "0 8px 28px rgba(0,0,0,0.50)",
  shadowGlow:   "0 0 40px rgba(212,175,55,0.15)",
} as const;

export const PRAYER_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
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
  { id: "famille",     label: "Famille",              emoji: "👨‍👩‍👧", color: "#5B21B6", description: "Couple, enfants, parents" },
  { id: "salut",       label: "Salut",                emoji: "✝️",   color: "#D4AF37", description: "Conversion d'un proche" },
  { id: "travail",     label: "Travail",              emoji: "💼",   color: "#3A6FB5", description: "Emploi, carrière, projets" },
  { id: "delivrance",  label: "Délivrance",           emoji: "🔥",   color: "#5B21B6", description: "Combat spirituel, oppression" },
  { id: "spirituel",   label: "Croissance spirituelle", emoji: "📖", color: "#5B21B6", description: "Foi, marche chrétienne" },
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

// ─── Helper notif à l'auteur d'une prière ────────────────────────
// Envoie : push notification (via push_subscriptions) + entrée in-app
// (table user_notifications). Skip si actor == author (pas d'auto-notif).
import { createClient } from "@/lib/supabase/client";

export async function notifyPrayerAuthor(args: {
  authorId: string;
  actorId: string;
  actorName: string;
  prayerId: string;
  type: "intercession" | "comment" | "comment_reply";
  excerpt?: string;
}): Promise<void> {
  if (args.authorId === args.actorId) return; // skip auto-notif

  const supabase = createClient();
  const typeMap = {
    intercession:    { dbType: "system",            title: "🙏 Quelqu'un intercède pour toi" },
    comment:         { dbType: "reply_to_comment",  title: "💬 Nouvel encouragement sur ta prière" },
    comment_reply:   { dbType: "reply_to_comment",  title: "💬 Quelqu'un t'a répondu" },
  };
  const def = typeMap[args.type];
  const body = args.excerpt
    ? `${args.actorName} : « ${args.excerpt.slice(0, 100)} »`
    : `${args.actorName} ${args.type === "intercession" ? "prie pour toi" : "a commenté"}`;

  // In-app notification (table user_notifications)
  try {
    await supabase.from("user_notifications").insert({
      user_id: args.authorId,
      actor_id: args.actorId,
      type: def.dbType,
      source_type: args.type === "intercession" ? "generic" : "comment",
      source_id: args.prayerId,
      payload: { actor_name: args.actorName, excerpt: args.excerpt ?? "", prayer_id: args.prayerId },
    });
  } catch { /* table v13 may not exist yet */ }

  // Push notification (target user)
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: def.title,
        body,
        url: "/prayer",
        audience: "user_ids",
        userIds: [args.authorId],
      }),
    });
  } catch { /* noop */ }
}
