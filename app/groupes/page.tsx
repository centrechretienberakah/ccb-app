import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Groupes Privés CCB" };
export default function GroupesPage() {
  return (
    <ComingSoon
      emoji="🤝"
      title="Groupes de Travail"
      subtitle="Cellules & Mentorat"
      description="Rejoignez des groupes privés de croissance spirituelle, des cellules de prière, des équipes de mentorat et des communautés thématiques."
      accentColor="#16a34a"
      accentGlow="rgba(22,163,74,0.2)"
      features={[
        { icon: "🔒", label: "Groupes privés" },
        { icon: "💬", label: "Discussions internes" },
        { icon: "📁", label: "Partage de fichiers" },
        { icon: "📈", label: "Suivi progression" },
        { icon: "🙏", label: "Cellules de prière" },
        { icon: "👨‍🏫", label: "Mentorat personnalisé" },
      ]}
      notifyLabel="Rejoindre un groupe"
    />
  );
}
