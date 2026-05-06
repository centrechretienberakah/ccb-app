import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Plan de Lecture Biblique" };

export default function PlanBibliquePage() {
  return (
    <ComingSoon
      emoji="📅"
      title="Plan de Lecture Biblique"
      subtitle="Lire la Bible en 1 an"
      description="Un plan structuré pour lire toute la Bible en un an, avec des rappels quotidiens et des commentaires guidés."
      accentColor="var(--violet)"
      accentGlow="rgba(90,44,160,0.2)"
      features={[
        { icon: "📖", label: "Bible complète en 1 an" },
        { icon: "✅", label: "Suivi de progression" },
        { icon: "💬", label: "Commentaires guidés" },
        { icon: "🔔", label: "Rappels quotidiens" },
        { icon: "📊", label: "Statistiques" },
        { icon: "👥", label: "Lecture en groupe" },
      ]}
      notifyLabel="Me notifier au lancement"
    />
  );
}
