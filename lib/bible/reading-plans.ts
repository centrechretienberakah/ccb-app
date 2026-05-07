import { OT_BOOKS, NT_BOOKS, ALL_BOOKS } from "@/lib/bible/books";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReadingPlanType =
  | "BIBLE_1_YEAR" | "BIBLE_2_YEARS"
  | "NT_4_MONTHS" | "NT_1_YEAR"
  | "OT_6_MONTHS" | "OT_1_YEAR"
  | "THEMATIC";

export type SpiritualLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type SpiritualGoal =
  | "SALVATION" | "FAITH" | "PRAYER" | "LOVE"
  | "FORGIVENESS" | "DISCIPLINE" | "HOLINESS" | "WORSHIP";

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  duration: string;
  totalDays: number;
  type: ReadingPlanType;
  level: SpiritualLevel;
  goals: SpiritualGoal[];
  emoji: string;
}

export interface DayReading {
  day: number;
  title: string;
  passages: { book: string; chapter: number }[];
}

// ─── Plans disponibles ────────────────────────────────────────────────────────
export const READING_PLANS: ReadingPlan[] = [
  { id: "bible-1-year",    title: "Bible en 1 an",            description: "Lecture complète AT + NT sur 365 jours.",          duration: "1 an",    totalDays: 365, type: "BIBLE_1_YEAR",  level: "INTERMEDIATE", goals: ["DISCIPLINE", "FAITH"],      emoji: "📖" },
  { id: "bible-2-years",   title: "Bible en 2 ans",           description: "Lecture progressive et équilibrée de toute la Bible.", duration: "2 ans", totalDays: 730, type: "BIBLE_2_YEARS", level: "BEGINNER",     goals: ["DISCIPLINE"],               emoji: "📚" },
  { id: "nt-4-months",     title: "Nouveau Testament en 4 mois", description: "Découvrez Jésus et les apôtres en 120 jours.",   duration: "4 mois",  totalDays: 120, type: "NT_4_MONTHS",   level: "BEGINNER",     goals: ["SALVATION", "FAITH"],       emoji: "✝️" },
  { id: "nt-1-year",       title: "Nouveau Testament en 1 an",description: "Lecture quotidienne du NT sur 365 jours.",          duration: "1 an",    totalDays: 365, type: "NT_1_YEAR",     level: "BEGINNER",     goals: ["FAITH"],                    emoji: "🕊️" },
  { id: "ot-6-months",     title: "Ancien Testament en 6 mois", description: "Fondements bibliques et histoire du peuple de Dieu.", duration: "6 mois", totalDays: 180, type: "OT_6_MONTHS", level: "INTERMEDIATE", goals: ["DISCIPLINE", "HOLINESS"],   emoji: "📜" },
  { id: "ot-1-year",       title: "Ancien Testament en 1 an", description: "Étude approfondie de l'AT sur 365 jours.",          duration: "1 an",    totalDays: 365, type: "OT_1_YEAR",     level: "ADVANCED",     goals: ["HOLINESS"],                 emoji: "🏛️" },
  { id: "theme-salvation", title: "Le Salut",                  description: "30 jours pour comprendre le salut selon la Bible.",  duration: "30 jours",totalDays: 30,  type: "THEMATIC",      level: "BEGINNER",     goals: ["SALVATION"],                emoji: "🙏" },
  { id: "theme-faith",     title: "La Foi",                    description: "30 jours pour grandir dans la confiance en Dieu.",   duration: "30 jours",totalDays: 30,  type: "THEMATIC",      level: "BEGINNER",     goals: ["FAITH"],                    emoji: "⭐" },
  { id: "theme-prayer",    title: "La Prière",                 description: "30 jours pour développer une vie de prière.",        duration: "30 jours",totalDays: 30,  type: "THEMATIC",      level: "INTERMEDIATE", goals: ["PRAYER"],                   emoji: "🕯️" },
  { id: "theme-love",      title: "L'Amour",                  description: "30 jours pour découvrir l'amour de Dieu.",          duration: "30 jours",totalDays: 30,  type: "THEMATIC",      level: "BEGINNER",     goals: ["LOVE"],                     emoji: "❤️" },
  { id: "theme-forgiveness",title: "Le Pardon",                description: "30 jours pour apprendre le pardon biblique.",        duration: "30 jours",totalDays: 30,  type: "THEMATIC",      level: "INTERMEDIATE", goals: ["FORGIVENESS"],              emoji: "🕊️" },
];

