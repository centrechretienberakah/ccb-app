"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  type DonationRecord,
  getKind,
  formatAmount,
  PAYMENT_MODES,
} from "@/lib/dons/theme";

interface CampaignLite { id: string; slug: string; title: string; }

interface Props {
  records: DonationRecord[];
  campaigns: CampaignLite[];
}

type FilterStatus = "all" | "pending" | "confirmed" | "cancelled";

export default function MesDonsClient({ records: initial, campaigns }: Props) {
  const [records, setRecords] = useState<DonationRecord[]>(initial);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const campaignsById = useMemo(() => {
    const m = new Map<string, CampaignLite>();
    campaigns.forEach((c) => m.set(c.id, c));
    return m;
  }, [campaigns]);

  const filtered = useMemo(() => {
    if (filter === "all") return records;
    return records.filter((r) => r.status === filter);
  }, [records, filter]);

  // KPIs
  const totalConfirmed = records
    .filter((r) => r.status === "confirmed")
    .reduce((acc, r) => acc + r.amount_xaf, 0);
  const totalPending = records
    .filter((r) => r.status === "pending")
    .reduce((acc, r) => acc + r.amount_xaf, 0);
  const confirmedCount = records.filter((r) => r.status === "confirmed").length;

  // Breakdown par année
  const byYear = useMemo(() => {
    const m = new Map<number, { count: number; total_xaf: number }>();
    records.filter((r) => r.status === "confirmed").forEach((r) => {
      const y = new Date(r.paid_at ?? r.confirmed_at ?? r.created_at).getFullYear();
      const cur = m.get(y) ?? { count: 0, total_xaf: 0 };
      cur.count += 1;
      cur.total_xaf += r.amount_xaf;
      m.set(y, cur);
    });
    return [...m.entries()].sort(([a], [b]) => b - a);
  }, [records]);

  // Breakdown par type
  const byKind = useMemo(() => {
    const m = new Map<string, number>();
    records.filter((r) => r.status === "confirmed").forEach((r) => {
      m.set(r.kind, (m.get(r.kind) ?? 0) + r.amount_xaf);
    });
    return [...m.entries()].sort(([, a], [, b]) => b - a);
  }, [records]);

  async function cancelPending(r: DonationRecord) {
    if (!confirm("Annuler cette intention de don ?")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("donations_records")
      .update({ status: "cancelled" })
      .eq("id", r.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setRecords((arr) => arr.map((x) => x.id === r.id ? { ...x, status: "cancelled" } : x));
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* Hero */}
      <div style={{
        padding: "44px 24px 24px",
        background: `linear-gradient(135deg, ${T.violetDark} 0%, ${T.violet} 65%, ${T.goldDark} 100%)`,
        color: "#fff",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Link href="/dons" style={{ color: "rgba(255,255,255,0.78)", textDecoration: "none", fontSize: 13 }}>
            ← Faire un don
          </Link>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(24px, 4vw, 36px)",
            margin: "10px 0 4px", fontWeight: 800,
          }}>📋 Mes dons</h1>
          <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, margin: 0 }}>
            Historique de tes contributions au ministère CCB
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ maxWidth: 1000, margin: "-22px auto 0", padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Kpi icon="✅" label="Total confirmé" value={formatAmount(totalConfirmed, "XAF")} accent={T.green} />
          <Kpi icon="📊" label="Dons confirmés" value={confirmedCount} />
          <Kpi icon="⏳" label="En attente" value={formatAmount(totalPending, "XAF")} accent={T.gold} />
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "22px 16px 80px",
        display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 22,
      }} className="mes-dons-grid">
        {/* Liste */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontFamily: F.title, fontSize: 18, margin: 0 }}>Historique</h2>
            <div style={{ display: "inline-flex", background: T.surface2, borderRadius: 999, padding: 3, gap: 3 }}>
              {(["all","pending","confirmed","cancelled"] as FilterStatus[]).map((s) => (
                <button key={s} onClick={() => setFilter(s)} style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: filter === s ? T.card : "transparent",
                  color: filter === s ? T.text : T.textMuted,
                  border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: F.body,
                }}>{statusLabel(s)}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💝</div>
              <p style={{ color: T.textMuted, fontSize: 13.5, margin: "0 0 14px" }}>
                {records.length === 0
                  ? "Tu n'as pas encore de don enregistré."
                  : "Aucun don ne correspond à ce filtre."}
              </p>
              <Link href="/dons" style={{
                padding: "10px 22px", background: T.violet, color: "#fff",
                borderRadius: 999, fontWeight: 700, fontSize: 13, textDecoration: "none",
                display: "inline-block",
              }}>+ Faire un don</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((r) => (
                <RecordCard key={r.id} record={r}
                  campaign={r.campaign_id ? campaignsById.get(r.campaign_id) : null}
                  onCancel={() => cancelPending(r)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sidebar : breakdown */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section>
            <h2 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 10px" }}>📅 Par année</h2>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {byYear.length === 0 ? (
                <Empty>Aucun don confirmé.</Empty>
              ) : byYear.map(([year, info]) => (
                <div key={year} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: T.text }}>{year}</span>
                  <span style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 800, color: T.violet, display: "block" }}>
                      {formatAmount(info.total_xaf, "XAF")}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{info.count} don{info.count > 1 ? "s" : ""}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 10px" }}>🎯 Par type</h2>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              {byKind.length === 0 ? (
                <Empty>Aucun don confirmé.</Empty>
              ) : byKind.map(([kindId, total]) => {
                const k = getKind(kindId);
                const max = byKind[0][1];
                const pct = Math.round((total / max) * 100);
                return (
                  <div key={kindId} style={{
                    position: "relative", padding: "10px 14px",
                    borderBottom: `1px solid ${T.border}`, overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", inset: 0, width: `${pct}%`,
                      background: `${k.color}22`,
                    }} />
                    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{k.emoji} {k.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
                        {formatAmount(total, "XAF")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{
            padding: 14, background: T.violetSoft, border: `1px solid ${T.violet}`,
            borderRadius: 14, fontSize: 12.5, color: T.violetDark, lineHeight: 1.5,
          }}>
            💡 Besoin d'un reçu fiscal pour ta déclaration ? <Link href="/contact" style={{ color: T.violet, fontWeight: 700 }}>Contacte-nous</Link>.
          </section>
        </aside>
      </div>

      <style jsx global>{`
        @media (max-width: 800px) {
          .mes-dons-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      padding: 14, background: T.card,
      border: `1px solid ${accent ?? T.border}`,
      borderRadius: 12, boxShadow: T.shadowSoft,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      </div>
      <div style={{
        fontFamily: F.title, fontSize: 22, fontWeight: 800,
        color: accent ?? T.text, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}

function statusLabel(s: FilterStatus): string {
  switch (s) {
    case "all":       return "Tous";
    case "pending":   return "⏳ En attente";
    case "confirmed": return "✅ Confirmés";
    case "cancelled": return "❌ Annulés";
  }
}

function RecordCard({ record: r, campaign, onCancel }: {
  record: DonationRecord; campaign: CampaignLite | null | undefined; onCancel: () => void;
}) {
  const k = getKind(r.kind);
  const mode = r.payment_mode ? PAYMENT_MODES.find((m) => m.id === r.payment_mode) : null;
  const statusColor = r.status === "confirmed" ? T.green : r.status === "cancelled" ? T.textMuted : T.gold;
  const statusLabel = r.status === "confirmed" ? "✅ Confirmé" : r.status === "cancelled" ? "❌ Annulé" : "⏳ En attente";
  const dateRef = r.paid_at ?? r.confirmed_at ?? r.created_at;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
      padding: "12px 14px",
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${k.color}22`, color: k.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>{k.emoji}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{k.label}</span>
          <span style={{
            padding: "1.5px 7px", borderRadius: 4,
            background: `${statusColor}22`, color: statusColor,
            border: `1px solid ${statusColor}55`,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
          }}>{statusLabel}</span>
          {campaign ? (
            <span style={{ fontSize: 11, color: T.violet, fontWeight: 600 }}>
              · 🎯 {campaign.title}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>📅 {new Date(dateRef).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
          {mode ? <span>{mode.emoji} {mode.title}</span> : null}
          {r.reference ? <span style={{ fontFamily: "monospace" }}>{r.reference}</span> : null}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 17, color: T.text, fontVariantNumeric: "tabular-nums" }}>
          {formatAmount(r.amount_native, r.currency)}
        </div>
        {r.currency !== "XAF" ? (
          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
            ≈ {formatAmount(r.amount_xaf, "XAF")}
          </div>
        ) : null}
        {r.status === "pending" ? (
          <button onClick={onCancel} style={{
            marginTop: 4, padding: "3px 8px",
            background: "transparent", color: T.heart,
            border: `1px solid ${T.heartSoft}`, borderRadius: 6,
            fontSize: 10.5, fontWeight: 700, cursor: "pointer",
          }}>Annuler</button>
        ) : null}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "20px 14px", textAlign: "center", color: T.textMuted, fontSize: 12.5 }}>
      {children}
    </div>
  );
}
