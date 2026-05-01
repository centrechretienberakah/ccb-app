export interface BibleBook {
  fr: string;       // Nom français
  en: string;       // Nom anglais (pour API)
  abbr: string;     // Abréviation française
  chapters: number; // Nombre de chapitres
}

export const OT_BOOKS: BibleBook[] = [
  { fr: "Genèse", en: "Genesis", abbr: "Gen", chapters: 50 },
  { fr: "Exode", en: "Exodus", abbr: "Exo", chapters: 40 },
  { fr: "Lévitique", en: "Leviticus", abbr: "Lév", chapters: 27 },
  { fr: "Nombres", en: "Numbers", abbr: "Nom", chapters: 36 },
  { fr: "Deutéronome", en: "Deuteronomy", abbr: "Deu", chapters: 34 },
  { fr: "Josué", en: "Joshua", abbr: "Jos", chapters: 24 },
  { fr: "Juges", en: "Judges", abbr: "Jug", chapters: 21 },
  { fr: "Ruth", en: "Ruth", abbr: "Rut", chapters: 4 },
  { fr: "1 Samuel", en: "1 Samuel", abbr: "1Sa", chapters: 31 },
  { fr: "2 Samuel", en: "2 Samuel", abbr: "2Sa", chapters: 24 },
  { fr: "1 Rois", en: "1 Kings", abbr: "1Ro", chapters: 22 },
  { fr: "2 Rois", en: "2 Kings", abbr: "2Ro", chapters: 25 },
  { fr: "1 Chroniques", en: "1 Chronicles", abbr: "1Ch", chapters: 29 },
  { fr: "2 Chroniques", en: "2 Chronicles", abbr: "2Ch", chapters: 36 },
  { fr: "Esdras", en: "Ezra", abbr: "Esd", chapters: 10 },
  { fr: "Néhémie", en: "Nehemiah", abbr: "Néh", chapters: 13 },
  { fr: "Esther", en: "Esther", abbr: "Est", chapters: 10 },
  { fr: "Job", en: "Job", abbr: "Job", chapters: 42 },
  { fr: "Psaumes", en: "Psalms", abbr: "Psa", chapters: 150 },
  { fr: "Proverbes", en: "Proverbs", abbr: "Pro", chapters: 31 },
  { fr: "Ecclésiaste", en: "Ecclesiastes", abbr: "Ecc", chapters: 12 },
  { fr: "Cantique des Cantiques", en: "Song of Solomon", abbr: "Can", chapters: 8 },
  { fr: "Ésaïe", en: "Isaiah", abbr: "Ésa", chapters: 66 },
  { fr: "Jérémie", en: "Jeremiah", abbr: "Jér", chapters: 52 },
  { fr: "Lamentations", en: "Lamentations", abbr: "Lam", chapters: 5 },
  { fr: "Ézéchiel", en: "Ezekiel", abbr: "Ézé", chapters: 48 },
  { fr: "Daniel", en: "Daniel", abbr: "Dan", chapters: 12 },
  { fr: "Osée", en: "Hosea", abbr: "Osé", chapters: 14 },
  { fr: "Joël", en: "Joel", abbr: "Joë", chapters: 3 },
  { fr: "Amos", en: "Amos", abbr: "Amo", chapters: 9 },
  { fr: "Abdias", en: "Obadiah", abbr: "Abd", chapters: 1 },
  { fr: "Jonas", en: "Jonah", abbr: "Jon", chapters: 4 },
  { fr: "Michée", en: "Micah", abbr: "Mic", chapters: 7 },
  { fr: "Nahoum", en: "Nahum", abbr: "Nah", chapters: 3 },
  { fr: "Habacuc", en: "Habakkuk", abbr: "Hab", chapters: 3 },
  { fr: "Sophonie", en: "Zephaniah", abbr: "Sop", chapters: 3 },
  { fr: "Aggée", en: "Haggai", abbr: "Agg", chapters: 2 },
  { fr: "Zacharie", en: "Zechariah", abbr: "Zac", chapters: 14 },
  { fr: "Malachie", en: "Malachi", abbr: "Mal", chapters: 4 },
];

