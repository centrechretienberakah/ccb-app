// Charte visuelle module Groupes — sombre immersif + violet/or CCB
export const GROUPS_THEME = {
  bg:           "var(--page-bg)",
  card:         "var(--card-bg)",
  surface2:     "var(--surface-2)",
  border:       "var(--border)",
  borderSoft:   "var(--border-subtle)",
  text:         "var(--text-primary)",
  textSoft:     "var(--text-secondary)",
  textMuted:    "var(--text-muted)",
  violet:       "#7C3AED",
  violetDark:   "#5A2CA0",
  violetSoft:   "rgba(124,58,237,0.16)",
  gold:         "var(--gold)",
  goldDark:     "var(--gold-dark)",
  shadowSoft:   "var(--shadow-sm)",
  shadowMd:     "var(--shadow-md)",
  shadowGlow:   "var(--shadow-lg)",
} as const;

export const GROUPS_FONTS = {
  title: "var(--font-cinzel), 'Segoe UI', system-ui, sans-serif",
  body:  "var(--font-montserrat), system-ui, sans-serif",
} as const;

export interface GroupCategoryDef {
  id: string;
  label: string;
  emoji: string;
}

export const GROUP_CATEGORIES: GroupCategoryDef[] = [
  // Brief CCB 2026
  { id: "leadership",     label: "Leadership",         emoji: "👑" },
  { id: "intercession",   label: "Intercession",       emoji: "🙏" },
  { id: "media",          label: "Médias",             emoji: "📸" },
  { id: "louange",        label: "Louange",            emoji: "🎵" },
  { id: "formation",      label: "Formation",          emoji: "🎓" },
  { id: "mentorat",       label: "Mentorat",           emoji: "🤝" },
  { id: "jeunesse",       label: "Jeunesse",           emoji: "🌟" },
  { id: "bootcamp",       label: "Bootcamp",           emoji: "🏕️" },
  { id: "equipe-tech",    label: "Équipe Technique",   emoji: "🛠️" },
  // Catégories historiques conservées
  { id: "cellule",        label: "Cellule",            emoji: "🏠" },
  { id: "ministere",      label: "Ministère",          emoji: "⛪" },
  { id: "couple-famille", label: "Couple & Famille",   emoji: "👨‍👩‍👧" },
  { id: "evangelisation", label: "Évangélisation",     emoji: "📣" },
  { id: "etude-biblique", label: "Étude biblique",     emoji: "📖" },
  { id: "general",        label: "Général",            emoji: "💬" },
];

export function getGroupCategoryDef(id: string | null | undefined): GroupCategoryDef {
  return GROUP_CATEGORIES.find((c) => c.id === id) ?? GROUP_CATEGORIES[GROUP_CATEGORIES.length - 1];
}

/** Indique si le user peut créer un groupe (matche RLS groups_insert_auth). */
export function canCreateGroup(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "leader" || role === "moderator";
}

/** Format relatif court pour la liste type WhatsApp ("12:34", "Hier", "lun.", "12/03") */
export function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  const sevenDays = 7 * 24 * 3600 * 1000;
  if (now.getTime() - d.getTime() < sevenDays) {
    return d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
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
