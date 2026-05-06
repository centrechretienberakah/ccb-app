import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Classes Bibliques" };

export default function ClassesPage() {
  return (
    <ComingSoon
      emoji="🎓"
      title="Classes Bibliques"
      subtitle="Formation & Enseignement"
      description="Des cours structurés pour approfondir votre connaissance de la Parole et grandir dans la foi."
      accentColor="var(--violet)"
      accentGlow="rgba(90,44,160,0.2)"
      features={[
        { icon: "📖", label: "Cours thématiques" },
        { icon: "🎥", label: "Vidéos HD" },
        { icon: "📝", label: "Quiz & exercices" },
        { icon: "🏆", label: "Certificats" },
        { icon: "👨‍🏫", label: "Enseignants certifiés" },
        { icon: "📱", label: "Accès mobile" },
      ]}
      notifyLabel="Me notifier à l'ouverture"
    />
  );
}
