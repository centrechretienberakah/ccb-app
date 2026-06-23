// Gamification Communauté — rangs, badges, XP
// Le XP est calculé à la volée à partir des compteurs (pas de stockage dénormalisé).
// Pas de trigger DB, pas de migration nécessaire.

export interface Rank {
  id: string;
  label: string;
  emoji: string;
  minXp: number;
  color: string;
}

export const RANKS: Rank[] = [
  { id: "debutant",    label: "Disciple Débutant",     emoji: "🌱", minXp: 0,    color: "#857C95" },
  { id: "serviteur",   label: "Serviteur",             emoji: "✋", minXp: 100,  color: "#D4AF37" },
  { id: "leader",      label: "Leader",                emoji: "👑", minXp: 500,  color: "#D4AF37" },
  { id: "mentor",      label: "Mentor",                emoji: "📿", minXp: 1500, color: "#D4AF37" },
  { id: "ambassadeur", label: "Ambassadeur Berakah",   emoji: "✨", minXp: 5000, color: "#A8862B" },
];

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  emoji: string;
  unlocked: (s: MemberStats) => boolean;
}

export interface MemberStats {
  posts: number;
  comments: number;
  likesReceived: number;
  testimonies: number;       // posts avec post_kind = 'testimony'
  prayersPosted: number;     // posts avec post_kind = 'prayer'
  daysActive: number;        // optionnel (futur)
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-step", emoji: "🌱", label: "Premier pas",
    description: "Publier ton premier post",
    unlocked: (s) => s.posts >= 1,
  },
  {
    id: "engaging", emoji: "💬", label: "Engageant",
    description: "Écrire 10 commentaires",
    unlocked: (s) => s.comments >= 10,
  },
  {
    id: "inspiring", emoji: "❤️", label: "Inspirant",
    description: "Recevoir 50 likes au total",
    unlocked: (s) => s.likesReceived >= 50,
  },
  {
    id: "witness", emoji: "✨", label: "Témoin",
    description: "Publier 5 témoignages",
    unlocked: (s) => s.testimonies >= 5,
  },
  {
    id: "intercessor", emoji: "🙏", label: "Intercesseur",
    description: "Publier 5 demandes de prière",
    unlocked: (s) => s.prayersPosted >= 5,
  },
  {
    id: "pillar", emoji: "🏛️", label: "Pilier",
    description: "Atteindre le rang Mentor (1500 XP)",
    unlocked: (s) => computeXp(s) >= 1500,
  },
];

// Formule XP : posts × 5 + commentaires × 1 + likes reçus × 2 + témoignages × 5 + prières × 3
export function computeXp(s: MemberStats): number {
  return s.posts * 5
       + s.comments * 1
       + s.likesReceived * 2
       + s.testimonies * 5
       + s.prayersPosted * 3;
}

export function getRank(xp: number): Rank {
  // Retourne le rang le plus élevé atteint
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r;
    else break;
  }
  return current;
}

export function getNextRank(xp: number): Rank | null {
  for (const r of RANKS) {
    if (xp < r.minXp) return r;
  }
  return null;
}

export function progressToNextRank(xp: number): { current: Rank; next: Rank | null; pct: number; toGo: number } {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current, next: null, pct: 1, toGo: 0 };
  const span = next.minXp - current.minXp;
  const inSpan = xp - current.minXp;
  return {
    current, next,
    pct: Math.min(Math.max(inSpan / span, 0), 1),
    toGo: Math.max(next.minXp - xp, 0),
  };
}

export function computeBadges(s: MemberStats) {
  return BADGES.map((b) => ({ ...b, achieved: b.unlocked(s) }));
}
