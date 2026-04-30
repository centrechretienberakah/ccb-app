import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Centre Chrétien Berakah",
    template: "%s | Centre Chrétien Berakah",
  },
  description:
    "Former des disciples, Transformer des vies, Manifester la bénédiction. Rejoignez la famille CCB pour grandir spirituellement.",
  keywords: [
    "église",
    "chrétien",
    "berakah",
    "disciple",
    "foi",
    "Cameroun",
    "ministère",
    "CCB",
  ],
  authors: [{ name: "Centre Chrétien Berakah" }],
  creator: "Centre Chrétien Berakah",
  metadataBase: new URL("https://centrechretienberakah.com"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://centrechretienberakah.com",
    siteName: "Centre Chrétien Berakah",
    title: "Centre Chrétien Berakah — Former · Transformer · Bénir",
    description:
      "Former des disciples, Transformer des vies, Manifester la bénédiction.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Centre Chrétien Berakah",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Centre Chrétien Berakah",
    description: "Former des disciples, Transformer des vies.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${cinzel.variable} ${montserrat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased font-montserrat">
        {children}
      </body>
    </html>
  );
}