// ─── Lectures thématiques (30 jours) ─────────────────────────────────────────
const THEMATIC_READINGS: Record<string, DayReading[]> = {
  "theme-salvation": [
    { day:1,  title:"Dieu nous aime",            passages:[{book:"Jean",chapter:3}] },
    { day:2,  title:"Nous sommes pécheurs",       passages:[{book:"Romains",chapter:3}] },
    { day:3,  title:"Jésus, notre Sauveur",       passages:[{book:"Jean",chapter:1}] },
    { day:4,  title:"La grâce de Dieu",           passages:[{book:"Éphésiens",chapter:2}] },
    { day:5,  title:"La repentance",              passages:[{book:"Luc",chapter:15}] },
    { day:6,  title:"La foi qui sauve",           passages:[{book:"Romains",chapter:10}] },
    { day:7,  title:"Né de nouveau",              passages:[{book:"Jean",chapter:3},{book:"1 Pierre",chapter:1}] },
    { day:8,  title:"La réconciliation",          passages:[{book:"2 Corinthiens",chapter:5}] },
    { day:9,  title:"Justifiés par la foi",       passages:[{book:"Romains",chapter:5}] },
    { day:10, title:"Le sacrifice de Christ",     passages:[{book:"Hébreux",chapter:9}] },
    { day:11, title:"Sauvés par grâce",           passages:[{book:"Éphésiens",chapter:2},{book:"Tite",chapter:3}] },
    { day:12, title:"La vie éternelle",           passages:[{book:"Jean",chapter:11}] },
    { day:13, title:"L'adoption divine",         passages:[{book:"Romains",chapter:8}] },
    { day:14, title:"La nouvelle naissance",      passages:[{book:"Jean",chapter:3},{book:"Colossiens",chapter:3}] },
    { day:15, title:"Le pardon des péchés",       passages:[{book:"1 Jean",chapter:1}] },
    { day:16, title:"Jésus, le chemin",           passages:[{book:"Jean",chapter:14}] },
    { day:17, title:"La paix avec Dieu",          passages:[{book:"Romains",chapter:5}] },
    { day:18, title:"Héritiers de Dieu",          passages:[{book:"Galates",chapter:4}] },
    { day:19, title:"Le témoignage du salut",     passages:[{book:"1 Jean",chapter:5}] },
    { day:20, title:"Appelés à la sainteté",      passages:[{book:"1 Pierre",chapter:1}] },
    { day:21, title:"Marchons dans la lumière",   passages:[{book:"1 Jean",chapter:1},{book:"1 Jean",chapter:2}] },
    { day:22, title:"L'Esprit qui témoigne",     passages:[{book:"Romains",chapter:8}] },
    { day:23, title:"Triompher par Christ",       passages:[{book:"Romains",chapter:8}] },
    { day:24, title:"La confession de foi",       passages:[{book:"Matthieu",chapter:16}] },
    { day:25, title:"Baptême et salut",           passages:[{book:"Actes",chapter:2}] },
    { day:26, title:"Persévérer dans la foi",     passages:[{book:"Hébreux",chapter:10}] },
    { day:27, title:"Assurance du salut",         passages:[{book:"Jean",chapter:10}] },
    { day:28, title:"Sauvés pour servir",         passages:[{book:"Éphésiens",chapter:2}] },
    { day:29, title:"La gloire future",           passages:[{book:"Romains",chapter:8}] },
    { day:30, title:"Merci pour le salut",        passages:[{book:"Psaumes",chapter:103}] },
  ],
  "theme-faith": [
    { day:1,  title:"Qu'est-ce que la foi ?",    passages:[{book:"Hébreux",chapter:11}] },
    { day:2,  title:"Abraham, père de la foi",    passages:[{book:"Genèse",chapter:12}] },
    { day:3,  title:"La foi d'Abraham",          passages:[{book:"Romains",chapter:4}] },
    { day:4,  title:"Foi sans œuvres est morte",  passages:[{book:"Jacques",chapter:2}] },
    { day:5,  title:"Marcher par la foi",         passages:[{book:"2 Corinthiens",chapter:5}] },
    { day:6,  title:"La moutarde de foi",         passages:[{book:"Matthieu",chapter:17}] },
    { day:7,  title:"Prier avec foi",             passages:[{book:"Marc",chapter:11}] },
    { day:8,  title:"Foi dans l'épreuve",        passages:[{book:"Job",chapter:1}] },
    { day:9,  title:"Le bouclier de la foi",      passages:[{book:"Éphésiens",chapter:6}] },
    { day:10, title:"Jésus, auteur de la foi",    passages:[{book:"Hébreux",chapter:12}] },
    { day:11, title:"La foi qui déplace les montagnes", passages:[{book:"Matthieu",chapter:21}] },
    { day:12, title:"Foi et guérison",            passages:[{book:"Luc",chapter:7}] },
    { day:13, title:"Vivre par la foi",           passages:[{book:"Galates",chapter:2},{book:"Galates",chapter:3}] },
    { day:14, title:"La certitude des espérances",passages:[{book:"Hébreux",chapter:11}] },
    { day:15, title:"La foi de Noé",              passages:[{book:"Genèse",chapter:6}] },
    { day:16, title:"Confesser sa foi",           passages:[{book:"Romains",chapter:10}] },
    { day:17, title:"La foi de Moïse",            passages:[{book:"Hébreux",chapter:11}] },
    { day:18, title:"La foi de David",            passages:[{book:"Psaumes",chapter:23}] },
    { day:19, title:"La foi qui triomphe",        passages:[{book:"1 Jean",chapter:5}] },
    { day:20, title:"Grandir dans la foi",        passages:[{book:"2 Pierre",chapter:1}] },
    { day:21, title:"La foi en action",           passages:[{book:"Jacques",chapter:1}] },
    { day:22, title:"Douter et croire",           passages:[{book:"Matthieu",chapter:14}] },
    { day:23, title:"La foi de Pierre",           passages:[{book:"Matthieu",chapter:16}] },
    { day:24, title:"Croire sans voir",           passages:[{book:"Jean",chapter:20}] },
    { day:25, title:"Les héros de la foi",        passages:[{book:"Hébreux",chapter:11}] },
    { day:26, title:"Dieu est fidèle",            passages:[{book:"Lamentations",chapter:3}] },
    { day:27, title:"La foi et la Parole",        passages:[{book:"Romains",chapter:10}] },
    { day:28, title:"Foi en ses promesses",       passages:[{book:"2 Corinthiens",chapter:1}] },
    { day:29, title:"La paix par la foi",         passages:[{book:"Philippiens",chapter:4}] },
    { day:30, title:"Demeurer dans la foi",       passages:[{book:"Colossiens",chapter:2}] },
  ],
  "theme-prayer": [
    { day:1,  title:"L'importance de prier",     passages:[{book:"Matthieu",chapter:6}] },
    { day:2,  title:"Le Notre Père",              passages:[{book:"Matthieu",chapter:6}] },
    { day:3,  title:"Priez sans cesse",           passages:[{book:"1 Thessaloniciens",chapter:5}] },
    { day:4,  title:"La prière d'Élias",         passages:[{book:"1 Rois",chapter:18}] },
    { day:5,  title:"Prier avec persévérance",    passages:[{book:"Luc",chapter:18}] },
    { day:6,  title:"Demander, chercher, frapper",passages:[{book:"Matthieu",chapter:7}] },
    { day:7,  title:"La prière de Salomon",       passages:[{book:"1 Rois",chapter:8}] },
    { day:8,  title:"Daniel, homme de prière",    passages:[{book:"Daniel",chapter:6}] },
    { day:9,  title:"L'Esprit intercède",        passages:[{book:"Romains",chapter:8}] },
    { day:10, title:"Prier ensemble",             passages:[{book:"Actes",chapter:1}] },
    { day:11, title:"La prière du Psalmiste",     passages:[{book:"Psaumes",chapter:51}] },
    { day:12, title:"Jésus prie pour nous",       passages:[{book:"Jean",chapter:17}] },
    { day:13, title:"Prière d'intercession",     passages:[{book:"Genèse",chapter:18}] },
    { day:14, title:"Prier avec reconnaissance",  passages:[{book:"Philippiens",chapter:4}] },
    { day:15, title:"La louange comme prière",    passages:[{book:"Psaumes",chapter:100}] },
    { day:16, title:"Confession et pardon",       passages:[{book:"1 Jean",chapter:1}] },
    { day:17, title:"Les obstacles à la prière",  passages:[{book:"Jacques",chapter:4}] },
    { day:18, title:"Prier selon sa volonté",     passages:[{book:"1 Jean",chapter:5}] },
    { day:19, title:"La prière de Jésus",         passages:[{book:"Luc",chapter:22}] },
    { day:20, title:"Prier en tous temps",        passages:[{book:"Éphésiens",chapter:6}] },
    { day:21, title:"La prière tranquille",       passages:[{book:"Psaumes",chapter:46}] },
    { day:22, title:"Prière et jeûne",            passages:[{book:"Matthieu",chapter:6}] },
    { day:23, title:"La prière de Hannah",        passages:[{book:"1 Samuel",chapter:1}] },
    { day:24, title:"Entrer en sa présence",      passages:[{book:"Psaumes",chapter:95}] },
    { day:25, title:"La prière de Paul",          passages:[{book:"Éphésiens",chapter:1}] },
    { day:26, title:"Priez les uns pour les autres", passages:[{book:"Jacques",chapter:5}] },
    { day:27, title:"Prier pour les autorités",   passages:[{book:"1 Timothée",chapter:2}] },
    { day:28, title:"La prière exaucée",          passages:[{book:"Jean",chapter:11}] },
    { day:29, title:"Rester dans la prière",      passages:[{book:"Colossiens",chapter:4}] },
    { day:30, title:"Prier jusqu'au bout",       passages:[{book:"Luc",chapter:22}] },
  ],
  "theme-love": [
    { day:1,  title:"Dieu est amour",             passages:[{book:"1 Jean",chapter:4}] },
    { day:2,  title:"L'hymne à l'amour",        passages:[{book:"1 Corinthiens",chapter:13}] },
    { day:3,  title:"Aime ton prochain",          passages:[{book:"Marc",chapter:12}] },
    { day:4,  title:"Dieu aime le monde",         passages:[{book:"Jean",chapter:3}] },
    { day:5,  title:"L'amour du Père",           passages:[{book:"Luc",chapter:15}] },
    { day:6,  title:"Aimer ses ennemis",          passages:[{book:"Matthieu",chapter:5}] },
    { day:7,  title:"L'amour fraternel",         passages:[{book:"Jean",chapter:13}] },
    { day:8,  title:"Le Bon Samaritain",          passages:[{book:"Luc",chapter:10}] },
    { day:9,  title:"Rien ne séparera de son amour", passages:[{book:"Romains",chapter:8}] },
    { day:10, title:"L'amour de Christ",         passages:[{book:"Éphésiens",chapter:3}] },
    { day:11, title:"Aimer en actes",             passages:[{book:"1 Jean",chapter:3}] },
    { day:12, title:"L'amour du Cantique",       passages:[{book:"Cantique des Cantiques",chapter:2}] },
    { day:13, title:"La charité",                 passages:[{book:"1 Corinthiens",chapter:13}] },
    { day:14, title:"Portez les fardeaux",        passages:[{book:"Galates",chapter:6}] },
    { day:15, title:"L'amour parfait",           passages:[{book:"1 Jean",chapter:4}] },
    { day:16, title:"Soyez miséricordieux",       passages:[{book:"Luc",chapter:6}] },
    { day:17, title:"Amour et pardon",            passages:[{book:"Luc",chapter:7}] },
    { day:18, title:"Dieu a aimé le premier",     passages:[{book:"1 Jean",chapter:4}] },
    { day:19, title:"Revêtez l'amour",           passages:[{book:"Colossiens",chapter:3}] },
    { day:20, title:"L'amour qui bâtit",         passages:[{book:"1 Corinthiens",chapter:8}] },
    { day:21, title:"Servir par amour",           passages:[{book:"Galates",chapter:5}] },
    { day:22, title:"Aimer la parole de Dieu",    passages:[{book:"Psaumes",chapter:119}] },
    { day:23, title:"L'amour de Jésus",          passages:[{book:"Jean",chapter:15}] },
    { day:24, title:"Soyez en paix",              passages:[{book:"Romains",chapter:12}] },
    { day:25, title:"Hospitalité et amour",       passages:[{book:"Hébreux",chapter:13}] },
    { day:26, title:"L'amour de la famille",     passages:[{book:"Éphésiens",chapter:5}] },
    { day:27, title:"L'amour cache les fautes",  passages:[{book:"1 Pierre",chapter:4}] },
    { day:28, title:"Le commandement nouveau",    passages:[{book:"Jean",chapter:13}] },
    { day:29, title:"Restez dans son amour",      passages:[{book:"Jean",chapter:15}] },
    { day:30, title:"L'amour éternel",           passages:[{book:"Jérémie",chapter:31}] },
  ],
  "theme-forgiveness": [
    { day:1,  title:"Qu'est-ce que le pardon ?", passages:[{book:"Matthieu",chapter:18}] },
    { day:2,  title:"Dieu pardonne",              passages:[{book:"Psaumes",chapter:103}] },
    { day:3,  title:"Le pardon de Joseph",        passages:[{book:"Genèse",chapter:45}] },
    { day:4,  title:"Pardonner 70 fois 7",        passages:[{book:"Matthieu",chapter:18}] },
    { day:5,  title:"La femme adultère",          passages:[{book:"Jean",chapter:8}] },
    { day:6,  title:"Jésus pardonne sur la croix",passages:[{book:"Luc",chapter:23}] },
    { day:7,  title:"Le fils prodigue",           passages:[{book:"Luc",chapter:15}] },
    { day:8,  title:"David et Nathan",            passages:[{book:"2 Samuel",chapter:12}] },
    { day:9,  title:"Le pardon de Dieu",          passages:[{book:"1 Jean",chapter:1}] },
    { day:10, title:"Se réconcilier",             passages:[{book:"Matthieu",chapter:5}] },
    { day:11, title:"Pardonner ses ennemis",      passages:[{book:"Romains",chapter:12}] },
    { day:12, title:"La rancœur libérée",         passages:[{book:"Éphésiens",chapter:4}] },
    { day:13, title:"Colossiens et le pardon",    passages:[{book:"Colossiens",chapter:3}] },
    { day:14, title:"Pierre et le pardon",        passages:[{book:"Matthieu",chapter:18}] },
    { day:15, title:"Le pardon et la prière",     passages:[{book:"Marc",chapter:11}] },
    { day:16, title:"Paul et Onésime",            passages:[{book:"Philémon",chapter:1}] },
    { day:17, title:"Haïr le péché, aimer le pécheur", passages:[{book:"Jude",chapter:1}] },
    { day:18, title:"Réconciliation avec Dieu",   passages:[{book:"2 Corinthiens",chapter:5}] },
    { day:19, title:"Les psaumes de confession",  passages:[{book:"Psaumes",chapter:51}] },
    { day:20, title:"Pardonner comme Dieu",       passages:[{book:"Éphésiens",chapter:4}] },
    { day:21, title:"Le pardon libère",           passages:[{book:"Luc",chapter:4}] },
    { day:22, title:"Dieu oublie nos fautes",     passages:[{book:"Michée",chapter:7}] },
    { day:23, title:"Pardonner soi-même",         passages:[{book:"Romains",chapter:8}] },
    { day:24, title:"Le pardon est une décision", passages:[{book:"Matthieu",chapter:6}] },
    { day:25, title:"Bénir ceux qui nous blessent",passages:[{book:"Luc",chapter:6}] },
    { day:26, title:"Le chemin de la restauration",passages:[{book:"Galates",chapter:6}] },
    { day:27, title:"Christ, notre exemple",      passages:[{book:"1 Pierre",chapter:2}] },
    { day:28, title:"Pardon et guérison",         passages:[{book:"Jacques",chapter:5}] },
    { day:29, title:"Vivre sans rancœur",         passages:[{book:"Hébreux",chapter:12}] },
    { day:30, title:"La liberté du pardon",       passages:[{book:"Jean",chapter:8}] },
  ],
};

