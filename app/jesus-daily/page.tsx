import { Metadata } from "next";
import JesusDailyClient from "./JesusDailyClient";

export const metadata: Metadata = { title: "Jesus Daily — CCB" };

// Contenu statique pour commencer — peut être migré en DB plus tard
const VIDEOS = [
  { id: "1", date: "2026-05-13", title: "Jésus : la seule voie", scripture: "Jean 14:6", theme: "Évangile", youtubeId: "", tiktokUrl: "", content: "Jésus lui dit : Je suis le chemin, la vérité et la vie. Nul ne vient au Père que par moi. Le salut n'est pas une religion — c'est une relation avec une personne : Jésus-Christ.", emoji: "✝️" },
  { id: "2", date: "2026-05-12", title: "Dieu t'a tant aimé", scripture: "Jean 3:16", theme: "Amour de Dieu", youtubeId: "", tiktokUrl: "", content: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique. Avant que tu ne le cherches, il t'a déjà aimé. L'Évangile commence par cet amour inconditionnel.", emoji: "❤️" },
  { id: "3", date: "2026-05-11", title: "La grâce suffit", scripture: "Éphésiens 2:8-9", theme: "Salut", youtubeId: "", tiktokUrl: "", content: "C'est par la grâce que vous êtes sauvés, par le moyen de la foi. Le salut est un don — pas une récompense. Tu n'as pas à le mériter : tu n'as qu'à le recevoir.", emoji: "🎁" },
  { id: "4", date: "2026-05-10", title: "Une vie nouvelle", scripture: "2 Corinthiens 5:17", theme: "Nouvelle naissance", youtubeId: "", tiktokUrl: "", content: "Si quelqu'un est en Christ, il est une nouvelle créature. L'Évangile ne t'améliore pas — il te renouvelle. Jésus ne colmate pas les fissures, il refait tout à neuf.", emoji: "🌱" },
  { id: "5", date: "2026-05-09", title: "Réconciliés avec Dieu", scripture: "Romains 5:1", theme: "Réconciliation", youtubeId: "", tiktokUrl: "", content: "Étant donc justifiés par la foi, nous avons la paix avec Dieu par notre Seigneur Jésus-Christ. Le péché creusait un fossé — la croix l'a comblé. Tu peux t'approcher de Dieu aujourd'hui.", emoji: "🕊️" },
];

export default function JesusDailyPage() {
  return <JesusDailyClient videos={VIDEOS} />;
}
