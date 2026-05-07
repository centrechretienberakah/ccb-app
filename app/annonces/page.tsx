import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Annonces CCB" };
export default function AnnoncesPage() {
  return (
    <ComingSoon
      emoji="📢"
      title="Espace Annonces"
      subtitle="Actualités & Informations"
      description="Restez informés de toutes les nouvelles du Centre Chrétien Berakah : événements, alertes, publications pastorales et bien plus."
      accentColor="var(--gold)"
      accentGlow="rgba(212,175,55,0.2)"
      features={[
        { icon: "🔔", label: "Notifications push" },
        { icon: "📌", label: "Épingler les annonces" },
        { icon: "🗂️", label: "Catégories" },
        { icon: "📅", label: "Calendrier intégré" },
        { icon: "🖼️", label: "Médias joints" },
        { icon: "👁️", label: "Statistiques de lecture" },
      ]}
      notifyLabel="Me notifier des annonces"
    />
  );
}
