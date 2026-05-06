import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Événements CCB" };

export default function EventsPage() {
  return (
    <ComingSoon
      emoji="🎉"
      title="Événements CCB"
      subtitle="Calendrier & Inscriptions"
      description="Retrouvez tous les événements du Centre Chrétien Berakah : cultes spéciaux, retraites, bootcamps, conférences et plus."
      accentColor="var(--gold)"
      accentGlow="rgba(212,175,55,0.2)"
      features={[
        { icon: "📅", label: "Calendrier interactif" },
        { icon: "🎟️", label: "Inscriptions en ligne" },
        { icon: "🔔", label: "Rappels d'événements" },
        { icon: "📍", label: "Lieu & directions" },
        { icon: "👥", label: "Participants inscrits" },
        { icon: "📸", label: "Galerie photos" },
      ]}
      notifyLabel="M'inscrire aux événements"
    />
  );
}
