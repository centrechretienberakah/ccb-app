import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Rendez-vous Pastoral" };
export default function RendezVousPage() {
  return (
    <ComingSoon
      emoji="🗓️"
      title="Rendez-vous Pastoral"
      subtitle="Conseil & Accompagnement"
      description="Réservez un temps de rencontre avec votre pasteur pour un accompagnement personnalisé, un conseil biblique ou une prière."
      accentColor="#7c3aed"
      accentGlow="rgba(124,58,237,0.2)"
      features={[
        { icon: "📅", label: "Créneaux disponibles" },
        { icon: "✅", label: "Réservation en ligne" },
        { icon: "📧", label: "Confirmation email" },
        { icon: "🔔", label: "Rappels automatiques" },
        { icon: "🔒", label: "Confidentialité totale" },
        { icon: "📞", label: "Présentiel ou visio" },
      ]}
      notifyLabel="Demander un rendez-vous"
    />
  );
}
