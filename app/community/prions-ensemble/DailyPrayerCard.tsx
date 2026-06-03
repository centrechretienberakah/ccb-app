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
        date: p.date, title: p.title, verse_ref: p.verse_ref,
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
  const [prayerId, setPrayerId] = useState<string | null>(prayer.id);

  const paragraphs = prayer.content.split("\n\n").filter((p) => p.trim().length > 0);

  function buildShareText() {
    const lines = [
      `🙏 PRIÈRE DU JOUR — ${fmtDate(prayer.date).toUpperCase()}`,
      ``,
      `« ${prayer.title.toUpperCase()} »`,
    ];
    if (prayer.verse_ref) {
      lines.push("", `📖 ${prayer.verse_ref}`);
      if (prayer.verse_text) lines.push(`« ${prayer.verse_text} »`);
    }
    lines.push("", prayer.content, "", `— ${prayer.author}`,
      "", "📱 Centre Chrétien Berakah :", PUBLIC_URL);
    return lines.join("\n");
  }

  async function handleShare() {
    let didShare = false;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `PRIÈRE DU JOUR — ${prayer.title}`, text: buildShareText(), url: PUBLIC_URL });
        didShare = true;
      }
    } catch { /* annulé */ }
    if (!didShare) {
      try {
        await navigator.clipboard.writeText(buildShareText());
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
      // Annule
      setPrayed(false); setCount((c) => Math.max(0, c - 1));
      try {
        await sb.from("daily_prayer_intercessions").delete()
          .eq("daily_prayer_id", id).eq("user_id", userId);
      } catch { setPrayed(true); setCount((c) => c + 1); }
    } else {
      setPrayed(true); setCount((c) => c + 1);
      try {
        await sb.from("daily_prayer_intercessions")
          .insert({ daily_prayer_id: id, user_id: userId });
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(145deg, #4c0519, #9f1239 55%, #fb7185)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 23, boxShadow: "0 4px 12px rgba(159,18,57,0.3)",
          }}>🙏</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: F.title, fontSize: 16, fontWeight: 800,
              color: T.violet, letterSpacing: "0.03em", lineHeight: 1.1,
            }}>
              PRIÈRE DU JOUR
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, textTransform: "capitalize" }}>
              {fmtDate(prayer.date)}
            </div>
          </div>
        </div>

        {/* Thème */}
        <h2 style={{
          fontFamily: F.title, fontSize: 21, fontWeight: 800,
          color: T.text, margin: "0 0 12px", lineHeight: 1.25,
        }}>
          {prayer.title}
        </h2>

        {/* Verset */}
        {prayer.verse_ref && (
          <div style={{
            background: "rgba(90,44,160,0.06)",
            borderLeft: `3px solid ${T.violet}`,
            borderRadius: "0 12px 12px 0",
            padding: "11px 13px", marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.violet, marginBottom: 4 }}>
              📖 {prayer.verse_ref}
            </div>
            {prayer.verse_text && (
              <div style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.55, fontStyle: "italic" }}>
                « {prayer.verse_text} »
              </div>
            )}
          </div>
        )}

        {/* Texte de la prière */}
        <div style={{ marginBottom: 16 }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              fontSize: 14.5, color: T.textSoft, lineHeight: 1.7, margin: "0 0 10px",
            }}>
              {p}
            </p>
          ))}
        </div>

        {/* Signature */}
        <div style={{
          fontSize: 12.5, color: T.textMuted, fontStyle: "italic",
          textAlign: "right", marginBottom: 14,
        }}>
          — {prayer.author}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={togglePrayed} disabled={busy} style={{
            flex: "1 1 150px",
            background: prayed
              ? "rgba(159,18,57,0.12)"
              : "linear-gradient(135deg, #9f1239, #4c0519)",
            color: prayed ? "#9f1239" : "#fff",
            border: prayed ? "1px solid rgba(159,18,57,0.4)" : "none",
            borderRadius: 999, padding: "11px 16px",
            fontWeight: 700, fontSize: 13.5,
            cursor: busy ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            opacity: busy ? 0.7 : 1, fontFamily: F.body,
          }}>
            {busy ? "⏳ …" : prayed ? `🙏 J'ai prié${count > 0 ? ` · ${count}` : ""}` : `🙏 Je prie${count > 0 ? ` · ${count}` : ""}`}
          </button>
          <button onClick={handleShare} style={{
            flex: "1 1 120px",
            background: T.card, color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 999, padding: "11px 16px",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            fontFamily: F.body,
          }}>
            {shared ? "✓ Copié !" : "↗ Partager"}
          </button>
        </div>
      </div>
    </div>
  );
}
