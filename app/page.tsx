import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "Centre Chrétien Berakah — Former des disciples, transformer des vies",
  description:
    "Une communauté chrétienne moderne dédiée à la croissance spirituelle, au discipulat, à la formation et à l'impact du Royaume de Dieu. Méditations quotidiennes, Bible, Jesus Daily TV, communauté, formations et bien plus.",
  keywords: [
    "Centre Chrétien Berakah", "CCB", "église", "chrétien", "discipulat",
    "méditation quotidienne", "Bible", "Jesus Daily TV", "Institut Biblique Berakah",
    "Bootcamp CCB", "communauté chrétienne", "Cameroun", "foi",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "Centre Chrétien Berakah — Former, Transformer, Bénir",
    description:
      "Rejoignez une plateforme chrétienne premium : méditations, Bible, communauté, formations, Web TV et événements.",
    siteName: "Centre Chrétien Berakah",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Centre Chrétien Berakah" }],
  },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingClient />;
}
