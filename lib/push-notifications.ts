"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Helper : convert base64 URL-safe en Uint8Array (format attendu par PushManager)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushState = "loading" | "unsupported" | "denied" | "default" | "subscribed";

export interface PushHook {
  state: PushState;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  error: string | null;
}

// Hook principal : gère l'état du push notification pour le user courant
export function usePushNotifications(): PushHook {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (mounted) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (mounted) setState("denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!mounted) return;
        setState(existing ? "subscribed" : Notification.permission === "default" ? "default" : "default");
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : String(e));
          setState("default");
        }
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const subscribe = async () => {
    setError(null);
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Notifications push non supportées sur ce navigateur.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError("VAPID public key non configurée (NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante).");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // TS strict mode tique sur ArrayBuffer vs SharedArrayBuffer dans le type
        // BufferSource ; la conversion runtime est valide pour PushManager.
        const keyArray = urlBase64ToUint8Array(vapidPublicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: keyArray as any,
        });
      }

      // Persist en DB
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Vous devez être connecté pour activer les notifications.");
        return;
      }

      const subJSON = sub.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: subJSON.keys?.p256dh ?? "",
        auth: subJSON.keys?.auth ?? "",
        user_agent: navigator.userAgent.slice(0, 200),
        enabled: true,
      }, { onConflict: "endpoint" });

      setState("subscribed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const unsubscribe = async () => {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
      setState("default");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return { state, subscribe, unsubscribe, error };
}
