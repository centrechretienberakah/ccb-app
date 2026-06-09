"use client";

import { useEffect, useState } from "react";

interface UsageData {
  ready: boolean;
  totals: { network: number; cached: number };
  last7: { network: number; cached: number };
  today: { network: number; cached: number };
  adoption: { total: number; saverOn: number };
  series: Array<{ day: string; network: number; cached: number }>;
  top: Array<{ id: string; name: string; network: number; cached: number }>;
  error?: string;
}

function fmt(b: number): string {
  if (!b || b <= 0) return "0 Ko";
  if (b < 1024 * 1024) return Math.round(b / 1024) + " Ko";
  if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " Mo";
  return (b / (1024 * 1024 * 1024)).toFixed(2) + " Go";
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };

export default function DataAdminTab() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/data-usage");
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) setErr(body.error || "Erreur");
        else setData(body);
      } catch {
        if (alive) setErr("Réseau indisponible");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>Chargement des statistiques data…</div>;
  if (err) return <div style={{ ...card, textAlign: "center", color: "#f87171", padding: "3rem" }}>❌ {err}</div>;
  if (!data) return null;

  const savingsPct = data.totals.network + data.totals.cached > 0
    ? Math.round((data.totals.cached / (data.totals.network + data.totals.cached)) * 100) : 0;
  const adoptionPct = data.adoption.total > 0
    ? Math.round((data.adoption.saverOn / data.adoption.total) * 100) : 0;
  const maxDay = Math.max(1, ...data.series.map((s) => s.network + s.cached));
  const maxTop = Math.max(1, ...data.top.map((t) => t.network));

  const kpi = (label: string, value: string, sub: string, accent: string) => (
    <div style={{ ...card, borderTop: `3px solid ${accent}`, textAlign: "center" }}>
      <div style={{ fontSize: "1.7rem", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {!data.ready && (
        <div style={{ ...card, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", color: "#d97706", fontSize: "0.85rem" }}>
          ⚠️ La collecte n&apos;est pas encore active. Exécutez la migration <strong>data_usage_v62.sql</strong> dans Supabase ; les données apparaîtront au fil de la navigation des membres.
        </div>
      )}

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        {kpi("Réseau (aujourd'hui)", fmt(data.today.network), `cache : ${fmt(data.today.cached)}`, "var(--violet, #7c3aed)")}
        {kpi("Réseau (7 jours)", fmt(data.last7.network), `cache : ${fmt(data.last7.cached)}`, "#38bdf8")}
        {kpi("Réseau (30 jours)", fmt(data.totals.network), `${data.adoption.total} membre(s)`, "var(--gold)")}
        {kpi("Économisé (cache)", fmt(data.totals.cached), `${savingsPct}% du trafic`, "#34d399")}
        {kpi("Mode Éco activé", `${adoptionPct}%`, `${data.adoption.saverOn}/${data.adoption.total} membres`, "#f472b6")}
      </div>

      {/* Graphe 14 jours */}
      <div style={card}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          Consommation — 14 derniers jours
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150 }}>
          {data.series.map((s) => {
            const total = s.network + s.cached;
            const h = Math.round((total / maxDay) * 130);
            const netH = total > 0 ? Math.round((s.network / total) * h) : 0;
            const d = new Date(s.day + "T00:00:00");
            return (
              <div key={s.day} title={`${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · réseau ${fmt(s.network)} · cache ${fmt(s.cached)}`}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", maxWidth: 26, height: Math.max(h, 2), borderRadius: 5, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "var(--surface)" }}>
                  <div style={{ height: Math.max(h - netH, 0), background: "#34d399" }} title="cache" />
                  <div style={{ height: netH, background: "var(--violet, #7c3aed)" }} title="réseau" />
                </div>
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.85rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--violet, #7c3aed)", marginRight: 5 }} />Réseau</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#34d399", marginRight: 5 }} />Cache (économisé)</span>
        </div>
      </div>

      {/* Top consommateurs */}
      <div style={card}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          Top consommateurs (30 jours)
        </p>
        {data.top.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "1.5rem", fontSize: "0.85rem" }}>Pas encore de données.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {data.top.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", width: 18, textAlign: "right" }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--violet, #7c3aed)", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{fmt(t.network)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--surface)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((t.network / maxTop) * 100)}%`, height: "100%", background: "var(--violet, #7c3aed)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
        Mesure réelle (Performance API) remontée par l&apos;app des membres. Le cache (vert) représente les octets économisés grâce à l&apos;offline-first et au Mode Éco.
      </p>
    </div>
  );
}
