import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

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
    default: "Centre Chretien Berakah",
    template: "%s | Centre Chretien Berakah",
  },
  description:
    "Former des disciples, Transformer des vies, Manifester la benediction.",
  keywords: ["eglise", "chretien", "berakah", "disciple", "foi", "Cameroun"],
  authors: [{ name: "Centre Chretien Berakah" }],
  creator: "Centre Chretien Berakah",
  metadataBase: new URL("https://centrechretienberakah.com"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://centrechretienberakah.com",
    siteName: "Centre Chretien Berakah",
    title: "Centre Chretien Berakah",
    description: "Former des disciples, Transformer des vies.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "CCB" }],
  },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

const themeScript = `(function(){try{var s=localStorage.getItem('ccb-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s||(d?'dark':'light'));}catch(e){}})();`;

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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
