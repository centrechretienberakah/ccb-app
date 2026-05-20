"use client";
import { useState } from "react";
import { JDTV_THEME as T, JDTV_FONTS as F } from "@/lib/jdtv/theme";

export default function Transcript({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);
  if (!markdown?.trim()) return null;
  return (
    <section style={{
      marginBottom: 22, padding: 14,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", background: "transparent", color: T.text,
        border: "none", cursor: "pointer", padding: 0,
        fontFamily: F.title, fontSize: 16, fontWeight: 700,
      }}>
        <span>📜 Transcription</span>
        <span style={{ color: T.textMuted, fontSize: 13, fontWeight: 400 }}>
          {open ? "Masquer ▴" : "Afficher ▾"}
        </span>
      </button>
      {open ? (
        <div style={{
          marginTop: 12, padding: 12,
          background: T.surface2, borderRadius: 8,
          fontSize: 13.5, lineHeight: 1.7, color: T.textSoft,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          maxHeight: 420, overflowY: "auto",
        }}>{markdown}</div>
      ) : null}
    </section>
  );
}
