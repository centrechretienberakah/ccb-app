"use client";

import { Sparkline, Donut, MiniBars, MetricCard } from "./charts";

export interface AnalyticsData {
  // Time series sur 30 derniers jours (1 valeur par jour, du plus ancien au plus récent)
  membersPerDay: number[];
  postsPerDay: number[];
  prayersPerDay: number[];
  signInsPerDay: number[];
  // Répartitions
  prayersByCategory: { label: string; value: number }[];
  postsByType: { label: string; value: number }[];
  membersByCountry: { label: string; value: number }[];
  // Tops
  topSermons: { label: string; value: number }[];
  topMembers: { label: string; value: number }[];
  // KPIs avec delta
  engagement: {
    activeNow: number;       // online presence
    activeWeek: number;      // members with last_sign_in_at < 7d
    activeMonth: number;     // members with last_sign_in_at < 30d
    totalMembers: number;
    newMembers7d: number;
    newMembers30d: number;
  };
}

const card: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "1.25rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-muted)",
  margin: "0 0 0.5rem",
};

export default function AnalyticsTab({ data, onlineCount }: { data: AnalyticsData; onlineCount: number }) {
  const engagementRate = data.engagement.totalMembers > 0
    ? Math.round((data.engagement.activeWeek / data.engagement.totalMembers) * 100)
    : 0;

  const last7Sum = (arr: number[]) => arr.slice(-7).reduce((a, b) => a + b, 0);
  const prev7Sum = (arr: number[]) => arr.slice(-14, -7).reduce((a, b) => a + b, 0);
  const delta7 = (arr: number[]) => last7Sum(arr) - prev7Sum(arr);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ─── KPIs principaux ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        <MetricCard
          icon="🟢"
          label="En ligne maintenant"
          value={onlineCount}
          color="#22c55e"
        />
        <MetricCard
          icon="⚡"
          label="Actifs (7 derniers jours)"
          value={data.engagement.activeWeek}
          delta={{ value: data.engagement.activeWeek - data.engagement.activeMonth + data.engagement.activeWeek, label: "vs mois" }}
          color="var(--gold)"
        />
        <MetricCard
          icon="📈"
          label="Taux engagement"
          value={engagementRate + "%"}
          color="var(--violet-light, #a78bfa)"
        />
        <MetricCard
          icon="✨"
          label="Nouveaux (7j)"
          value={data.engagement.newMembers7d}
          delta={{ value: delta7(data.membersPerDay), label: "vs 7j préc." }}
          color="#60a5fa"
        />
        <MetricCard
          icon="📝"
          label="Publications (7j)"
          value={last7Sum(data.postsPerDay)}
          delta={{ value: delta7(data.postsPerDay), label: "vs 7j préc." }}
          color="#f472b6"
        />
        <MetricCard
          icon="🙏"
          label="Prières (7j)"
          value={last7Sum(data.prayersPerDay)}
          delta={{ value: delta7(data.prayersPerDay), label: "vs 7j préc." }}
          color="#fb923c"
        />
      </div>

      {/* ─── Évolution sur 30 jours ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
        <div style={card}>
          <p style={sectionTitle}>👥 Nouveaux membres (30j)</p>
          <Sparkline data={data.membersPerDay} color="var(--gold)" />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Total : {data.membersPerDay.reduce((a, b) => a + b, 0)} sur 30 jours
          </p>
        </div>
        <div style={card}>
          <p style={sectionTitle}>📝 Publications (30j)</p>
          <Sparkline data={data.postsPerDay} color="#f472b6" />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Total : {data.postsPerDay.reduce((a, b) => a + b, 0)} sur 30 jours
          </p>
        </div>
        <div style={card}>
          <p style={sectionTitle}>🙏 Prières (30j)</p>
          <Sparkline data={data.prayersPerDay} color="#fb923c" />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Total : {data.prayersPerDay.reduce((a, b) => a + b, 0)} sur 30 jours
          </p>
        </div>
        <div style={card}>
          <p style={sectionTitle}>🔐 Connexions (30j)</p>
          <Sparkline data={data.signInsPerDay} color="#60a5fa" />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Total : {data.signInsPerDay.reduce((a, b) => a + b, 0)} sur 30 jours
          </p>
        </div>
      </div>

      {/* ─── Répartitions (Donuts) ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "0.75rem" }}>
        <div style={card}>
          <p style={sectionTitle}>🙏 Prières par catégorie</p>
          <Donut data={data.prayersByCategory} label="prières" />
        </div>
        <div style={card}>
          <p style={sectionTitle}>📝 Publications par type</p>
          <Donut data={data.postsByType} label="posts" />
        </div>
        <div style={card}>
          <p style={sectionTitle}>🌍 Membres par pays</p>
          <Donut data={data.membersByCountry} label="membres" />
        </div>
      </div>

      {/* ─── Tops ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
        <div style={card}>
          <p style={sectionTitle}>🎙️ Top sermons (vues)</p>
          <MiniBars data={data.topSermons} color="var(--gold)" />
        </div>
        <div style={card}>
          <p style={sectionTitle}>💬 Membres les plus actifs</p>
          <MiniBars data={data.topMembers} color="var(--violet-light, #a78bfa)" />
        </div>
      </div>

      {/* ─── Note ─── */}
      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: 0, fontStyle: "italic" }}>
        Les statistiques sont calculées au chargement de la page. Recharge pour mettre à jour.
      </p>
    </div>
  );
}
