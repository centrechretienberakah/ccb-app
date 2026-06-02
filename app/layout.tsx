import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import RegisterSW from "@/components/pwa/RegisterSW";
import BuildCheck from "@/components/pwa/BuildCheck";
import { CallProvider } from "@/lib/meet/CallContext";
import PersistentCallHost from "@/components/meet/PersistentCallHost";

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
  description: "Former des disciples, Transformer des vies, Manifester la benediction.",
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CCB",
  },
  formatDetection: { telephone: false },
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CCB" />
        <meta name="theme-color" content="#5a2ca0" />
        <meta name="msapplication-TileColor" content="#0f0a1e" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <BuildCheck />
        <CallProvider>
          <AppShell>{children}</AppShell>
          {/* Reste mounté sur TOUTES les pages pendant un appel actif :
              full screen quand on est sur /meeting, mini-player ailleurs.
              Pas de déconnexion en navigant. */}
          <PersistentCallHost />
        </CallProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
