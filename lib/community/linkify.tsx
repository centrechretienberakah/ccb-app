import React from "react";

// Détecte les URL http(s):// et les liens commençant par www.
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/**
 * Transforme les URL d'un texte en liens cliquables (ouvrent un nouvel onglet),
 * en gardant le reste du texte intact. Utilisé dans les bulles de chat (groupes
 * + messages privés). `stopPropagation` pour ne pas déclencher le clic de la
 * bulle (réponse/actions) quand on clique un lien.
 */
export function linkify(text: string, linkStyle?: React.CSSProperties): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  if (!text) return out;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    // Retire la ponctuation finale qui ne fait pas partie de l'URL : « voir https://x.com. »
    const trimmed = raw.replace(/[.,;:!?)\]}'"»]+$/, "");
    const start = m.index;
    if (start > last) out.push(text.slice(last, start));
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    out.push(
      <a
        key={`lk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all", ...linkStyle }}
      >
        {trimmed}
      </a>,
    );
    const trailing = raw.slice(trimmed.length);
    if (trailing) out.push(trailing);
    last = start + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
