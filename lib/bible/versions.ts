"use client";

export interface BibleVersion {
  id: string;
  label: string;
  shortLabel: string;
  source: "github" | "getbible" | "apibible";
  getbibleAbbrev?: string;
  apibibleId?: string;   // ID Bible sur api.scripture.api.bible
  year?: string;
}

export const BIBLE_VERSIONS: BibleVersion[] = [
  // ── Versions libres (pas de clé API requise) ──────────────────────────────
  { id: "lsg",       label: "Louis Segond 1910",           shortLabel: "LSG",      source: "github",    year: "1910" },
  { id: "darby",     label: "Bible Darby",                  shortLabel: "Darby",    source: "getbible",  getbibleAbbrev: "darby",     year: "1890" },
  { id: "neg",       label: "Nouvelle Éd. de Genève",       shortLabel: "NEG",      source: "getbible",  getbibleAbbrev: "neg",       year: "1979" },
  { id: "crampon",   label: "Crampon",                      shortLabel: "Crampon",  source: "getbible",  getbibleAbbrev: "crampon",   year: "1923" },
  { id: "ostervald", label: "Ostervald",                    shortLabel: "Ostervald",source: "getbible",  getbibleAbbrev: "ostervald", year: "1744" },
  { id: "martin",    label: "Martin",                       shortLabel: "Martin",   source: "getbible",  getbibleAbbrev: "martin",    year: "1744" },

  // ── Versions anglaises (gratuites, getbible.net) ──────────────────────────
  { id: "kjv", label: "King James Version",       shortLabel: "KJV", source: "getbible", getbibleAbbrev: "kjv", year: "1611" },
  { id: "asv", label: "American Standard Version", shortLabel: "ASV", source: "getbible", getbibleAbbrev: "asv", year: "1901" },
  { id: "web", label: "World English Bible",       shortLabel: "WEB", source: "getbible", getbibleAbbrev: "web", year: "2000" },

  // ── Versions anglaises modernes (clé API.Bible Starter, gratuite) ────────
  { id: "nlt", label: "New Living Translation", shortLabel: "NLT", source: "apibible", apibibleId: "d6e14a625393b4da-01", year: "2015" },
  { id: "amp", label: "Amplified Bible",         shortLabel: "AMP", source: "apibible", apibibleId: "a81b73293d3080c9-01", year: "2015" },
  { id: "msg", label: "The Message",             shortLabel: "MSG", source: "apibible", apibibleId: "6f11a7de016f942e-01", year: "2002" },
];

export const DEFAULT_VERSION = BIBLE_VERSIONS[0];

export function getVersionById(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? DEFAULT_VERSION;
}
