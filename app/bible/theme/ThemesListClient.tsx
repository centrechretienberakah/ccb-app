"use client";

import Link from "next/link";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";

interface ThemeLite {
  id: string;
  title: string;
  description: string;
  emoji: string;
  totalDays: number;
}

interface Props {
  themes: ThemeLite[];
  activeMap: Record<string, number>; // id → completed days count
}

export default function ThemesListClient({ themes, activeMap }: Props) {
  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 18px 20px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/bible" style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Bible</Link>
        </div>

        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🌿</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.4rem, 4.5vw, 1.9rem)",
            fontWeight: 700, color: T.text, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Plans thématiques
          </h1>
          <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
            13 parcours · verset, méditation, prière, déclaration
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          {themes.map((t) => {
            const done = activeMap[t.id] ?? 0;
            const pct = done > 0 ? Math.round((done / t.totalDays) * 100) : 0;
            const active = done > 0;
            return (
              <Link key={t.id} href={`/bible/theme/${t.id}`} style={{
                textDecoration: "none", color: T.text,
              }}>
                <div style={{
                  background: T.card, border: `1px solid ${active ? T.violet : T.border}`,
                  borderRadius: 14, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: T.violetSoft, color: T.violet,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24,
                  }}>
                    {t.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: F.title, fontSize: 15, fontWeight: 700,
                      color: T.text, marginBottom: 3,
                    }}>
                      {t.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: T.textMuted, lineHeight: 1.45,
                      marginBottom: active ? 8 : 0,
                    }}>
                      {t.totalDays} jours · {t.description.length > 50 ? t.description.slice(0, 50) + "…" : t.description}
                    </div>
                    {active && (
                      <>
                        <div style={{
                          height: 4, background: T.surface2, borderRadius: 2,
                          overflow: "hidden", marginBottom: 4,
                        }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: T.violet, transition: "width 0.4s",
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: T.violet, fontWeight: 700 }}>
                          {done}/{t.totalDays} jours · {pct}%
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ color: T.violet, fontSize: 18, flexShrink: 0 }}>→</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
