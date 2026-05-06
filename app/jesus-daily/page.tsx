import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Jesus Daily" };

export default function JesusDailyPage() {
  return (
    <ComingSoon
      emoji="⚡"
      title="Jesus Daily"
      subtitle="Une parole prophétique chaque jour"
      description="Courtes vidéos percutantes de 45 secondes pour commencer chaque journée dans la puissance de la Parole."
      accentColor="var(--gold)"
      accentGlow="rgba(212,175,55,0.2)"
      features={[
        { icon: "⚡", label: "Vidéos 45 secondes" },
        { icon: "🔥", label: "Parole prophétique" },
        { icon: "📱", label: "Format vertical" },
        { icon: "🔔", label: "Notification quotidienne" },
        { icon: "📤", label: "Partage facile" },
        { icon: "📅", label: "Archives par date" },
      ]}
      notifyLabel="Recevoir Jesus Daily dès le lancement"
    />
  );
}
