import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import RegisterSW from "@/components/pwa/RegisterSW";
import NativePushRegistrar from "@/components/native/NativePushRegistrar";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";

  // Thème rendu CÔTÉ SERVEUR depuis le cookie → le HTML initial est déjà au
  // bon thème : aucune bascule clair/sombre au rafraîchissement (pas d'écart
  // d'hydratation). Défaut « dark » (= :root) si aucun cookie.
  const theme = (await cookies()).get("ccb-theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="fr"
      data-theme={theme}
      style={{ colorScheme: theme }}
      className={`${cinzel.variable} ${montserrat.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Filet de sécurité avant le 1er rendu : aligne data-theme sur la
            préférence de l'appareil (localStorage > cookie > système) et
            (re)synchronise le cookie pour que le SSR soit correct au prochain
            chargement. Le serveur a déjà posé data-theme depuis le cookie. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('ccb-theme');if(t!=='light'&&t!=='dark'){var ck=null,p=document.cookie.split('; ');for(var i=0;i<p.length;i++){if(p[i].indexOf('ccb-theme=')===0)ck=p[i].slice(10);}t=ck||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;document.cookie='ccb-theme='+t+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}})();",
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
        <NativePushRegistrar />
      </body>
    </html>
  );
}