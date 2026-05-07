"use client";

export interface BibleVersion {
  id: string;
  label: string;
  shortLabel: string;
  source: "github" | "getbible";
  getbibleAbbrev?: string;
  year?: string;
}

export const BIBLE_VERSIONS: BibleVersion[] = [
  { id: "lsg",       label: "Louis Segond 1910",           shortLabel: "LSG",      source: "github",    year: "1910" },
  { id: "darby",     label: "Bible Darby",                  shortLabel: "Darby",    source: "getbible",  getbibleAbbrev: "darby",     year: "1890" },
  { id: "neg",       label: "Nouvelle Éd. de Genève",       shortLabel: "NEG",      source: "getbible",  getbibleAbbrev: "neg",       year: "1979" },
  { id: "crampon",   label: "Crampon",                      shortLabel: "Crampon",  source: "getbible",  getbibleAbbrev: "crampon",   year: "1923" },
  { id: "ostervald", label: "Ostervald",                    shortLabel: "Ostervald",source: "getbible",  getbibleAbbrev: "ostervald", year: "1744" },
  { id: "martin",    label: "Martin",                       shortLabel: "Martin",   source: "getbible",  getbibleAbbrev: "martin",    year: "1744" },
];

export const DEFAULT_VERSION = BIBLE_VERSIONS[0];

export function getVersionById(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? DEFAULT_VERSION;
}
