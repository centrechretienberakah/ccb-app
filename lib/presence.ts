"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Channel name partagé entre tous les onglets/utilisateurs.
export const PRESENCE_CHANNEL = "ccb:presence:online";

// ── Store partagé module-level ──────────────────────────────────────────────
// On utilise une référence stable + des listeners pour que toute consommation
// via useOnlineUsers() voie le même Set, sans avoir à manipuler le canal
// Supabase deux fois (interdit : on ne peut pas .on() après .subscribe()).
let onlineSet = new Set<string>();
const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}
function setOnline(next: Set<string>) {
  onlineSet = next;
  notify();
}

// ─────────────────────────────────────────────────────────────────────────────
// useHeartbeat
// - Persiste last_seen_at via RPC toutes les 60s
// - Track la présence sur le channel Realtime (1 instance pour toute l'app)
// - Met à jour le store onlineSet quand la présence change
// ─────────────────────────────────────────────────────────────────────────────
export function useHeartbeat() {
  useEffect(() => {
    const sb = createClient();
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function start() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || stopped) return;

      const ping = async () => {
        try { await sb.rpc("touch_last_seen"); } catch { /* RPC absent avant migration */ }
      };
      await ping();
      interval = setInterval(ping, 60_000);

      channel = sb.channel(PRESENCE_CHANNEL, { config: { presence: { key: user.id } } });
      // ATTENTION : tous les .on() doivent être enregistrés AVANT .subscribe()
      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
        const next = new Set<string>();
        for (const arr of Object.values(state)) {
          for (const p of arr) if (p.user_id) next.add(p.user_id);
        }
        setOnline(next);
      });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && channel) {
          try { await channel.track({ user_id: user.id, online_at: new Date().toISOString() }); }
          catch { /* noop */ }
        }
      });
    }

    start();
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      if (channel) {
        try { channel.unsubscribe(); } catch { /* noop */ }
      }
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// useOnlineUsers — lit le store partagé alimenté par useHeartbeat
// ─────────────────────────────────────────────────────────────────────────────
export function useOnlineUsers(): Set<string> {
  const [snap, setSnap] = useState<Set<string>>(() => new Set(onlineSet));

  useEffect(() => {
    const fn = () => setSnap(new Set(onlineSet));
    listeners.add(fn);
    fn();
    return () => { listeners.delete(fn); };
  }, []);

  return snap;
}
