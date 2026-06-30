import React from "react";
import { linkify } from "./linkify";

/**
 * Mise en forme légère des messages (façon WhatsApp), + liens cliquables :
 *   *gras*     → gras
 *   _italique_ → italique
 *   ~barré~    → barré
 *
 * Non imbriqué, sur une seule ligne par marqueur (comportement volontairement
 * simple et prévisible). Le reste du texte (et l'intérieur des marqueurs) passe
 * par `linkify` pour rendre les URL cliquables.
 */
const FMT_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

export function formatInline(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  FMT_RE.lastIndex = 0;
  while ((m = FMT_RE.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    if (start > last) {
      parts.push(<React.Fragment key={`t${k}`}>{linkify(text.slice(last, start))}</React.Fragment>);
    }
    const inner = raw.slice(1, -1);
    const ch = raw[0];
    const style: React.CSSProperties =
      ch === "*" ? { fontWeight: 700 } :
      ch === "_" ? { fontStyle: "italic" } :
      { textDecoration: "line-through" };
    parts.push(<span key={`f${k}`} style={style}>{linkify(inner)}</span>);
    last = start + raw.length;
    k++;
  }
  if (last < text.length) {
    parts.push(<React.Fragment key={`e${k}`}>{linkify(text.slice(last))}</React.Fragment>);
  }
  return parts;
}