// ─── Génération algorithme pour les plans systématiques ──────────────────────
function generateSystematicReadings(planType: ReadingPlanType, day: number): DayReading {
  const nt = NT_BOOKS;
  const ot = OT_BOOKS;

  if (planType === "NT_4_MONTHS" || planType === "NT_1_YEAR") {
    // Distribue les 260 chapitres NT sur totalDays
    const totalDays = planType === "NT_4_MONTHS" ? 120 : 365;
    const chapPerDay = 260 / totalDays;
    const startChap = Math.floor((day - 1) * chapPerDay);
    const endChap = Math.floor(day * chapPerDay);
    const passages: { book: string; chapter: number }[] = [];
    let idx = 0;
    for (const book of nt) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        if (idx >= startChap && idx < endChap) {
          passages.push({ book: book.fr, chapter: ch });
        }
        idx++;
      }
    }
    return { day, title: `Lecture du jour ${day}`, passages: passages.length ? passages : [{ book: "Jean", chapter: 1 }] };
  }

  if (planType === "OT_6_MONTHS" || planType === "OT_1_YEAR") {
    const totalDays = planType === "OT_6_MONTHS" ? 180 : 365;
    const chapPerDay = 929 / totalDays;
    const startChap = Math.floor((day - 1) * chapPerDay);
    const endChap = Math.floor(day * chapPerDay);
    const passages: { book: string; chapter: number }[] = [];
    let idx = 0;
    for (const book of ot) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        if (idx >= startChap && idx < endChap) {
          passages.push({ book: book.fr, chapter: ch });
        }
        idx++;
      }
    }
    return { day, title: `Lecture du jour ${day}`, passages: passages.length ? passages : [{ book: "Genèse", chapter: 1 }] };
  }

  if (planType === "BIBLE_1_YEAR" || planType === "BIBLE_2_YEARS") {
    const totalDays = planType === "BIBLE_1_YEAR" ? 365 : 730;
    const totalChaps = 1189;
    const chapPerDay = totalChaps / totalDays;
    const startChap = Math.floor((day - 1) * chapPerDay);
    const endChap = Math.floor(day * chapPerDay);
    const passages: { book: string; chapter: number }[] = [];
    let idx = 0;
    for (const book of ALL_BOOKS) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        if (idx >= startChap && idx < endChap) {
          passages.push({ book: book.fr, chapter: ch });
        }
        idx++;
      }
    }
    return { day, title: `Lecture du jour ${day}`, passages: passages.length ? passages : [{ book: "Matthieu", chapter: 1 }] };
  }

  return { day, title: `Jour ${day}`, passages: [{ book: "Psaumes", chapter: day }] };
}

// ─── API publique ─────────────────────────────────────────────────────────────
export function getDayReading(planId: string, day: number): DayReading {
  const plan = READING_PLANS.find((p) => p.id === planId);
  if (!plan) return { day, title: "Lecture", passages: [] };
  if (THEMATIC_READINGS[planId]) {
    return THEMATIC_READINGS[planId][day - 1] ?? { day, title: "Lecture", passages: [] };
  }
  return generateSystematicReadings(plan.type, day);
}

export function calculateProgress(completedDays: number[], totalDays: number): number {
  return totalDays > 0 ? Math.round((completedDays.length / totalDays) * 100) : 0;
}

export function getRecommendedPlans(level: SpiritualLevel, goal: SpiritualGoal): ReadingPlan[] {
  return READING_PLANS.filter((p) => p.level === level && p.goals.includes(goal));
}

export const LEVEL_LABELS: Record<SpiritualLevel, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

export const GOAL_LABELS: Record<SpiritualGoal, string> = {
  SALVATION: "Salut", FAITH: "Foi", PRAYER: "Prière", LOVE: "Amour",
  FORGIVENESS: "Pardon", DISCIPLINE: "Discipline", HOLINESS: "Sainteté", WORSHIP: "Adoration",
};
