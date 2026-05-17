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
