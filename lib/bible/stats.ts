// Stats et badges Bible — calculs dérivés de bible_chapter_progress
// + user_saved_verses + bible_highlights

export interface ChapterReadRow {
  book_name: string;
  chapter: number;
  read_at: string;
}

export interface BibleStats {
  chaptersRead: number;
  versesSaved: number;
  highlightsCount: number;
  currentStreak: number;
  longestStreak: number;
  readDaysSet: Set<string>;     // YYYY-MM-DD
  uniqueBooksRead: number;
  monthlyCounts: Record<string, number>; // YYYY-MM → count
}

export function computeStats(args: {
  chapters: ChapterReadRow[];
  versesSaved: number;
  highlightsCount: number;
}): BibleStats {
  const { chapters, versesSaved, highlightsCount } = args;
  const readDaysSet = new Set<string>();
  const monthlyCounts: Record<string, number> = {};
  const books = new Set<string>();

  for (const c of chapters) {
    const day = c.read_at.split("T")[0]; // YYYY-MM-DD
    readDaysSet.add(day);
    const ym = day.slice(0, 7);
    monthlyCounts[ym] = (monthlyCounts[ym] ?? 0) + 1;
    books.add(c.book_name);
  }

  // Streak
  const today = new Date();
  const yToday = today.toISOString().split("T")[0];
  let currentStreak = 0;
  const cursor = new Date(today);
  // Si pas lu aujourd'hui, on commence à hier
  if (!readDaysSet.has(yToday)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toISOString().split("T")[0];
    if (readDaysSet.has(key)) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  // Longest streak
  let longestStreak = 0;
  const sortedDays = Array.from(readDaysSet).sort();
  let run = 0;
  let prev: Date | null = null;
  for (const d of sortedDays) {
    const date = new Date(d);
    if (prev) {
      const diff = (date.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) run += 1;
      else run = 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = date;
  }

  return {
    chaptersRead: chapters.length,
    versesSaved,
    highlightsCount,
    currentStreak,
    longestStreak,
    readDaysSet,
    uniqueBooksRead: books.size,
    monthlyCounts,
  };
}

// ─── Badges ───────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number; // 0..1
}

export function computeBadges(s: BibleStats): Badge[] {
  return [
    {
      id: "first-step", emoji: "🌱", title: "Premier pas",
      description: "Lire ton premier chapitre",
      unlocked: s.chaptersRead >= 1,
      progress: Math.min(s.chaptersRead / 1, 1),
    },
    {
      id: "streak-7", emoji: "🔥", title: "7 jours consécutifs",
      description: "Lire chaque jour pendant 7 jours d'affilée",
      unlocked: s.longestStreak >= 7,
      progress: Math.min(s.longestStreak / 7, 1),
    },
    {
      id: "streak-30", emoji: "💎", title: "30 jours consécutifs",
      description: "Lire chaque jour pendant 30 jours d'affilée",
      unlocked: s.longestStreak >= 30,
      progress: Math.min(s.longestStreak / 30, 1),
    },
    {
      id: "chapters-50", emoji: "📚", title: "Lecteur engagé",
      description: "Lire 50 chapitres",
      unlocked: s.chaptersRead >= 50,
      progress: Math.min(s.chaptersRead / 50, 1),
    },
    {
      id: "books-10", emoji: "🗂️", title: "Explorateur",
      description: "Découvrir 10 livres différents",
      unlocked: s.uniqueBooksRead >= 10,
      progress: Math.min(s.uniqueBooksRead / 10, 1),
    },
    {
      id: "verses-25", emoji: "⭐", title: "Collectionneur",
      description: "Sauvegarder 25 versets favoris",
      unlocked: s.versesSaved >= 25,
      progress: Math.min(s.versesSaved / 25, 1),
    },
  ];
}

// Petit message d'encouragement contextuel
export function getEncouragement(s: BibleStats): string {
  if (s.chaptersRead === 0) return "Commence ton voyage biblique aujourd'hui — un seul chapitre.";
  if (s.currentStreak >= 7) return `🔥 ${s.currentStreak} jours de suite ! Continue, Dieu honore ta fidélité.`;
  if (s.currentStreak >= 3) return `Magnifique, ${s.currentStreak} jours consécutifs. La constance bâtit le caractère.`;
  if (s.currentStreak === 0 && s.chaptersRead > 0) return "Reprends aujourd'hui ! Un seul chapitre suffit pour relancer ta lancée.";
  return "Chaque chapitre lu te rapproche du cœur du Père.";
}
