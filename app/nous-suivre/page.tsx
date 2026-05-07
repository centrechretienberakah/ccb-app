import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Nous Suivre — CCB" };
export default function NousSuivrePage() {
  return (
    <ComingSoon
      emoji="📡"
      title="Nous Suivre"
      subtitle="Restez connectés"
      description="Suivez le Centre Chrétien Berakah sur toutes les plateformes pour ne manquer aucun message, aucune mise en ligne, aucun live."
      accentColor="#0ea5e9"
      accentGlow="rgba(14,165,233,0.2)"
      features={[
        { icon: "▶️", label: "YouTube" },
        { icon: "📘", label: "Facebook" },
        { icon: "📸", label: "Instagram" },
        { icon: "🎵", label: "TikTok" },
        { icon: "💬", label: "WhatsApp & Telegram" },
        { icon: "📧", label: "Newsletter Mailchimp" },
      ]}
      notifyLabel="Nous suivre partout"
    />
  );
}
