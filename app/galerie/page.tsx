import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Galerie CCB" };
export default function GaleriePage() {
  return (
    <ComingSoon
      emoji="🖼️"
      title="Galerie Photos"
      subtitle="Moments & Souvenirs"
      description="Revivez les plus beaux moments du ministère : cultes, événements, baptêmes, et toutes les occasions de grâce."
      accentColor="#ec4899"
      accentGlow="rgba(236,72,153,0.2)"
      features={[
        { icon: "📸", label: "Albums par événement" },
        { icon: "❤️", label: "Aimer & partager" },
        { icon: "🔍", label: "Recherche avancée" },
        { icon: "⬇️", label: "Téléchargement HD" },
        { icon: "🎞️", label: "Diaporama" },
        { icon: "🗓️", label: "Fil chronologique" },
      ]}
      notifyLabel="Me notifier des nouveaux albums"
    />
  );
}
