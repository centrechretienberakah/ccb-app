import { OT_BOOKS, NT_BOOKS, ALL_BOOKS, BibleBook } from "./books";

export interface ChapterRef {
  book: string;
  chapter: number;
}

export interface DayReading {
  day: number;
  refs: ChapterRef[];
}

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  totalDays: number;
  badge: string;
  color: string;
  testament: "ot" | "nt" | "both";
  category: "systematic" | "thematic";
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "hybrid-1year",
    name: "Bible complète en 1 an",
    description: "AT + NT entremêlés chaque jour. ~3-4 chapitres/jour pour lire toute la Bible en 365 jours.",
    totalDays: 365,
    badge: "⭐ Populaire",
    color: "#d4af37",
    testament: "both",
    category: "systematic",
  },
  {
    id: "hybrid-2year",
    name: "Bible complète en 2 ans",
    description: "Rythme doux — AT + NT entremêlés. ~1-2 chapitres/jour, idéal pour les débutants.",
    totalDays: 730,
    badge: "🕊 Doux",
    color: "#7c3aed",
    testament: "both",
    category: "systematic",
  },
  {
    id: "nt-4months",
    name: "Nouveau Testament en 4 mois",
    description: "Focus sur les Évangiles, Actes et les Épîtres. ~2 chapitres/jour sur 120 jours.",
    totalDays: 120,
    badge: "✦ Intensif",
    color: "#3b82f6",
    testament: "nt",
    category: "systematic",
  },
  {
    id: "ot-6months",
    name: "Ancien Testament en 6 mois",
    description: "Genèse à Malachie en 180 jours. ~5 chapitres/jour pour une immersion profonde dans l'AT.",
    totalDays: 180,
    badge: "📜 AT complet",
    color: "#b45309",
    testament: "ot",
    category: "systematic",
  },
  {
    id: "ot-1year",
    name: "Ancien Testament en 1 an",
    description: "Parcours approfondi de l'AT — Genèse à Malachie en 365 jours. ~2-3 chapitres/jour.",
    totalDays: 365,
    badge: "📖 AT",
    color: "#059669",
    testament: "ot",
    category: "systematic",
  },
  {
    id: "nt-1year",
    name: "Nouveau Testament en 1 an",
    description: "Lecture lente et méditative du NT complet en 365 jours. ~1 chapitre tous les 2 jours.",
    totalDays: 365,
    badge: "🕊 NT",
    color: "#0ea5e9",
    testament: "nt",
    category: "systematic",
  },
];

// Thematic plans
export const THEMATIC_PLANS: PlanDefinition[] = [
  {
    id: "thematic-faith",
    name: "La Foi — Plan thématique",
    description: "30 jours sur les passages clés sur la foi, la confiance et la marche avec Dieu.",
    totalDays: 30,
    badge: "✦ Thématique",
    color: "#d4af37",
    testament: "both",
    category: "thematic",
  },
  {
    id: "thematic-prayer",
    name: "La Prière — Plan thématique",
    description: "21 jours sur les grands passages de prière de la Bible.",
    totalDays: 21,
    badge: "🙏 Thématique",
    color: "#7c3aed",
    testament: "both",
    category: "thematic",
  },
  {
    id: "thematic-psalms",
    name: "Psaumes & Proverbes",
    description: "31 jours — 5 Psaumes + 1 chapitre de Proverbes par jour. Sagesse quotidienne.",
    totalDays: 31,
    badge: "🎵 Sagesse",
    color: "#059669",
    testament: "ot",
    category: "thematic",
  },
];

// Flatten books into list of chapter refs
function flattenBooks(books: BibleBook[]): ChapterRef[] {
  const refs: ChapterRef[] = [];
  for (const book of books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      refs.push({ book: book.fr, chapter: ch });
    }
  }
  return refs;
}

// Distribute chapters evenly across days
function distribute(chapters: ChapterRef[], totalDays: number): DayReading[] {
  const days: DayReading[] = [];
  const total = chapters.length;
  let idx = 0;

  for (let day = 1; day <= totalDays; day++) {
    const target = Math.round((day / totalDays) * total) - Math.round(((day - 1) / totalDays) * total);
    const refs: ChapterRef[] = [];
    for (let i = 0; i < target && idx < chapters.length; i++) {
      refs.push(chapters[idx++]);
    }
    if (refs.length > 0) days.push({ day, refs });
  }

  return days;
}

// Hybrid: interleave OT and NT chapters
function generateHybrid(totalDays: number): DayReading[] {
  const otChapters = flattenBooks(OT_BOOKS);
  const ntChapters = flattenBooks(NT_BOOKS);

  const otPerDay = otChapters.length / totalDays;
  const ntPerDay = ntChapters.length / totalDays;

  let otIdx = 0, ntIdx = 0;
  const days: DayReading[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const refs: ChapterRef[] = [];

    const targetOT = Math.round(day * otPerDay) - Math.round((day - 1) * otPerDay);
    for (let i = 0; i < targetOT && otIdx < otChapters.length; i++) {
      refs.push(otChapters[otIdx++]);
    }

    const targetNT = Math.round(day * ntPerDay) - Math.round((day - 1) * ntPerDay);
    for (let i = 0; i < targetNT && ntIdx < ntChapters.length; i++) {
      refs.push(ntChapters[ntIdx++]);
    }

    if (refs.length > 0) days.push({ day, refs });
  }

  return days;
}

