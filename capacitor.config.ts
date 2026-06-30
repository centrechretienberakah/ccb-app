import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration Capacitor — CCB / « Famille Berakah ».
 *
 * STRATÉGIE : l'app Next.js est rendue côté serveur (SSR, routes /api, cookies,
 * Supabase, LiveKit). Un export statique casserait l'app. On utilise donc le
 * mode « server.url » : la WebView native charge directement le site de PRODUCTION.
 * Conséquence : 100 % du code Next.js/PWA est réutilisé, l'app web et la PWA
 * restent intactes, et on peut ajouter les plugins natifs (push/FCM, appels…)
 * sans toucher à l'architecture (cf. Phase 2).
 *
 * ⚠️ PROD_URL doit pointer sur le domaine réellement déployé (HTTPS valide).
 *    Pour tester en local on peut temporairement mettre l'IP du PC (http) +
 *    cleartext: true — voir GUIDE_ANDROID.md.
 */
const PROD_URL = "https://centrechretienberakah.com";

const config: CapacitorConfig = {
  // Identifiant de package Android — PERMANENT une fois publié sur le Play Store.
  appId: "com.centrechretienberakah.app",
  // Nom affiché sous l'icône + au Play Store.
  appName: "Famille Berakah",
  // Dossier web embarqué (page de secours/chargement). Le contenu réel vient de server.url.
  webDir: "capacitor-www",
  // Couleur derrière la WebView pendant le chargement (violet royal CCB).
  backgroundColor: "#5A2CA0",

  server: {
    url: PROD_URL,
    cleartext: false,        // HTTPS uniquement en production
    androidScheme: "https",
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: "#5A2CA0",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#D4AF37",
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#5A2CA0",
    },
    // Préparation Phase 2 (push natif FCM) — l'enregistrement effectif est
    // ajouté en Phase 2 ; la config est déjà en place.
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
