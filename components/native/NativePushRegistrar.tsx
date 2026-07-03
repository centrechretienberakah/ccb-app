"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native/platform";
import { registerNativePush } from "@/lib/native/push";
import { CHANNELS } from "@/lib/native/channels";

/**
 * Branche les notifications NATIVES (FCM) quand l'app tourne dans la coquille
 * Android (Capacitor). Monté globalement, mais 100 % INERTE sur Web/PWA
 * (isNativeApp() = false) → aucun impact sur l'existant.
 *
 * - crée les canaux de notification Android (Messages, Groupes, Appels, …)
 * - enregistre le token FCM de l'appareil (→ /api/native/push-token) après login
 * - ouvre la bonne page quand on tape sur une notification (deep link via data.url)
 *
 * Le push web (VAPID) reste en place et n'est pas touché.
 */
export default function NativePushRegistrar() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // 0) RÉINITIALISATION UNIQUE des canaux : un canal est IMMUABLE une fois
        // créé. Si une version précédente en a créé un sans son / en faible
        // importance, la mise à jour ne pouvait plus le corriger (notifs muettes).
        // On les supprime UNE fois pour qu'ils soient recréés à neuf (avec son).
        try {
          if (!localStorage.getItem("ccb-notif-channels-reset-v2")) {
            for (const ch of CHANNELS) {
              try { await PushNotifications.deleteChannel({ id: ch.id }); } catch { /* noop */ }
            }
            localStorage.setItem("ccb-notif-channels-reset-v2", "1");
          }
        } catch { /* noop */ }

        // 1) Canaux Android (idempotent) — importance ≥ DEFAULT → son par défaut.
        for (const ch of CHANNELS) {
          try {
            await PushNotifications.createChannel({
              id: ch.id,
              name: ch.name,
              description: ch.description,
              importance: ch.importance,
              visibility: 1,
              vibration: ch.vibration,
            });
          } catch { /* canal déjà créé / non supporté */ }
        }

        // 2) Ouverture par tap → navigation interne (deep link)
        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const url = (action.notification?.data as { url?: string } | undefined)?.url;
          if (url && typeof url === "string") router.push(url);
        });

        // 3) Enregistrement du token, seulement si connecté
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (disposed || !user) return;

        const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "";
        await registerNativePush(async (token) => {
          await fetch("/api/native/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, platform: "android", deviceInfo: ua }),
          });
        });
      } catch { /* push natif indisponible → silencieux */ }
    })();

    return () => { disposed = true; };
  }, [router]);

  return null;
}
