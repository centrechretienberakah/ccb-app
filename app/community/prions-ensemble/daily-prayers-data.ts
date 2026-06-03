import { getParisDayIndex } from "@/app/devotion/devotions-data";

export interface DailyPrayer {
  id: string | null;
  date?: string;
  title: string;      // thème
  verse_ref: string;
  verse_text: string;
  content: string;    // le texte de la prière
  author: string;
}

const AUTHOR = "Rév. Elvis NGUIFFO";

// 7 prières de référence — tournent selon le jour de la semaine (Paris).
// Une prière auto-publiée chaque jour, sur le modèle des méditations.
export const STATIC_PRAYERS: DailyPrayer[] = [
  {
    id: null,
    title: "Prière de consécration",
    verse_ref: "Romains 12:1",
    verse_text: "Je vous exhorte donc, frères, à offrir vos corps comme un sacrifice vivant, saint, agréable à Dieu, ce qui sera de votre part un culte raisonnable.",
    content: `Père céleste, je me présente devant Toi en ce jour nouveau. Je T'offre ma vie, mon cœur, mes pensées et mes projets. Sois le Seigneur de chaque instant de ma journée.\n\nQue Ta volonté soit faite en moi comme au ciel. Conduis mes pas, garde ma bouche, sanctifie mes intentions. Que tout ce que je fais aujourd'hui Te rende gloire.\n\nJe me consacre entièrement à Toi. Au nom puissant de Jésus-Christ, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière pour la force et le courage",
    verse_ref: "Josué 1:9",
    verse_text: "Ne t'ai-je pas donné cet ordre : Fortifie-toi et prends courage ? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi.",
    content: `Seigneur, dans les défis de cette journée, sois ma force. Là où je me sens faible, manifeste Ta puissance. Là où j'ai peur, donne-moi Ton courage.\n\nJe refuse l'esprit de crainte, car Tu m'as donné un esprit de force, d'amour et de sagesse. Je marche avec assurance car Tu es avec moi partout où je vais.\n\nMerci Seigneur pour Ta présence fidèle. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière pour la famille",
    verse_ref: "Josué 24:15",
    verse_text: "Moi et ma maison, nous servirons l'Éternel.",
    content: `Père, je Te confie ma famille aujourd'hui. Étends Ta main de protection sur chacun de ses membres. Couvre-les de Ton sang précieux et garde-les de tout mal.\n\nQue la paix règne dans nos foyers, que l'amour nous unisse et que Ta présence habite au milieu de nous. Restaure ce qui est brisé, réconcilie ce qui est divisé.\n\nQue ma maison Te serve et T'honore tous les jours. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière de reconnaissance",
    verse_ref: "Psaume 100:4",
    verse_text: "Entrez dans ses portes avec des louanges, dans ses parvis avec des cantiques ! Célébrez-le, bénissez son nom !",
    content: `Seigneur, je Te rends grâce pour le don de la vie, pour le souffle dans mes narines et pour Tes bontés qui se renouvellent chaque matin.\n\nMerci pour Ta fidélité, merci pour Ta provision, merci pour Ton amour qui ne change jamais. Même dans les épreuves, Tu demeures bon.\n\nQue ma vie soit un cantique de reconnaissance à Ta gloire. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière de délivrance",
    verse_ref: "Jean 8:36",
    verse_text: "Si donc le Fils vous affranchit, vous serez réellement libres.",
    content: `Seigneur Jésus, Tu es venu pour libérer les captifs. Je viens à Toi avec tout ce qui me retient : mes peurs, mes blessures, mes chaînes du passé.\n\nPar Ta puissance, brise tout joug, romps toute entrave, et fais-moi entrer dans la liberté des enfants de Dieu. Je ne suis plus esclave de la peur, mais fils/fille du Dieu vivant.\n\nMerci pour la liberté que Tu m'accordes. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière pour la sagesse",
    verse_ref: "Jacques 1:5",
    verse_text: "Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée.",
    content: `Père, je reconnais que j'ai besoin de Ta sagesse pour les décisions qui m'attendent. Éclaire mon intelligence, guide mes choix, et que Ton Esprit me conduise dans toute la vérité.\n\nQue je ne m'appuie pas sur ma propre intelligence, mais que je Te reconnaisse dans toutes mes voies, afin que Tu aplanisses mes sentiers.\n\nDonne-moi un cœur sage et un esprit discernant. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
  {
    id: null,
    title: "Prière d'intercession",
    verse_ref: "1 Timothée 2:1",
    verse_text: "J'exhorte donc, avant toutes choses, à faire des prières, des supplications, des requêtes, des actions de grâces, pour tous les hommes.",
    content: `Seigneur, je me tiens dans la brèche aujourd'hui pour intercéder. Je Te présente ceux qui souffrent, les malades, les éprouvés, ceux qui sont loin de Toi.\n\nVisite nos familles, notre église, notre nation. Que Ton règne vienne, que Ta volonté soit faite. Touche les cœurs et ramène les âmes à Toi.\n\nQue Ton Royaume avance et que Ton nom soit glorifié. Au nom de Jésus, Amen.`,
    author: AUTHOR,
  },
];

/** Prière du jour (rotation par jour de la semaine en fuseau Europe/Paris). */
export function getDailyPrayer(): DailyPrayer {
  const dayIndex = getParisDayIndex(); // bascule à 00:00 Paris, comme les méditations
  return STATIC_PRAYERS[dayIndex];
}
