import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

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
  keywords: ["église", "chrétien", "berakah", "disciple", "foi", "Cameroun", "ministère", "CCB"],
  authors: [{ name: "Centre Chrétien Berakah" }],
  creator: "Centre Chrétien Berakah",
  metadataBase: new URL("https://centrechretienberakah.com"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://centrechretienberakah.com",
    siteName: "Centre Chrétien Berakah",
    title: "Centre Chrétien Berakah — Former · Transformer · Bénir",
    description: "Former des disciples, Transformer des vies, Manifester la bénédiction.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Centre Chrétien Berakah" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Centre Chrétien Berakah",
    description: "Former des disciples, Transformer des vies.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

// Script injecté avant le rendu pour éviter le flash de mauvais thème
const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('ccb-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${cinzel.variable} ${montserrat.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash : applique le bon thème AVANT le premier paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased font-montserrat">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
