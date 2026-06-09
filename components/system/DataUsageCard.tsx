"use client";

import { useEffect, useState, useCallback } from "react";
import { isDataSaverEnabled } from "@/lib/net/dataSaver";

/**
 * Tableau de bord data (personnel) — mesure RÉELLE via la Performance API.
 * `transferSize` = octets réellement passés par le réseau (0 si servi depuis le
 * cache → prouve l'économie). Aucune donnée envoyée à un serveur, 100 % local.
 */

function fmtBytes(b: number): string {
  if (b <= 0) return "0 Ko";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " Ko";
  return (b / (1024 * 1024)).toFixed(2) + " Mo";
}

interface Stats {
  network: number;      // octets téléchargés (réseau)
  cachedBytes: number;  // octets servis depuis le cache (économisés)
  cachedCount: number;  // nb de ressources servies du cache
  resCount: number;     // nb total de ressources
}

function collect(): Stats {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return { network: 0, cachedBytes: 0, cachedCount: 0, resCount: 0 };
  }
  const entries = [
    ...(performance.getEntriesByType("resource") as PerformanceResourceTiming[]),
    ...(performance.getEntriesByType("navigation") as PerformanceResourceTiming[]),
  ];
  let network = 0, cachedBytes = 0, cachedCount = 0;
  for (const e of entries) {
    const transfer = e.transferSize || 0;
    const decoded = e.decodedBodySize || 0;
    network += transfer;
    if (transfer === 0 && decoded > 0) { cachedBytes += decoded; cachedCount++; }
  }
  return { network, cachedBytes, cachedCount, resCount: entries.length };
}

export default function DataUsageCard() {
  const [stats, setStats] = useState<Stats>({ network: 0, cachedBytes: 0, cachedCount: 0, resCount: 0 });
  const [saver, setSaver] = useState(true);

  const refresh = useCallback(() => {
    setStats(collect());
    setSaver(isDataSaverEnabled());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const cell = (label: string, value: string, color: string) => (
    <div style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ height: 1, background: "var(--border)", margin: "0 0 14px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>📊 Données de cette session</div>
        <button onClick={refresh} style={{ background: "var(--violet-50)", color: "var(--violet)", border: "1px solid var(--violet-pale)", borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
          ↻ Rafraîchir
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {cell("Réseau", fmtBytes(stats.network), "var(--violet)")}
        {cell("Économisé (cache)", fmtBytes(stats.cachedBytes), "var(--success)")}
        {cell("Du cache", String(stats.cachedCount), "var(--gold-dark)")}
      </div>
      <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {saver
          ? "✅ Mode Économie de données actif. "
          : "⚠️ Mode Économie de données désactivé. "}
        Mesure réelle des ressources chargées sur cet appareil ; les contenus servis depuis le cache ne consomment pas vos données.
      </div>
    </div>
  );
}
