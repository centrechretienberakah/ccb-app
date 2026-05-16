// Pool de versets utilisés pour le « Verset du jour » du module Bible.
// Sélection déterministe par hash de la date — même verset pour tous les
// membres dans une même journée, pas besoin de cron.

export interface DailyVerse {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export const DAILY_VERSE_POOL: DailyVerse[] = [
  { reference: "Jean 3:16",        book: "Jean",        chapter: 3,  verse: 16, text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle." },
  { reference: "Psaumes 23:1",     book: "Psaumes",     chapter: 23, verse: 1,  text: "L'Éternel est mon berger : je ne manquerai de rien." },
  { reference: "Philippiens 4:13", book: "Philippiens", chapter: 4,  verse: 13, text: "Je puis tout par celui qui me fortifie." },
  { reference: "Jérémie 29:11",    book: "Jérémie",     chapter: 29, verse: 11, text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance." },
  { reference: "Romains 8:28",     book: "Romains",     chapter: 8,  verse: 28, text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein." },
  { reference: "Proverbes 3:5",    book: "Proverbes",   chapter: 3,  verse: 5,  text: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse." },
  { reference: "Ésaïe 41:10",      book: "Ésaïe",       chapter: 41, verse: 10, text: "Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu ; je te fortifie, je viens à ton secours, je te soutiens de ma droite triomphante." },
  { reference: "Matthieu 11:28",   book: "Matthieu",    chapter: 11, verse: 28, text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos." },
  { reference: "Psaumes 46:1",     book: "Psaumes",     chapter: 46, verse: 1,  text: "Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse." },
  { reference: "2 Corinthiens 5:17", book: "2 Corinthiens", chapter: 5, verse: 17, text: "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées ; voici, toutes choses sont devenues nouvelles." },
  { reference: "Romains 12:2",     book: "Romains",     chapter: 12, verse: 2,  text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence." },
  { reference: "Hébreux 11:1",     book: "Hébreux",     chapter: 11, verse: 1,  text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas." },
  { reference: "Jacques 1:5",      book: "Jacques",     chapter: 1,  verse: 5,  text: "Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée." },
  { reference: "1 Pierre 5:7",     book: "1 Pierre",    chapter: 5,  verse: 7,  text: "Déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous." },
  { reference: "Galates 5:22",     book: "Galates",     chapter: 5,  verse: 22, text: "Mais le fruit de l'Esprit, c'est l'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité." },
  { reference: "Éphésiens 2:8",    book: "Éphésiens",   chapter: 2,  verse: 8,  text: "Car c'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu." },
  { reference: "Josué 1:9",        book: "Josué",       chapter: 1,  verse: 9,  text: "Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras." },
  { reference: "Psaumes 91:1",     book: "Psaumes",     chapter: 91, verse: 1,  text: "Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout-Puissant." },
  { reference: "Matthieu 6:33",    book: "Matthieu",    chapter: 6,  verse: 33, text: "Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus." },
  { reference: "Romains 10:9",     book: "Romains",     chapter: 10, verse: 9,  text: "Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l'a ressuscité des morts, tu seras sauvé." },
  { reference: "1 Jean 4:8",       book: "1 Jean",      chapter: 4,  verse: 8,  text: "Celui qui n'aime pas n'a pas connu Dieu, car Dieu est amour." },
  { reference: "Psaumes 119:105",  book: "Psaumes",     chapter: 119, verse: 105, text: "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier." },
  { reference: "Apocalypse 3:20",  book: "Apocalypse",  chapter: 3,  verse: 20, text: "Voici, je me tiens à la porte, et je frappe. Si quelqu'un entend ma voix et ouvre la porte, j'entrerai chez lui, je souperai avec lui, et lui avec moi." },
  { reference: "Marc 11:24",       book: "Marc",        chapter: 11, verse: 24, text: "C'est pourquoi je vous dis : Tout ce que vous demanderez en priant, croyez que vous l'avez reçu, et vous le verrez s'accomplir." },
  { reference: "2 Timothée 1:7",   book: "2 Timothée",  chapter: 1,  verse: 7,  text: "Car ce n'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d'amour et de sagesse." },
  { reference: "Psaumes 34:18",    book: "Psaumes",     chapter: 34, verse: 18, text: "L'Éternel est près de ceux qui ont le cœur brisé, et il sauve ceux qui ont l'esprit dans l'abattement." },
  { reference: "Romains 5:8",      book: "Romains",     chapter: 5,  verse: 8,  text: "Mais Dieu prouve son amour envers nous, en ce que, lorsque nous étions encore des pécheurs, Christ est mort pour nous." },
  { reference: "Lamentations 3:22",book: "Lamentations",chapter: 3,  verse: 22, text: "Les bontés de l'Éternel ne sont pas épuisées, ses compassions ne sont pas à leur terme." },
  { reference: "Sophonie 3:17",    book: "Sophonie",    chapter: 3,  verse: 17, text: "L'Éternel, ton Dieu, est au milieu de toi, comme un héros qui sauve ; il fera de toi sa plus grande joie." },
  { reference: "Jean 14:6",        book: "Jean",        chapter: 14, verse: 6,  text: "Jésus lui dit : Je suis le chemin, la vérité, et la vie. Nul ne vient au Père que par moi." },
];

// Sélection déterministe : hash YYYYMMDD modulo pool length
export function getDailyVerse(dateStr?: string): DailyVerse {
  const d = dateStr ?? new Date().toISOString().split("T")[0];
  const n = parseInt(d.replace(/-/g, ""), 10);
  const idx = ((n % DAILY_VERSE_POOL.length) + DAILY_VERSE_POOL.length) % DAILY_VERSE_POOL.length;
  return DAILY_VERSE_POOL[idx];
}
