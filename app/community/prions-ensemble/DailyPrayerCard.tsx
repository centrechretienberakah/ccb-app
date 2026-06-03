"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_THEME as T, COMMUNITY_FONTS as F } from "@/lib/community/theme";
import type { UnifiedDailyPrayer } from "@/lib/prayer/dailyFetch";

const PUBLIC_URL = "https://centrechretienberakah.com";

function fmtDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
}

interface Props {
  prayer: UnifiedDailyPrayer;
  userId: string | null;
  initialPrayed: boolean;
  initialCount: number;
}

async function ensurePrayerId(p: UnifiedDailyPrayer): Promise<string | null> {
  if (p.id) return p.id;
  try {
    const res = await fetch("/api/daily-prayer/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: p.date, title: p.theme, verse_ref: p.verse_ref,
        verse_text: p.verse_text, content: p.content, author: p.author,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) return null;
    return data.id as string;
  } catch { return null; }
}

export default function DailyPrayerCard({ prayer, userId, initialPrayed, initialCount }: Props) {
  const [prayed, setPrayed] = useState(initialPrayed);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prayerId, setPrayerId] = useState<string | null>(prayer.id);

  async function handleShare() {
    let didShare = false;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `PRIONS ENSEMBLE — ${prayer.theme}`, text: prayer.content, url: PUBLIC_URL });
        didShare = true;
      }
    } catch { /* annulé */ }
    if (!didShare) {
      try {
        await navigator.clipboard.writeText(prayer.content + "\n\n📱 " + PUBLIC_URL);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      } catch { /* noop */ }
    }
  }

  async function togglePrayed() {
    if (busy) return;
    if (!userId) { window.location.href = "/auth/login?redirect=/community/prions-ensemble"; return; }
    setBusy(true);
    let id = prayerId;
    if (!id) {
      id = await ensurePrayerId(prayer);
      if (!id) { setBusy(false); return; }
      setPrayerId(id);
    }
    const sb = createClient();
    if (prayed) {
      setPrayed(false); setCount((c) => Math.max(0, c - 1));
      try {
        await sb.from("daily_prayer_intercessions").delete().eq("daily_prayer_id", id).eq("user_id", userId);
      } catch { setPrayed(true); setCount((c) => c + 1); }
    } else {
      setPrayed(true); setCount((c) => c + 1);
      try {
        await sb.from("daily_prayer_intercessions").insert({ daily_prayer_id: id, user_id: userId });
      } catch { setPrayed(false); setCount((c) => Math.max(0, c - 1)); }
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 0" }}>
      <div style={{
        position: "relative",
        background: `linear-gradient(160deg, ${T.card} 0%, ${T.surface2} 100%)`,
        border: `1px solid ${T.gold}`,
        borderRadius: 20,
        padding: "20px 18px 18px",
        boxShadow: T.shadowMd,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)`,
        }} />

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(145deg, #4c0519, #9f1239 55%, #fb7185)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 23, boxShadow: "0 4px 12px rgba(159,18,57,0.3)",
          }}>🔥</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: F.title, fontSize: 15.5, fontWeight: 800,
              color: T.violet, letterSpacing: "0.02em", lineHeight: 1.15,
            }}>
              PRIONS ENSEMBLE
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, textTransform: "capitalize" }}>
              {fmtDate(prayer.date)}
            </div>
          </div>
        </div>

        {/* Thème */}
        <div style={{
          display: "inline-block",
          background: "rgba(212,175,55,0.14)", border: `1px solid ${T.gold}`,
          color: T.goldDark, fontWeight: 800, fontSize: 11,
          letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "5px 12px", borderRadius: 999, marginBottom: 12,
        }}>
          {prayer.dayLabel} · {prayer.theme}
        </div>

        {/* Introduction */}
        <p style={{ fontSize: 14.5, color: T.text, lineHeight: 1.65, margin: "0 0 14px", fontWeight: 500 }}>
          {prayer.intro}
        </p>

        {/* Verset */}
        <div style={{
          background: "rgba(90,44,160,0.06)", borderLeft: `3px solid ${T.violet}`,
          borderRadius: "0 12px 12px 0", padding: "11px 13px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.violet, marginBottom: 4 }}>
            📖 {prayer.verse_ref}
          </div>
          <div style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.55, fontStyle: "italic" }}>
            « {prayer.verse_text} »
          </div>
        </div>

        {/* Contenu déroulable */}
        {expanded && (
          <>
            {/* Exhortation */}
            <Section label="✦ Exhortation">
              {prayer.exhortation.map((e, i) => (
                <p key={i} style={pStyle}>{e}</p>
              ))}
            </Section>

            {/* Points de prière */}
            <Section label="🙏 Points de prière">
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 7 }}>
                {prayer.prayerPoints.map((pt, i) => (
                  <li key={i} style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.55 }}>{pt}</li>
                ))}
              </ul>
            </Section>

            {/* Prière guidée */}
            <Section label="🕊️ Prière guidée">
              <p style={{ ...pStyle, fontStyle: "italic" }}>{prayer.guidedPrayer}</p>
            </Section>

            {/* Déclarations prophétiques */}
            <Section label="⚡ Déclarations prophétiques">
              <div style={{ display: "grid", gap: 8 }}>
                {prayer.declarations.map((d, i) => (
                  <div key={i} style={{
                    background: "linear-gradient(135deg, rgba(90,44,160,0.08), rgba(212,175,55,0.08))",
                    borderRadius: 10, padding: "9px 12px",
                    fontSize: 13.5, color: T.text, fontWeight: 600, lineHeight: 1.5,
                  }}>
                    {d}
                  </div>
                ))}
              </div>
            </Section>

            {/* Clôture */}
            <div style={{
              textAlign: "center", marginTop: 16, marginBottom: 4,
              fontFamily: F.title, fontSize: 15, fontWeight: 700, color: T.violet,
            }}>
              Que le Seigneur vous bénisse abondamment.
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: T.textMuted, fontStyle: "italic", marginBottom: 14 }}>
              {prayer.author}
            </div>
          </>
        )}

        {/* Bouton déplier/replier */}
        <button onClick={() => setExpanded((v) => !v)} style={{
          width: "100%", background: "transparent", border: `1px dashed ${T.border}`,
          borderRadius: 12, padding: "9px", marginBottom: 12,
          color: T.violet, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: F.body,
        }}>
          {expanded ? "▲ Réduire la prière" : "▼ Lire la prière complète (exhortation, points, déclarations…)"}
        </button>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={togglePrayed} disabled={busy} style={{
            flex: "1 1 150px",
            background: prayed ? "rgba(159,18,57,0.12)" : "linear-gradient(135deg, #9f1239, #4c0519)",
            color: prayed ? "#9f1239" : "#fff",
            border: prayed ? "1px solid rgba(159,18,57,0.4)" : "none",
            borderRadius: 999, padding: "11px 16px", fontWeight: 700, fontSize: 13.5,
            cursor: busy ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            opacity: busy ? 0.7 : 1, fontFamily: F.body,
          }}>
            {busy ? "⏳ …" : prayed ? `🙏 J'ai prié${count > 0 ? ` · ${count}` : ""}` : `🙏 Je prie${count > 0 ? ` · ${count}` : ""}`}
          </button>
          <button onClick={handleShare} style={{
            flex: "1 1 120px",
            background: T.card, color: T.text, border: `1px solid ${T.border}`,
            borderRadius: 999, padding: "11px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: F.body,
          }}>
            {shared ? "✓ Copié !" : "↗ Partager"}
          </button>
        </div>
      </div>
    </div>
  );
}

const pStyle: React.CSSProperties = {
  fontSize: 14, color: T.textSoft, lineHeight: 1.7, margin: "0 0 10px",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11.5, fontWeight: 800, color: T.violet,
        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
