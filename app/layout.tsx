import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import RegisterSW from "@/components/pwa/RegisterSW";
import BuildCheck from "@/components/pwa/BuildCheck";
import ChunkErrorReload from "@/components/pwa/ChunkErrorReload";
import { CallProvider } from "@/lib/meet/CallContext";
import PersistentCallHost from "@/components/meet/PersistentCallHost";
import IncomingCallHost from "@/components/meet/IncomingCallHost";

// Typographie du flyer « Semblable à Christ » : Cinzel (titres, serif romain
// élégant) + Montserrat (corps). Les variables CSS gardent leurs noms pour que
// tous les composants en héritent sans changement.
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";

  return (
    <html
      lang="fr"
      className={`${cinzel.variable} ${montserrat.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme.js" suppressHydrationWarning />
      </head>
      {/* Ajout du suppressHydrationWarning ici pour blinder le rendu */}
      <body className="min-h-full bg-background text-foreground antialiased" suppressHydrationWarning>
        <BuildCheck buildId={buildId} />
        <ChunkErrorReload />
        <CallProvider>
          <AppShell>{children}</AppShell>
          <PersistentCallHost />
          <IncomingCallHost />
        </CallProvider>
        <RegisterSW />
      </body>
    </html>
  );
}