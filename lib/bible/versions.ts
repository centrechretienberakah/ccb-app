"use client";

export interface BibleVersion {
  id: string;
  label: string;
  shortLabel: string;
  source: "github" | "getbible" | "apibible";
  getbibleAbbrev?: string;
  apibibleId?: string;
  year?: string;
  note?: string;
}

// Versions disponibles gratuitement via getbible.net (domaine public)
// Versions modernes copyrightées via api.bible (clé gratuite requise)
export const BIBLE_VERSIONS: BibleVersion[] = [
  {
    id: "lsg",
    label: "Louis Segond 1910",
    shortLabel: "LSG",
    source: "github",
    year: "1910",
  },
  {
    id: "darby",
    label: "Bible Darby",
    shortLabel: "Darby",
    source: "getbible",
    getbibleAbbrev: "darby",
    year: "1890",
  },
  {
    id: "neg",
    label: "Nouvelle Éd. de Genève",
    shortLabel: "NEG",
    source: "getbible",
    getbibleAbbrev: "neg",
    year: "1979",
  },
  {
    id: "crampon",
    label: "Bible Crampon",
    shortLabel: "Crampon",
    source: "getbible",
    getbibleAbbrev: "crampon",
    year: "1923",
  },
  {
    id: "ostervald",
    label: "Ostervald",
    shortLabel: "Ostervald",
    source: "getbible",
    getbibleAbbrev: "ostervald",
    year: "1744",
  },
  {
    id: "martin",
    label: "Bible Martin",
    shortLabel: "Martin",
    source: "getbible",
    getbibleAbbrev: "martin",
    year: "1744",
  },
  {
    id: "s21",
    label: "Segond 21",
    shortLabel: "S21",
    source: "apibible",
    apibibleId: "7142879509583bbb-01",
    year: "2007",
    note: "Clé API requise",
  },
  {
    id: "bds",
    label: "Bible du Semeur",
    shortLabel: "Semeur",
    source: "apibible",
    apibibleId: "3607DA17EA2BE966-01",
    year: "2000",
    note: "Clé API requise",
  },
  {
    id: "pdv",
    label: "Parole de Vie",
    shortLabel: "PDV",
    source: "apibible",
    apibibleId: "a556c5305b9b8534-01",
    year: "2000",
    note: "Clé API requise",
  },
  {
    id: "fc",
    label: "Français Courant",
    shortLabel: "BFC",
    source: "apibible",
    apibibleId: "0585e9ddabb41d4b-01",
    year: "1982",
    note: "Clé API requise",
  },
];

export const DEFAULT_VERSION = BIBLE_VERSIONS[0];

export function getVersionById(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? DEFAULT_VERSION;
}
