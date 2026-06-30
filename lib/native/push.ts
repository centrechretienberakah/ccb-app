import { isNativeApp } from "./platform";

/**
 * PHASE 2 — PRÉPARÉ MAIS NON ACTIVÉ.
 *
 * Enregistre l'appareil pour les notifications push NATIVES (Firebase Cloud
 * Messaging) quand l'app tourne dans la coquille Android Capacitor.
 *
 * ⚠️ Ce module n'est appelé NULLE PART en Phase 1 (architecture prête, inerte).
 *    En Phase 2, on l'appellera après le login UNIQUEMENT en natif, et on
 *    enverra le token FCM à un endpoint backend (ex. /api/native/push-token)
 *    pour stocker la subscription à côté des subscriptions web-push existantes.
 *
 *    Sur web/PWA, RIEN ne change : le push VAPID/web-push actuel reste la voie.
 *    Le `@capacitor/push-notifications` est importé dynamiquement → aucun impact
 *    sur le bundle web ni sur le SSR.
 *
 * Pré-requis Phase 2 (déjà préparés côté Android, cf. GUIDE_ANDROID.md) :
 *   - android/app/google-services.json (projet Firebase)
 *   - permission POST_NOTIFICATIONS (déclarée dans le manifeste)
 *   - plugin @capacitor/push-notifications (installé)
 */
export interface NativePushResult {
  ok: boolean;
  token?: string;
  reason?: string;
}

export async function registerNativePush(
  saveToken: (token: string, platform: "android" | "ios") => Promise<void>,
): Promise<NativePushResult> {
  if (!isNativeApp()) return { ok: false, reason: "not-native" };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const { Capacitor } = await import("@capacitor/core");
    const platform = (Capacitor.getPlatform() === "ios" ? "ios" : "android") as "android" | "ios";

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return { ok: false, reason: `permission-${perm.receive}` };

    return await new Promise<NativePushResult>((resolve) => {
      let settled = false;
      const done = (r: NativePushResult) => { if (!settled) { settled = true; resolve(r); } };

      PushNotifications.addListener("registration", async (token) => {
        try {
          await saveToken(token.value, platform);
          done({ ok: true, token: token.value });
        } catch (e) {
          done({ ok: false, reason: "save: " + (e as Error).message });
        }
      });
      PushNotifications.addListener("registrationError", (err) => {
        done({ ok: false, reason: "fcm: " + JSON.stringify(err) });
      });

      void PushNotifications.register();
      // Garde-fou : ne pas rester bloqué si aucun événement n'arrive.
      setTimeout(() => done({ ok: false, reason: "timeout" }), 15000);
    });
  } catch (e) {
    return { ok: false, reason: "import: " + (e as Error).message };
  }
}
