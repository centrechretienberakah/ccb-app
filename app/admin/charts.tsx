"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLINE — courbe d'évolution compacte (timeseries)
// ─────────────────────────────────────────────────────────────────────────────
export function Sparkline({ data, color = "var(--gold)", height = 60, width = 280, fill = true }: {
  data: number[]; color?: string; height?: number; width?: number; fill?: boolean;
}) {
  if (data.length === 0) return <div style={{ height, color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>Aucune donnée</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return { x, y, v };
  });
  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const fillPath = linePath + ` L${width.toFixed(1)},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, "")})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONUT — répartition par catégorie
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_COLORS = ["var(--gold)", "var(--violet, #7c3aed)", "#22c55e", "#f472b6", "#60a5fa", "#fb923c", "#a78bfa", "#34d399"];

export function Donut({ data, size = 160, label }: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  label?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "50%" }}>Aucune donnée</div>;

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 8;
  const strokeWidth = 16;
  const inner = r - strokeWidth;
  let acc = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((slice, i) => {
          const startAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
          acc += slice.value;
          const endAngle = (acc / total) * 2 * Math.PI - Math.PI / 2;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = slice.value / total > 0.5 ? 1 : 0;
          const color = slice.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${cx} ${cy} Z`}
              fill={color}
              opacity="0.9"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={inner} fill="var(--card-bg)" />
        <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fill="var(--text-primary)" fontSize="20" fontWeight="700">{total}</text>
        {label && <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--text-muted)" fontSize="10">{label}</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, minWidth: 120 }}>
        {data.map((slice, i) => {
          const color = slice.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const pct = total > 0 ? ((slice.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-muted)" }}>{slice.label}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 600, marginLeft: "auto" }}>{slice.value} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI BAR — top N classement horizontal
// ─────────────────────────────────────────────────────────────────────────────
export function MiniBars({ data, color = "var(--gold)", maxItems = 5 }: {
  data: { label: string; value: number }[];
  color?: string;
  maxItems?: number;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
  if (sorted.length === 0) return <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "0.5rem 0" }}>Aucune donnée</div>;
  const max = Math.max(...sorted.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ flex: 1, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          <div style={{ flex: 2, height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
          </div>
          <span style={{ color: "var(--text-muted)", minWidth: 30, textAlign: "right", fontWeight: 600 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD — KPI avec delta trend
// ─────────────────────────────────────────────────────────────────────────────
export function MetricCard({ icon, label, value, delta, color = "var(--gold)" }: {
  icon: string; label: string; value: number | string;
  delta?: { value: number; label: string }; color?: string;
}) {
  const positive = delta && delta.value > 0;
  const negative = delta && delta.value < 0;
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem", borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 700, color: positive ? "#22c55e" : negative ? "#f87171" : "var(--text-muted)" }}>
            {positive && "↑"} {negative && "↓"} {Math.abs(delta.value)} {delta.label}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
