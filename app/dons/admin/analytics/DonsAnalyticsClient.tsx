"use client";
import Link from "next/link";
import { DONS_THEME as T, DONS_FONTS as F, getKind, formatAmount } from "@/lib/dons/theme";

export interface GlobalKpis {
  confirmed_count: number;
  total_xaf_confirmed: number;
  pending_count: number;
  total_xaf_pending: number;
  unique_donors: number;
  active_campaigns: number;
  avg_xaf_per_donation: number;
}

export interface MonthlyPoint {
  month: string;            // YYYY-MM-DD
  donations_count: number;
  total_xaf: number;
  unique_donors: number;
}

export interface KindStat {
  kind: string;
  count: number;
  total_xaf: number;
}

export interface TopDonor {
  donor_key: string;
  is_anonymous: boolean;
  donor_name: string | null;
  donations_count: number;
  total_xaf: number;
  last_donation_at: string | null;
}

export interface CampaignStat {
  campaign_id: string;
  slug: string;
  title: string;
  kind: string;
  target_amount_xaf: number;
  current_amount_xaf: number;
  progress_pct: number;
  confirmed_count: number;
  pending_count: number;
  pending_xaf: number;
}

interface Props {
  kpis: GlobalKpis;
  monthly: MonthlyPoint[];
  byKind: KindStat[];
  topDonors: TopDonor[];
  campaignStats: CampaignStat[];
  sqlReady: boolean;
}