export const NT_BOOKS: BibleBook[] = [
  { fr: "Matthieu", en: "Matthew", abbr: "Mat", chapters: 28 },
  { fr: "Marc", en: "Mark", abbr: "Mar", chapters: 16 },
  { fr: "Luc", en: "Luke", abbr: "Luc", chapters: 24 },
  { fr: "Jean", en: "John", abbr: "Jea", chapters: 21 },
  { fr: "Actes", en: "Acts", abbr: "Act", chapters: 28 },
  { fr: "Romains", en: "Romans", abbr: "Rom", chapters: 16 },
  { fr: "1 Corinthiens", en: "1 Corinthians", abbr: "1Co", chapters: 16 },
  { fr: "2 Corinthiens", en: "2 Corinthians", abbr: "2Co", chapters: 13 },
  { fr: "Galates", en: "Galatians", abbr: "Gal", chapters: 6 },
  { fr: "Éphésiens", en: "Ephesians", abbr: "Éph", chapters: 6 },
  { fr: "Philippiens", en: "Philippians", abbr: "Phi", chapters: 4 },
  { fr: "Colossiens", en: "Colossians", abbr: "Col", chapters: 4 },
  { fr: "1 Thessaloniciens", en: "1 Thessalonians", abbr: "1Th", chapters: 5 },
  { fr: "2 Thessaloniciens", en: "2 Thessalonians", abbr: "2Th", chapters: 3 },
  { fr: "1 Timothée", en: "1 Timothy", abbr: "1Ti", chapters: 6 },
  { fr: "2 Timothée", en: "2 Timothy", abbr: "2Ti", chapters: 4 },
  { fr: "Tite", en: "Titus", abbr: "Tit", chapters: 3 },
  { fr: "Philémon", en: "Philemon", abbr: "Phm", chapters: 1 },
  { fr: "Hébreux", en: "Hebrews", abbr: "Héb", chapters: 13 },
  { fr: "Jacques", en: "James", abbr: "Jac", chapters: 5 },
  { fr: "1 Pierre", en: "1 Peter", abbr: "1Pi", chapters: 5 },
  { fr: "2 Pierre", en: "2 Peter", abbr: "2Pi", chapters: 3 },
  { fr: "1 Jean", en: "1 John", abbr: "1Je", chapters: 5 },
  { fr: "2 Jean", en: "2 John", abbr: "2Je", chapters: 1 },
  { fr: "3 Jean", en: "3 John", abbr: "3Je", chapters: 1 },
  { fr: "Jude", en: "Jude", abbr: "Jud", chapters: 1 },
  { fr: "Apocalypse", en: "Revelation", abbr: "Apo", chapters: 22 },
];

export const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];

export const OT_TOTAL = OT_BOOKS.reduce((s, b) => s + b.chapters, 0); // 929
export const NT_TOTAL = NT_BOOKS.reduce((s, b) => s + b.chapters, 0); // 260

// Bible.com LSG links helper
export function getBibleComUrl(book: string, chapter: number): string {
  const bookMap: Record<string, string> = {
    "Genèse": "GEN", "Exode": "EXO", "Lévitique": "LEV", "Nombres": "NUM",
    "Deutéronome": "DEU", "Josué": "JOS", "Juges": "JDG", "Ruth": "RUT",
    "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Rois": "1KI", "2 Rois": "2KI",
    "1 Chroniques": "1CH", "2 Chroniques": "2CH", "Esdras": "EZR",
    "Néhémie": "NEH", "Esther": "EST", "Job": "JOB", "Psaumes": "PSA",
    "Proverbes": "PRO", "Ecclésiaste": "ECC", "Cantique des Cantiques": "SNG",
    "Ésaïe": "ISA", "Jérémie": "JER", "Lamentations": "LAM", "Ézéchiel": "EZK",
    "Daniel": "DAN", "Osée": "HOS", "Joël": "JOL", "Amos": "AMO",
    "Abdias": "OBA", "Jonas": "JON", "Michée": "MIC", "Nahoum": "NAM",
    "Habacuc": "HAB", "Sophonie": "ZEP", "Aggée": "HAG", "Zacharie": "ZEC",
    "Malachie": "MAL", "Matthieu": "MAT", "Marc": "MRK", "Luc": "LUK",
    "Jean": "JHN", "Actes": "ACT", "Romains": "ROM", "1 Corinthiens": "1CO",
    "2 Corinthiens": "2CO", "Galates": "GAL", "Éphésiens": "EPH",
    "Philippiens": "PHP", "Colossiens": "COL", "1 Thessaloniciens": "1TH",
    "2 Thessaloniciens": "2TH", "1 Timothée": "1TI", "2 Timothée": "2TI",
    "Tite": "TIT", "Philémon": "PHM", "Hébreux": "HEB", "Jacques": "JAS",
    "1 Pierre": "1PE", "2 Pierre": "2PE", "1 Jean": "1JN", "2 Jean": "2JN",
    "3 Jean": "3JN", "Jude": "JUD", "Apocalypse": "REV",
  };
  const code = bookMap[book] || "GEN";
  // 93 = LSG (Louis Segond), closest to LSV 1910 on Bible.com
  return `https://www.bible.com/bible/93/${code}.${chapter}.LSG`;
}
