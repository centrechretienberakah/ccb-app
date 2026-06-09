"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { perfBytes, isDataSaverEnabled } from "@/lib/net/dataSaver";

/**
 * Remonte (en agrégat, par jour) les octets réseau / économisés du membre vers
 * `data_usage` via la RPC record_data_usage — alimente le tableau de bord data
 * côté admin. Envoie des DELTAS, throttlé, et de façon best-effort (silencieux
 * si la migration v62 n'est pas encore appliquée).
 */
export default function DataUsageBeacon() {
  const prev = useRef({ network: 0, cached: 0 });

  useEffect(() => {
    try { performance.setResourceTimingBufferSize?.(600); } catch { /* noop */ }
    const sb = createClient();
    let alive = true;

    const flush = async () => {
      const cur = perfBytes();
      const reset = cur.network < prev.current.network; // buffer vidé → on repart de cur
      let dNet = reset ? cur.network : cur.network - prev.current.network;
      let dCached = reset ? cur.cached : cur.cached - prev.current.cached;
      if (dNet < 0) dNet = 0;
      if (dCached < 0) dCached = 0;
      prev.current = { network: cur.network, cached: cur.cached };
      if (dNet + dCached < 24 * 1024) return; // seuil anti-spam (~24 Ko)
      try {
        await sb.rpc("record_data_usage", {
          p_network: Math.round(dNet),
          p_cached: Math.round(dCached),
          p_data_saver: isDataSaverEnabled(),
        });
      } catch { /* RPC pas encore migrée → silencieux */ }
    };

    const id = setInterval(() => { if (alive) void flush(); }, 60000);
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, []);

  return null;
}
