import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "À Propos — CCB" };
export default function AProposPage() {
  return (
    <ComingSoon
      emoji="⛪"
      title="À Propos"
      subtitle="Notre Histoire & Vision"
      description="Découvrez l'histoire, la vision, la mission et les valeurs du Centre Chrétien Berakah, ainsi que le profil du Rév. Elvis NGUIFFO."
      accentColor="#b45309"
      accentGlow="rgba(180,83,9,0.2)"
      features={[
        { icon: "🕊️", label: "Vision & Mission" },
        { icon: "📖", label: "Nos valeurs bibliques" },
        { icon: "👤", label: "Bio Rév. Elvis NGUIFFO" },
        { icon: "📜", label: "Histoire de l'église" },
        { icon: "🌍", label: "Impact & chiffres clés" },
        { icon: "🤝", label: "Équipe pastorale" },
      ]}
      notifyLabel="En savoir plus"
    />
  );
}
