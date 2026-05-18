// Charte visuelle module Groupes — Apple-like + violet/or CCB
export const GROUPS_THEME = {
  bg:           "#F5F1E8",
  card:         "#FAF8F4",
  surface2:     "#EFEAE0",
  border:       "#E5DECC",
  borderSoft:   "#EFE9DA",
  text:         "#111111",
  textSoft:     "#3A3340",
  textMuted:    "#857C95",
  violet:       "#5A2CA0",
  violetDark:   "#3E1C70",
  violetSoft:   "rgba(90,44,160,0.08)",
  gold:         "#D4AF37",
  goldDark:     "#A8862B",
  shadowSoft:   "0 2px 12px rgba(90,44,160,0.06)",
  shadowMd:     "0 6px 24px rgba(90,44,160,0.10)",
  shadowGlow:   "0 0 40px rgba(90,44,160,0.18)",
} as const;

export const GROUPS_FONTS = {
  title: "var(--font-cinzel), Georgia, serif",
  body:  "var(--font-montserrat), system-ui, sans-serif",
} as const;

export interface GroupCategoryDef {
  id: string;
  label: string;
  emoji: string;
}

export const GROUP_CATEGORIES: GroupCategoryDef[] = [
  { id: "cellule",       label: "Cellule",            emoji: "🏠" },
  { id: "ministere",     label: "Ministère",          emoji: "⛪" },
  { id: "leadership",    label: "Leadership",         emoji: "👑" },
  { id: "intercession",  label: "Intercession",       emoji: "🙏" },
  { id: "jeunesse",      label: "Jeunesse",           emoji: "🎓" },
  { id: "couple-famille",label: "Couple & Famille",   emoji: "👨‍👩‍👧" },
  { id: "evangelisation",label: "Évangélisation",     emoji: "📣" },
  { id: "etude-biblique",label: "Étude biblique",     emoji: "📖" },
  { id: "general",       label: "Général",            emoji: "💬" },
];

export function getGroupCategoryDef(id: string | null | undefined): GroupCategoryDef {
  return GROUP_CATEGORIES.find((c) => c.id === id) ?? GROUP_CATEGORIES[GROUP_CATEGORIES.length - 1];
}

// Helper notif staff
export async function notifyGroupsStaff(title: string, body: string, url = "/community/groups"): Promise<void> {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, audience: "admins" }),
    });
  } catch { /* noop */ }
}
