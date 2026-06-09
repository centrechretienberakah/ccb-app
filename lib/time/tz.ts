/**
 * Gestion des fuseaux horaires CCB.
 *
 * Principe : tous les instants sont stockés en UTC (colonnes TIMESTAMPTZ).
 * - À la création, on convertit (date/heure saisie + fuseau d'origine) → UTC.
 * - À l'affichage, on convertit UTC → fuseau du VISITEUR (auto), avec la
 *   possibilité d'afficher aussi l'heure d'origine.
 */

export interface TzOption { id: string; label: string }

/** Fuseaux proposés au créateur d'événement (pays des membres CCB). */
export const COMMON_TIMEZONES: TzOption[] = [
  { id: "Europe/Paris",        label: "🇫🇷 France — Paris" },
  { id: "Europe/Brussels",     label: "🇧🇪 Belgique — Bruxelles" },
  { id: "Europe/Zurich",       label: "🇨🇭 Suisse — Zurich" },
  { id: "Africa/Douala",       label: "🇨🇲 Cameroun — Douala/Yaoundé" },
  { id: "Africa/Kinshasa",     label: "🇨🇩 RDC — Kinshasa" },
  { id: "Asia/Dubai",          label: "🇦🇪 Émirats — Dubaï" },
  { id: "America/Montreal",    label: "🇨🇦 Canada — Montréal" },
  { id: "America/New_York",    label: "🇺🇸 USA Est — New York" },
  { id: "America/Los_Angeles", label: "🇺🇸 USA Ouest — Los Angeles" },
  { id: "UTC",                 label: "🌍 UTC" },
];

/** Fuseau détecté automatiquement sur l'appareil du visiteur. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Ville lisible déduite d'un identifiant de fuseau ("Europe/Paris" → "Paris"). */
export function tzCity(tz?: string | null): string {
  if (!tz) return "";
  const parts = tz.split("/");
  return (parts[parts.length - 1] || tz).replace(/_/g, " ");
}

/**
 * Décalage (en ms) d'un fuseau à un instant donné : heure_locale − UTC.
 * Calculé via Intl (sans dépendance externe).
 */
function tzOffsetMs(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second),
  );
  return asUTC - instant.getTime();
}

/**
 * Convertit une heure « murale » (saisie datetime-local, ex "2026-06-15T12:00")
 * censée être dans `tz`, en instant UTC (ISO). Ex : 12:00 Europe/Paris → 10:00Z.
 */
export function zonedNaiveToUtcISO(naive: string, tz: string): string {
  if (!naive) return "";
  const withSeconds = naive.length === 16 ? naive + ":00" : naive;
  const candidate = new Date(withSeconds + "Z"); // composantes lues comme UTC
  if (isNaN(candidate.getTime())) return "";
  const offset = tzOffsetMs(candidate, tz);
  return new Date(candidate.getTime() - offset).toISOString();
}

/** Formate un instant UTC dans un fuseau précis. */
export function formatInZone(
  utcIso: string,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  try {
    return new Date(utcIso).toLocaleString("fr-FR", { ...opts, timeZone: tz });
  } catch {
    return new Date(utcIso).toLocaleString("fr-FR", opts);
  }
}

/** Heure locale du visiteur (HH:mm) pour un instant UTC. */
export function timeLocal(utcIso: string, tz?: string | null): string {
  return formatInZone(utcIso, tz || browserTimeZone(), { hour: "2-digit", minute: "2-digit" });
}
