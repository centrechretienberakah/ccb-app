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

/**
 * Souscrit explicitement un user au push. Robuste : prend le userId en
 * paramètre (pour fonctionner juste après signUp, avant que la session
 * Supabase ne soit propagée). Renvoie un diagnostic pour debugger facilement.
 *
 * Étapes :
 *   1) vérifie support navigateur
 *   2) demande la permission (idempotent si déjà accordée)
 *   3) attend que le SW soit prêt (timeout 10s)
 *   4) récupère / crée la subscription côté navigateur
 *   5) upsert dans push_subscriptions (enabled = true)
 */
export async function subscribeUserToPush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { ok: false, reason: "no-vapid-key" };

  try {
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: `permission-${permission}` };

    // Attend que le SW soit ready (timeout 10s)
    let reg: ServiceWorkerRegistration;
    try {
      reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) =>
          setTimeout(() => reject(new Error("sw-timeout")), 10_000),
        ),
      ]);
    } catch {
      return { ok: false, reason: "sw-not-ready" };
    }

    // Récupère ou crée la subscription côté navigateur
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyArray = urlBase64ToUint8Array(vapidPublicKey);
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: keyArray as any,
        });
      } catch (e) {
        return { ok: false, reason: "subscribe-error: " + (e as Error).message };
      }
    }

    // Persist en DB avec userId explicite (pas de getUser())
    const supabase = createClient();
    const subJSON = sub.toJSON();
    const { error: dbErr } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: subJSON.keys?.p256dh ?? "",
      auth: subJSON.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 200),
      enabled: true,
    }, { onConflict: "endpoint" });

    if (dbErr) return { ok: false, reason: "db: " + dbErr.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "unknown: " + (e as Error).message };
  }
}

/**
 * Filet de sécurité : à chaque chargement de l'app, vérifie si l'user
 * a une subscription browser-side mais PAS de ligne enabled=true en DB,
 * et la (re)synchronise. Couvre le cas où subscribeUserToPush() a planté
 * juste après signUp (session pas encore propagée).
 *
 * Appelé sans bloquer depuis AppShell / RegisterSW.
 */
export async function rescuePushSubscription(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) =>
        setTimeout(() => reject(new Error("sw-timeout")), 5_000),
      ),
    ]);
    const browserSub = await reg.pushManager.getSubscription();
    if (!browserSub) return; // pas de sub navigateur → rien à secourir

    // L'user est-il connecté maintenant ?
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // pas connecté, on ne peut pas écrire

    // Existe-t-il déjà une ligne enabled=true pour cet endpoint + user ?
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, enabled")
      .eq("endpoint", browserSub.endpoint)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && (existing as { enabled: boolean }).enabled) return; // déjà OK

    // Upsert avec enabled = true (rescue)
    const subJSON = browserSub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: browserSub.endpoint,
      p256dh: subJSON.keys?.p256dh ?? "",
      auth: subJSON.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 200),
      enabled: true,
    }, { onConflict: "endpoint" });
  } catch { /* silent */ }
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
