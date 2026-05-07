import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Faire un Don — CCB" };
export default function DonsPage() {
  return (
    <ComingSoon
      emoji="💝"
      title="Faire un Don"
      subtitle="Soutenez le Ministère"
      description="Votre générosité permet au Centre Chrétien Berakah de continuer à proclamer l'Évangile, former des disciples et impacter des vies."
      accentColor="#dc2626"
      accentGlow="rgba(220,38,38,0.2)"
      features={[
        { icon: "💳", label: "Don en ligne sécurisé" },
        { icon: "🔄", label: "Don récurrent mensuel" },
        { icon: "📧", label: "Reçu automatique" },
        { icon: "📊", label: "Historique des dons" },
        { icon: "🔒", label: "Paiement sécurisé" },
        { icon: "🙏", label: "Prière de remerciement" },
      ]}
      notifyLabel="Faire un don maintenant"
    />
  );
}
