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

  // ── Versions modernes (clé API.Bible requise) ─────────────────────────────
  { id: "s21",  label: "Segond 21",             shortLabel: "S21",  source: "apibible", apibibleId: "3a2a80c1be6bee61-01", year: "2007" },
  { id: "nbs",  label: "Nouvelle Bible Segond", shortLabel: "NBS",  source: "apibible", apibibleId: "d5754d2b6e5f7bf3-01", year: "2002" },
  { id: "bds",  label: "Bible du Semeur",        shortLabel: "BDS",  source: "apibible", apibibleId: "db00bc83c3b0f552-01", year: "2000" },
  { id: "nfc",  label: "Français Courant",       shortLabel: "NFC",  source: "apibible", apibibleId: "1e5d8f0fb7ceae62-01", year: "2019" },
];

export const DEFAULT_VERSION = BIBLE_VERSIONS[0];

export function getVersionById(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? DEFAULT_VERSION;
}
