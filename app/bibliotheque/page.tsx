import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Bibliothèque CCB" };
export default function BibliothequeePage() {
  return (
    <ComingSoon
      emoji="📚"
      title="Bibliothèque Digitale"
      subtitle="Ressources & Documents"
      description="Accédez à une vaste collection de livres, PDFs, messages audio et vidéos pour approfondir votre foi."
      accentColor="#0891b2"
      accentGlow="rgba(8,145,178,0.2)"
      features={[
        { icon: "📄", label: "PDFs & documents" },
        { icon: "🎧", label: "Messages audio" },
        { icon: "🎬", label: "Vidéos" },
        { icon: "🔍", label: "Recherche full-text" },
        { icon: "⬇️", label: "Téléchargement offline" },
        { icon: "🏷️", label: "Catégories thématiques" },
      ]}
      notifyLabel="Me notifier des nouvelles ressources"
    />
  );
}
