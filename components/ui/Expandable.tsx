"use client";

import { useState, type ReactNode } from "react";

// Bloc repliable : affiche le contenu tronqué (avec fondu) + bouton
// « Lire plus » / « Lire moins ». À placer dans une carte var(--card-bg)
// (le fondu se fond dans ce fond).
export default function Expandable({
  children,
  collapsedHeight = 340,
  moreLabel = "Lire plus",
  lessLabel = "Lire moins",
}: {
  children: ReactNode;
  collapsedHeight?: number;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ position: "relative", maxHeight: open ? "none" : collapsedHeight, overflow: "hidden" }}>
        {children}
        {!open && (
          <div aria-hidden style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: 90,
            background: "linear-gradient(to bottom, transparent, var(--card-bg))",
            pointerEvents: "none",
          }} />
        )}
      </div>
      <button onClick={() => setOpen((v) => !v)} style={{
        marginTop: 14, background: "rgba(212,175,55,0.10)", border: "1px solid var(--gold)",
        color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "8px 20px",
        fontWeight: 700, fontSize: 13, cursor: "pointer",
      }}>
        {open ? `▲ ${lessLabel}` : `▼ ${moreLabel}`}
      </button>
    </div>
  );
}
