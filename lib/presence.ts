"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Channel name shared between heartbeat emitters and admin watcher.
export const PRESENCE_CHANNEL = "ccb:presence:online";

// ─────────────────────────────────────────────────────────────────────────────
// useHeartbeat — appelle touch_last_seen() toutes les 60s + maintient la
// présence Realtime tant que la page est ouverte.
// À appeler une seule fois (dans AppShell) pour tout utilisateur connecté.
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

      // RPC pour persister last_seen_at
      const ping = async () => {
        try { await sb.rpc("touch_last_seen"); } catch { /* noop */ }
      };
      await ping();
      interval = setInterval(ping, 60_000);

      // Realtime presence
      channel = sb.channel(PRESENCE_CHANNEL, { config: { presence: { key: user.id } } });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel?.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });
    }

    start();
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      if (channel) channel.unsubscribe();
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// useOnlineUsers — pour le panel admin : retourne un Set des user_id en ligne
// ─────────────────────────────────────────────────────────────────────────────
export function useOnlineUsers(): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel(PRESENCE_CHANNEL, { config: { presence: { key: "admin-watcher" } } });

    const refresh = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      for (const arr of Object.values(state)) {
        for (const p of arr) if (p.user_id) ids.add(p.user_id);
      }
      setOnline(ids);
    };

    channel
      .on("presence", { event: "sync" }, refresh)
      .on("presence", { event: "join" }, refresh)
      .on("presence", { event: "leave" }, refresh)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  return online;
}
