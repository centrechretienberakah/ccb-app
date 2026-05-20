"use client";
import { JDTV_THEME as T, JDTV_FONTS as F, type JdtvChapter, formatVideoDuration } from "@/lib/jdtv/theme";

interface Props {
  chapters: JdtvChapter[];
  onJump: (timeSecs: number) => void;
}

export default function ChaptersPanel({ chapters, onJump }: Props) {
  if (!chapters || chapters.length === 0) return null;
  // Sort by time_secs ascending
  const sorted = [...chapters].sort((a, b) => a.time_secs - b.time_secs);

  return (
    <section style={{
      marginBottom: 22, padding: 14,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <h3 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 12px" }}>
        🗂️ Chapitres <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 400 }}>({sorted.length})</span>
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map((c, i) => (
          <button key={`${c.time_secs}-${i}`}
            onClick={() => onJump(c.time_secs)}
            style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
              padding: "9px 12px", textAlign: "left",
              background: "rgba(255,255,255,0.03)", color: T.text,
              border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer",
              fontFamily: F.body, fontSize: 13,
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.violetSoft; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
          >
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: T.violet, color: "#fff",
              fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            }}>{formatVideoDuration(c.time_secs)}</span>
            <span style={{ fontWeight: 600 }}>{c.title}</span>
            <span style={{ color: T.textMuted, fontSize: 14 }}>▸</span>
          </button>
        ))}
      </div>
    </section>
  );
}