// Thematic readings
const THEMATIC_READINGS: Record<string, ChapterRef[][]> = {
  "thematic-faith": [
    [{ book: "Hébreux", chapter: 11 }],
    [{ book: "Romains", chapter: 4 }],
    [{ book: "Genèse", chapter: 15 }],
    [{ book: "Genèse", chapter: 22 }],
    [{ book: "Jean", chapter: 11 }],
    [{ book: "Matthieu", chapter: 14 }],
    [{ book: "Marc", chapter: 5 }],
    [{ book: "Luc", chapter: 17 }],
    [{ book: "Romains", chapter: 10 }],
    [{ book: "Galates", chapter: 3 }],
    [{ book: "Éphésiens", chapter: 2 }],
    [{ book: "Jacques", chapter: 2 }],
    [{ book: "1 Pierre", chapter: 1 }],
    [{ book: "2 Corinthiens", chapter: 5 }],
    [{ book: "Psaumes", chapter: 23 }],
    [{ book: "Psaumes", chapter: 91 }],
    [{ book: "Psaumes", chapter: 46 }],
    [{ book: "Proverbes", chapter: 3 }],
    [{ book: "Matthieu", chapter: 6 }],
    [{ book: "Matthieu", chapter: 17 }],
    [{ book: "Luc", chapter: 18 }],
    [{ book: "Jean", chapter: 14 }],
    [{ book: "Jean", chapter: 20 }],
    [{ book: "Actes", chapter: 3 }],
    [{ book: "Romains", chapter: 8 }],
    [{ book: "1 Corinthiens", chapter: 13 }],
    [{ book: "Philippiens", chapter: 4 }],
    [{ book: "1 Jean", chapter: 5 }],
    [{ book: "Apocalypse", chapter: 2 }],
    [{ book: "Hébreux", chapter: 12 }],
  ],
  "thematic-prayer": [
    [{ book: "Matthieu", chapter: 6 }],
    [{ book: "Luc", chapter: 11 }],
    [{ book: "Jean", chapter: 17 }],
    [{ book: "Actes", chapter: 2 }],
    [{ book: "Actes", chapter: 4 }],
    [{ book: "Romains", chapter: 8 }],
    [{ book: "Éphésiens", chapter: 6 }],
    [{ book: "Philippiens", chapter: 4 }],
    [{ book: "Colossiens", chapter: 4 }],
    [{ book: "1 Thessaloniciens", chapter: 5 }],
    [{ book: "Jacques", chapter: 5 }],
    [{ book: "1 Jean", chapter: 5 }],
    [{ book: "Psaumes", chapter: 5 }],
    [{ book: "Psaumes", chapter: 17 }],
    [{ book: "Psaumes", chapter: 51 }],
    [{ book: "Psaumes", chapter: 86 }],
    [{ book: "Psaumes", chapter: 102 }],
    [{ book: "Psaumes", chapter: 139 }],
    [{ book: "Daniel", chapter: 9 }],
    [{ book: "Néhémie", chapter: 1 }],
    [{ book: "1 Rois", chapter: 8 }],
  ],
  "thematic-psalms": Array.from({ length: 31 }, (_, i) => {
    const ps1 = i * 5 + 1;
    return [
      { book: "Psaumes", chapter: Math.min(ps1, 150) },
      { book: "Psaumes", chapter: Math.min(ps1 + 1, 150) },
      { book: "Psaumes", chapter: Math.min(ps1 + 2, 150) },
      { book: "Psaumes", chapter: Math.min(ps1 + 3, 150) },
      { book: "Psaumes", chapter: Math.min(ps1 + 4, 150) },
      { book: "Proverbes", chapter: i + 1 },
    ];
  }),
};

// Main generator
export function generatePlan(planId: string): DayReading[] {
  switch (planId) {
    case "hybrid-1year": return generateHybrid(365);
    case "hybrid-2year": return generateHybrid(730);
    case "nt-4months": return distribute(flattenBooks(NT_BOOKS), 120);
    case "ot-6months": return distribute(flattenBooks(OT_BOOKS), 180);
    case "ot-1year": return distribute(flattenBooks(OT_BOOKS), 365);
    case "nt-1year": return distribute(flattenBooks(NT_BOOKS), 365);
    case "thematic-faith":
    case "thematic-prayer":
    case "thematic-psalms": {
      const readings = THEMATIC_READINGS[planId] || [];
      return readings.map((refs, i) => ({ day: i + 1, refs }));
    }
    default: return generateHybrid(365);
  }
}

// Get today's day number given start date
export function getCurrentDay(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// Get a specific day's reading
export function getDayReading(planId: string, day: number): DayReading | null {
  const plan = generatePlan(planId);
  return plan.find(d => d.day === day) || null;
}

// Get all plan defs combined
export const ALL_PLANS = [...PLAN_DEFINITIONS, ...THEMATIC_PLANS];
