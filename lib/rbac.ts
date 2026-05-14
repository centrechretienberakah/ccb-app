// Centralisation du RBAC. Toute vérification de rôle / permission passe par
// ce module, jamais d'égalité de chaîne en dur ailleurs dans l'app.

export type Role =
  | "owner"
  | "admin"
  | "moderator"
  | "leader"          // legacy — équivalent à 'moderator'
  | "member"
  | "premium_member";

const RANK: Record<Role, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  leader: 60,         // alias historique
  premium_member: 30,
  member: 10,
};

export function rankOf(role: string | null | undefined): number {
  if (!role) return RANK.member;
  return RANK[role as Role] ?? RANK.member;
}

export function isAtLeast(role: string | null | undefined, min: Role): boolean {
  return rankOf(role) >= rankOf(min);
}

export const isOwner    = (r: string | null | undefined) => r === "owner";
export const isAdmin    = (r: string | null | undefined) => isAtLeast(r, "admin");
export const isModerator = (r: string | null | undefined) => isAtLeast(r, "moderator");
export const isMember   = (r: string | null | undefined) => isAtLeast(r, "member");

// ── Permissions de haut niveau ───────────────────────────────────────────────
// Chaque action de la plateforme se mappe ici.

export type Permission =
  | "admin.access"                  // peut voir /admin
  | "admin.view_audit_log"          // peut voir les logs admin
  // Membres
  | "user.change_role"              // changer le rôle d'un membre (jusqu'à admin)
  | "user.change_role_owner"        // promouvoir/rétrograder vers/depuis owner
  | "user.disable"                  // désactiver / réactiver
  | "user.delete"                   // suppression définitive
  | "user.invite"                   // envoyer une invitation
  // Contenu
  | "content.create"                // créer du contenu (devotions, sermons…)
  | "content.update"                // modifier
  | "content.delete"                // supprimer
  | "content.publish"               // publier / dé-publier
  | "post.moderate"                 // épingler / supprimer publications communauté
  | "prayer.moderate"               // gérer les prières
  // Plateforme
  | "settings.edit"                 // édition site_content (À propos, Dons, etc.)
  | "premium.manage"                // accorder/retirer Premium
  | "owner_emails.edit"             // gérer la liste OWNER_EMAILS
  ;

const POLICY: Record<Permission, (role: string | null | undefined) => boolean> = {
  "admin.access":          (r) => isModerator(r),
  "admin.view_audit_log":  (r) => isAdmin(r),

  "user.change_role":        (r) => isAdmin(r),
  "user.change_role_owner":  (r) => isOwner(r),
  "user.disable":            (r) => isAdmin(r),
  "user.delete":             (r) => isOwner(r),
  "user.invite":             (r) => isAdmin(r),

  "content.create":  (r) => isModerator(r),
  "content.update":  (r) => isModerator(r),
  "content.delete":  (r) => isAdmin(r),
  "content.publish": (r) => isModerator(r),
  "post.moderate":   (r) => isModerator(r),
  "prayer.moderate": (r) => isModerator(r),

  "settings.edit":      (r) => isAdmin(r),
  "premium.manage":     (r) => isAdmin(r),
  "owner_emails.edit":  (r) => isOwner(r),
};

export function can(role: string | null | undefined, action: Permission): boolean {
  const check = POLICY[action];
  return check ? check(role) : false;
}

// ── Labels FR pour l'UI ─────────────────────────────────────────────────────
export const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  moderator: "Modérateur",
  leader: "Modérateur",          // alias
  premium_member: "Membre Premium",
  member: "Membre",
};

export const ROLE_BADGE: Record<Role, { bg: string; color: string }> = {
  owner:          { bg: "rgba(212,175,55,0.20)",  color: "#d4af37" },
  admin:          { bg: "rgba(212,175,55,0.12)",  color: "#d4af37" },
  moderator:      { bg: "rgba(124,58,237,0.15)",  color: "#a78bfa" },
  leader:         { bg: "rgba(124,58,237,0.15)",  color: "#a78bfa" },
  premium_member: { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  member:         { bg: "rgba(255,255,255,0.06)", color: "#94a3b8" },
};
