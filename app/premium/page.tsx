import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Premium — Passe Berakah" };

export default function PremiumPage() {
  return (
    <ComingSoon
      emoji="👑"
      title="Passe Berakah Premium"
      subtitle="Accès illimité à tout le contenu"
      description="Débloquez l'intégralité des ressources CCB : classes, archives, contenu exclusif et accompagnement personnalisé."
      accentColor="var(--gold)"
      accentGlow="rgba(212,175,55,0.25)"
      features={[
        { icon: "♾️", label: "Accès illimité" },
        { icon: "🎓", label: "Toutes les classes" },
        { icon: "📚", label: "Bibliothèque complète" },
        { icon: "🤝", label: "Mentorat 1-on-1" },
        { icon: "🎁", label: "Ressources exclusives" },
        { icon: "⚡", label: "Téléchargements offline" },
      ]}
      notifyLabel="Être averti du lancement"
    />
  );
}
