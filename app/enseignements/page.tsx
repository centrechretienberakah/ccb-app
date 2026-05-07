import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Enseignements CCB" };
export default function EnseignementsPage() {
  return (
    <ComingSoon
      emoji="🎙️"
      title="Nos Enseignements"
      subtitle="Sermons & Prédications"
      description="Écoutez et regardez les sermons du Rév. Elvis NGUIFFO et des enseignants du Centre Chrétien Berakah, classés par séries thématiques."
      accentColor="#1d4ed8"
      accentGlow="rgba(29,78,216,0.2)"
      features={[
        { icon: "🎥", label: "Vidéos sermons" },
        { icon: "🎧", label: "Audio uniquement" },
        { icon: "📚", label: "Séries thématiques" },
        { icon: "🔍", label: "Recherche full-text" },
        { icon: "⬇️", label: "Téléchargement" },
        { icon: "📤", label: "Partage réseaux sociaux" },
      ]}
      notifyLabel="Me notifier des nouveaux sermons"
    />
  );
}