export default function DonsAnalyticsClient({
  kpis, monthly, byKind, topDonors, campaignStats, sqlReady,
}: Props) {
  const maxMonthly = Math.max(1, ...monthly.map((m) => Number(m.total_xaf)));

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      <header style={{ padding: "24px 24px 12px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
          <Link href="/dons" style={{ color: T.textMuted, textDecoration: "none" }}>💝 Dons</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href="/dons/admin" style={{ color: T.textMuted, textDecoration: "none" }}>Admin</Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span>Analytics</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: F.title, fontSize: 28, margin: 0, fontWeight: 800, color: T.text }}>
            📊 Analytics Dons
          </h1>
          <Link href="/dons/admin" style={{
            padding: "8px 14px", background: T.card, border: `1px solid ${T.border}`,
            color: T.text, borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>← Retour à la console</Link>
        </div>
      </header>

      {!sqlReady ? (
        <div style={{
          maxWidth: 900, margin: "0 auto 18px", padding: 18,
          background: T.card, border: `1px dashed ${T.heart}`, borderRadius: 12,
          color: T.textSoft, fontSize: 14, lineHeight: 1.5,
        }}>
          ⚠️ Les vues analytics ne sont pas disponibles. Exécute{" "}
          <code style={{ background: T.surface2, padding: "1px 6px", borderRadius: 4 }}>
            supabase/dons_phase3_v34.sql
          </code>{" "}
          dans Supabase SQL Editor pour activer le dashboard.
        </div>
      ) : null}

      {/* KPI */}
      <section style={{
        maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14,
      }}>
        <Kpi icon="✅" label="Total confirmé"   value={formatAmount(kpis.total_xaf_confirmed, "XAF")} accent={T.green} />
        <Kpi icon="📦" label="Dons confirmés"   value={kpis.confirmed_count} />
        <Kpi icon="👥" label="Donateurs uniques" value={kpis.unique_donors} />
        <Kpi icon="⏳" label="En attente"       value={formatAmount(kpis.total_xaf_pending, "XAF")} accent={T.gold} sub={`${kpis.pending_count} record${kpis.pending_count > 1 ? "s" : ""}`} />
        <Kpi icon="💰" label="Don moyen"        value={formatAmount(kpis.avg_xaf_per_donation, "XAF")} />
        <Kpi icon="🎯" label="Campagnes actives" value={kpis.active_campaigns} accent={T.violet} />
      </section>

      {/* Évolution mensuelle */}
      <section style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px" }}>
        <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>📈 Évolution 12 derniers mois (XAF)</h2>
        <div style={{ padding: 18, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          {monthly.length === 0 ? (
            <p style={{ color: T.textMuted, fontSize: 13, margin: 0, textAlign: "center" }}>
              Pas encore de données.
            </p>
          ) : (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))`,
                gap: 6, height: 160, alignItems: "end",
              }}>
                {monthly.map((m) => {
                  const h = (Number(m.total_xaf) / maxMonthly) * 100;
                  return (
                    <div key={m.month} title={`${fmtMonth(m.month)} — ${formatAmount(Number(m.total_xaf), "XAF")} · ${m.donations_count} dons · ${m.unique_donors} donateurs`}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{
                        width: "100%", height: `${h}%`,
                        background: `linear-gradient(180deg, ${T.violet}, ${T.gold})`,
                        borderRadius: "4px 4px 0 0", minHeight: m.donations_count > 0 ? 4 : 0,
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))`, gap: 6, marginTop: 8 }}>
                {monthly.map((m) => (
                  <div key={m.month} style={{ fontSize: 10, color: T.textMuted, textAlign: "center" }}>
                    {fmtMonthShort(m.month)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18,
      }} className="dons-analytics-grid">
        {/* By kind */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🎯 Répartition par type</h2>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            {byKind.length === 0 ? (
              <Empty>Aucun don confirmé.</Empty>
            ) : byKind.map((k) => {
              const kd = getKind(k.kind);
              const max = Math.max(1, ...byKind.map((x) => Number(x.total_xaf)));
              const pct = Math.round((Number(k.total_xaf) / max) * 100);
              return (
                <div key={k.kind} style={{
                  position: "relative", padding: "12px 14px", borderBottom: `1px solid ${T.border}`,
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${pct}%`,
                    background: `${kd.color}22`,
                  }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {kd.emoji} {kd.label} <span style={{ color: T.textMuted, fontWeight: 500, fontSize: 11.5 }}>({k.count})</span>
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                      {formatAmount(Number(k.total_xaf), "XAF")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top donors */}
        <section>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🏆 Top donateurs (top 15)</h2>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            {topDonors.length === 0 ? (
              <Empty>Aucun don confirmé.</Empty>
            ) : topDonors.map((d, i) => {
              const max = topDonors[0]?.total_xaf ? Number(topDonors[0].total_xaf) : 1;
              const pct = Math.round((Number(d.total_xaf) / max) * 100);
              const label = d.is_anonymous ? "Anonyme" : (d.donor_name ?? `Donateur ${d.donor_key.slice(0, 6)}`);
              return (
                <div key={d.donor_key} style={{
                  position: "relative", padding: "12px 14px", borderBottom: `1px solid ${T.border}`, overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${pct}%`,
                    background: i < 3 ? `${T.gold}22` : `${T.violet}22`,
                  }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 999,
                        background: i < 3 ? T.gold : "rgba(0,0,0,0.06)",
                        color: i < 3 ? "#000" : T.text,
                        fontWeight: 800, fontSize: 11,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{label}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>
                          {d.donations_count} don{d.donations_count > 1 ? "s" : ""}
                          {d.last_donation_at ? <> · dernier {new Date(d.last_donation_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</> : null}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                      {formatAmount(Number(d.total_xaf), "XAF")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Campaign conversion */}
        <section style={{ gridColumn: "1 / -1" }}>
          <h2 style={{ fontFamily: F.title, fontSize: 18, margin: "0 0 12px" }}>🎯 Conversion par campagne</h2>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
            {campaignStats.length === 0 ? (
              <Empty>Aucune campagne.</Empty>
            ) : campaignStats.map((c) => {
              const kd = getKind(c.kind);
              return (
                <Link key={c.campaign_id} href={`/dons/admin`} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                  padding: "12px 14px", borderBottom: `1px solid ${T.border}`,
                  textDecoration: "none", color: T.text,
                }}>
                  <span style={{ fontSize: 22 }}>{kd.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>
                      {c.confirmed_count} confirmé{c.confirmed_count > 1 ? "s" : ""}
                      {c.pending_count > 0 ? <span style={{ color: T.gold, fontWeight: 600 }}> · {c.pending_count} en attente ({formatAmount(Number(c.pending_xaf), "XAF")})</span> : null}
                    </div>
                    <div style={{
                      marginTop: 6, height: 6, background: T.surface2, borderRadius: 999, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", width: `${c.progress_pct}%`,
                        background: `linear-gradient(90deg, ${kd.color}, ${T.gold})`,
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                      {formatAmount(Number(c.current_amount_xaf), "XAF")}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>sur {formatAmount(Number(c.target_amount_xaf), "XAF")}</div>
                    <div style={{ fontSize: 11.5, color: T.gold, fontWeight: 800, marginTop: 2 }}>{c.progress_pct}%</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div style={{ height: 40 }} />
      <style jsx global>{`
        @media (max-width: 800px) {
          .dons-analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ icon, label, value, accent, sub }: {
  icon: string; label: string; value: string | number; accent?: string; sub?: string;
}) {
  return (
    <div style={{
      padding: 16, background: T.card,
      border: `1px solid ${accent ?? T.border}`,
      borderRadius: 12, boxShadow: T.shadowSoft,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, fontSize: 11.5 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: F.title, fontSize: 22, fontWeight: 800,
        color: accent ?? T.text, fontVariantNumeric: "tabular-nums",
      }}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</div>
      {sub ? <div style={{ fontSize: 11, color: T.textMuted }}>{sub}</div> : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "24px 14px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      {children}
    </div>
  );
}

function fmtMonth(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function fmtMonthShort(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { month: "short" });
}
