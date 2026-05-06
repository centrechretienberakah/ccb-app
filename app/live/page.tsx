import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Live — Cultes en direct" };

export default function LivePage() {
  return (
    <ComingSoon
      emoji="📡"
      title="Cultes en Direct"
      subtitle="Worship Live"
      description="Rejoignez les cultes du Centre Chrétien Berakah en temps réel, où que vous soyez dans le monde."
      accentColor="#e53e3e"
      accentGlow="rgba(229,62,62,0.2)"
      features={[
        { icon: "🔴", label: "Stream HD" },
        { icon: "💬", label: "Chat en direct" },
        { icon: "🙏", label: "Mur de prière" },
        { icon: "📅", label: "Programme des cultes" },
        { icon: "🔔", label: "Rappels automatiques" },
        { icon: "📼", label: "Rediffusions" },
      ]}
      notifyLabel="M'alerter avant le prochain culte"
    />
  );
}
