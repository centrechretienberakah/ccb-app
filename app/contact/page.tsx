import { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Contact CCB" };
export default function ContactPage() {
  return (
    <ComingSoon
      emoji="📬"
      title="Nous Contacter"
      subtitle="On est là pour vous"
      description="Posez vos questions, demandez des informations sur le ministère ou prenez contact avec l'équipe du Centre Chrétien Berakah."
      accentColor="#059669"
      accentGlow="rgba(5,150,105,0.2)"
      features={[
        { icon: "📝", label: "Formulaire de contact" },
        { icon: "📍", label: "Localisation & Maps" },
        { icon: "📞", label: "Numéro direct" },
        { icon: "📧", label: "Email" },
        { icon: "🕐", label: "Heures d'ouverture" },
        { icon: "💬", label: "WhatsApp" },
      ]}
      notifyLabel="Envoyer un message"
    />
  );
}
