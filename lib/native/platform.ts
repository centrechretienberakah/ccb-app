import { Capacitor } from "@capacitor/core";

/**
 * Détection de l'environnement d'exécution.
 *
 * Permet au code web existant de savoir s'il tourne DANS l'app native Android
 * (coquille Capacitor) ou en web/PWA. Sûr côté serveur (SSR) : renvoie "web".
 *
 * Usage Phase 2 : basculer du push web (VAPID) vers le push natif (FCM)
 * uniquement quand isNativeApp() est vrai — sans toucher au reste du code.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getNativePlatform(): "android" | "ios" | "web" {
  try {
    return Capacitor.getPlatform() as "android" | "ios" | "web";
  } catch {
    return "web";
  }
}
