// Parsing et helpers pour les mentions @utilisateur dans posts/commentaires.
//
// Convention : on stocke le contenu en clair avec @DisplayName.
// Lors du save, on parse les @mots, on matche contre user_profiles.display_name
// (insensible aux accents/casse) et on crée une notification pour chaque user mentionné.
//
// Lors du rendu, on parse à nouveau pour transformer les @DisplayName en liens.

export interface MentionMatch {
  raw: string;          // texte original ex "@Jean Dupont"
  displayName: string;  // "Jean Dupont"
  start: number;        // position début dans le contenu
  end: number;          // position fin
}

export interface MemberLookup {
  user_id: string;
  display_name: string | null;
  avatar_url?: string | null;
}

// Normalise pour matching tolérant
export function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Extrait toutes les mentions potentielles @mot du contenu.
// Une mention = @ suivi d'un nom (lettres, chiffres, espaces, tirets, apostrophes),
// jusqu'à ponctuation ou retour ligne ou autre @.
// On capture la plus longue séquence qui matche un membre connu.
export function extractMentions(content: string, members: MemberLookup[]): MentionMatch[] {
  if (!content || members.length === 0) return [];
  const result: MentionMatch[] = [];
  // Trie les membres par longueur de nom DESC pour matcher d'abord les noms longs
  const sorted = members
    .filter((m) => m.display_name)
    .map((m) => ({ ...m, norm: normName(m.display_name as string) }))
    .sort((a, b) => b.norm.length - a.norm.length);

  // Trouve les positions de @ dans le contenu
  const atPositions: number[] = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "@") atPositions.push(i);
  }

  for (const pos of atPositions) {
    // Skippe si @ collé à un caractère alphanumérique (email-like)
    if (pos > 0 && /[a-zA-Z0-9]/.test(content[pos - 1])) continue;

    // Cherche le plus long display_name qui matche après ce @
    const after = content.slice(pos + 1);
    const afterNorm = normName(after);
    let matched: typeof sorted[number] | null = null;
    for (const m of sorted) {
      // Le après doit commencer par le nom normalisé, suivi de fin ou non-alpha
      if (afterNorm.startsWith(m.norm)) {
        const nextChar = afterNorm[m.norm.length];
        if (!nextChar || !/[a-z0-9]/.test(nextChar)) {
          matched = m;
          break;
        }
      }
    }
    if (matched) {
      // Calcule la longueur réelle dans le texte original (peut différer si accents)
      const realLen = matched.display_name!.length;
      result.push({
        raw: "@" + content.substr(pos + 1, realLen),
        displayName: matched.display_name as string,
        start: pos,
        end: pos + 1 + realLen,
      });
    }
  }
  return result;
}

// Retourne la liste unique des user_ids mentionnés
export function getMentionedUserIds(content: string, members: MemberLookup[]): string[] {
  const matches = extractMentions(content, members);
  const idsByName: Record<string, string> = {};
  for (const m of members) {
    if (m.display_name) idsByName[normName(m.display_name)] = m.user_id;
  }
  const ids = new Set<string>();
  for (const match of matches) {
    const uid = idsByName[normName(match.displayName)];
    if (uid) ids.add(uid);
  }
  return [...ids];
}

// Découpe le contenu en segments : texte brut et mentions, pour le rendu.
export interface RenderSegment {
  type: "text" | "mention";
  content: string;
  userId?: string;
}

export function renderSegments(content: string, members: MemberLookup[]): RenderSegment[] {
  const matches = extractMentions(content, members);
  if (matches.length === 0) return [{ type: "text", content }];

  const idsByName: Record<string, string> = {};
  for (const m of members) {
    if (m.display_name) idsByName[normName(m.display_name)] = m.user_id;
  }

  const out: RenderSegment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      out.push({ type: "text", content: content.slice(cursor, m.start) });
    }
    out.push({
      type: "mention",
      content: m.raw,
      userId: idsByName[normName(m.displayName)],
    });
    cursor = m.end;
  }
  if (cursor < content.length) {
    out.push({ type: "text", content: content.slice(cursor) });
  }
  return out;
}

// Détecte si on tape une mention (@xxx) au curseur. Retourne le préfixe ou null.
export function detectMentionAtCursor(text: string, cursorPos: number): { prefix: string; start: number } | null {
  // Cherche le dernier @ avant le curseur
  let i = cursorPos - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      // Vérifie que @ est en début ou précédé d'espace/ponctuation
      if (i === 0 || /\s|[.,;:!?(]/.test(text[i - 1])) {
        return { prefix: text.slice(i + 1, cursorPos), start: i };
      }
      return null;
    }
    if (/\n/.test(ch)) return null;
    if (cursorPos - i > 30) return null; // limite raisonnable
    i--;
  }
  return null;
}
