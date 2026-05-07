import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Témoignages CCB" };
export default function TemoignagesPage() {
  return (
    <ComingSoon
      emoji="✨"
      title="Espace Témoignages"
      subtitle="Gloire à Dieu !"
      description="Partagez ce que Dieu a accompli dans votre vie et soyez encouragé par les témoignages de vos frères et sœurs en Christ."
      accentColor="#f59e0b"
      accentGlow="rgba(245,158,11,0.2)"
      features={[
        { icon: "📝", label: "Partager votre histoire" },
        { icon: "🏷️", label: "Catégories : guérison, délivrance..." },
        { icon: "❤️", label: "Liker & encourager" },
        { icon: "🛡️", label: "Modération bienveillante" },
        { icon: "🌟", label: "Témoignages mis en avant" },
        { icon: "🔔", label: "Notifications" },
      ]}
      notifyLabel="Partager mon témoignage"
    />
  );
}
