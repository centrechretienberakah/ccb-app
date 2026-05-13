import { Metadata } from "next";
import JesusDailyClient from "./JesusDailyClient";

export const metadata: Metadata = { title: "Jesus Daily — CCB" };

// Contenu statique pour commencer — peut être migré en DB plus tard
const VIDEOS = [
  { id: "1", date: "2026-05-13", title: "La puissance de la Parole", scripture: "Jean 1:1", theme: "Parole de Dieu", youtubeId: "", tiktokUrl: "", content: "Au commencement était la Parole, et la Parole était avec Dieu. Chaque matin, aligne ta bouche avec le ciel. Parle, déclare, proclame — car la Parole crée !", emoji: "⚡" },
  { id: "2", date: "2026-05-12", title: "Marchons par la foi", scripture: "2 Corinthiens 5:7", theme: "Foi", youtubeId: "", tiktokUrl: "", content: "Nous marchons par la foi et non par la vue. Ce que tu ne vois pas encore, Dieu l'a déjà préparé. Avance, il tient ta main !", emoji: "🔥" },
  { id: "3", date: "2026-05-11", title: "Tu es la lumière", scripture: "Matthieu 5:14", theme: "Identité", youtubeId: "", tiktokUrl: "", content: "Vous êtes la lumière du monde. Tu n'as pas besoin de permission pour briller. Ton seul devoir : ne pas te cacher !", emoji: "✨" },
  { id: "4", date: "2026-05-10", title: "Grâce sur grâce", scripture: "Jean 1:16", theme: "Grâce", youtubeId: "", tiktokUrl: "", content: "De sa plénitude, nous avons tous reçu grâce sur grâce. Il ne t'a pas donné juste assez — il t'a comblé !", emoji: "🌊" },
  { id: "5", date: "2026-05-09", title: "La paix qui dépasse", scripture: "Philippiens 4:7", theme: "Paix", youtubeId: "", tiktokUrl: "", content: "La paix de Dieu qui surpasse toute intelligence gardera votre cœur. Cette paix-là ne dépend pas des circonstances !", emoji: "🕊️" },
];

export default function JesusDailyPage() {
  return <JesusDailyClient videos={VIDEOS} />;
}
