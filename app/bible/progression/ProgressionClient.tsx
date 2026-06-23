"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";
import { computeStats, computeBadges, getEncouragement, type ChapterReadRow } from "@/lib/bible/stats";

interface Props {
  chapters: ChapterReadRow[];
  versesSaved: number;
  highlightsCount: number;
}

export default function ProgressionClient({ chapters, versesSaved, highlightsCount }: Props) {
  const stats = useMemo(
    () => computeStats({ chapters, versesSaved, highlightsCount }),
    [chapters, versesSaved, highlightsCount],
  );
  const badges = useMemo(() => computeBadges(stats), [stats]);
  const encouragement = useMemo(() => getEncouragement(stats), [stats]);

  // Calendrier mois courant
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi=0

  const monthName = today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 100,
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 18px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <Link href="/bible" style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.gold, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Bible</Link>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.3rem, 4vw, 1.7rem)",
            fontWeight: 700, color: T.text, margin: 0, flex: 1,
          }}>
            Ma progression
          </h1>
        </div>

        {/* Encouragement banner */}
        <div style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff", borderRadius: 16, padding: "16px 18px",
          marginBottom: 18, position: "relative", overflow: "hidden",
          boxShadow: "0 8px 30px rgba(62,28,112,0.25)",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.gold}, transparent)`,
          }} />
          <div style={{ fontFamily: F.title, fontSize: 14, lineHeight: 1.5 }}>
            {encouragement}
          </div>
        </div>

        {/* Stats principales */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          marginBottom: 18,
        }}>
          <StatBig label="Chapitres lus" value={stats.chaptersRead} accent={T.violet} />
          <StatBig label="Série actuelle" value={`${stats.currentStreak}j`} accent="#F39C12" />
          <StatBig label="Plus longue série" value={`${stats.longestStreak}j`} accent="#2E9B47" />
          <StatBig label="Livres explorés" value={`${stats.uniqueBooksRead}/66`} accent={T.gold} />
        </div>

        {/* Calendrier du mois */}
        <SectionTitle>📅 {capitalize(monthName)}</SectionTitle>
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 14, marginBottom: 22,
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4, marginBottom: 6,
          }}>
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <div key={i} style={{
                textAlign: "center", fontSize: 10, fontWeight: 700,
                color: T.textMuted, padding: 4,
              }}>{d}</div>
            ))}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4,
          }}>
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const read = stats.readDaysSet.has(dateStr);
              const isToday = day === today.getDate();
              return (
                <div key={day} style={{
                  aspectRatio: "1", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: read ? 700 : 500,
                  borderRadius: 8,
                  background: read ? T.violet : (isToday ? T.violetSoft : T.surface2),
                  color: read ? "#fff" : (isToday ? T.violet : T.textSoft),
                  border: isToday && !read ? `1.5px solid ${T.violet}` : "none",
                }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <SectionTitle>🏆 Mes badges</SectionTitle>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10, marginBottom: 22,
        }}>
          {badges.map((b) => (
            <div key={b.id} style={{
              background: b.unlocked ? T.card : "transparent",
              border: `1px solid ${b.unlocked ? T.gold : T.border}`,
              borderRadius: 14, padding: "12px 12px",
              textAlign: "center",
              opacity: b.unlocked ? 1 : 0.6,
            }}>
              <div style={{
                fontSize: 28, marginBottom: 4,
                filter: b.unlocked ? "none" : "grayscale(100%)",
              }}>{b.emoji}</div>
              <div style={{
                fontFamily: F.title, fontSize: 12, fontWeight: 700,
                color: b.unlocked ? T.text : T.textMuted, marginBottom: 4,
              }}>
                {b.title}
              </div>
              <div style={{
                fontSize: 10, color: T.textMuted, lineHeight: 1.4,
                marginBottom: 6,
              }}>
                {b.description}
              </div>
              {/* Progress bar */}
              <div style={{
                height: 4, background: T.surface2, borderRadius: 2,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${Math.round(b.progress * 100)}%`,
                  background: b.unlocked ? T.gold : T.violet,
                  transition: "width 0.4s",
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Détail stats secondaires */}
        <SectionTitle>📊 Statistiques détaillées</SectionTitle>
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 16,
        }}>
          <Row label="Versets sauvegardés" value={stats.versesSaved} />
          <Row label="Surlignages" value={stats.highlightsCount} />
          <Row label="Jours actifs" value={stats.readDaysSet.size} />
          <Row label="Ce mois-ci" value={stats.monthlyCounts[`${year}-${String(month + 1).padStart(2, "0")}`] ?? 0} last />
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: F.title, fontSize: 13, fontWeight: 700,
      color: T.textMuted, textTransform: "uppercase",
      letterSpacing: "0.1em", margin: "6px 0 10px",
    }}>
      {children}
    </h2>
  );
}

function StatBig({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "14px 14px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 3,
        background: accent,
      }} />
      <div style={{
        fontFamily: F.title, fontSize: 28, fontWeight: 700,
        color: T.text, lineHeight: 1, marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0",
      borderBottom: last ? "none" : `1px solid ${T.borderSoft}`,
    }}>
      <div style={{ fontSize: 13, color: T.textSoft }}>{label}</div>
      <div style={{ fontFamily: F.title, fontSize: 16, fontWeight: 700, color: T.gold }}>
        {value}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
