/**
 * Display formatting. Numbers use a true minus sign (U+2212) and a narrow set
 * of units so every screen reads the same way.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
export const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

export const MINUS = "−";
export const EN_DASH = "–";
export const EMPTY = "—";

const withMinus = (s: string) => s.replace(/^-/, MINUS);

/** Fixed decimals with trailing zeros removed: 3.30 → "3.3", 7.0 → "7", −28.5 → "−28.5". */
export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  const s = value.toFixed(digits);
  const trimmed = digits > 0 ? s.replace(/\.?0+$/, "") : s;
  return withMinus(trimmed === "-0" ? "0" : trimmed);
}

/** A 0–1 share as a whole percentage: 0.686 → "69%". */
export function formatPercent(share: number | null | undefined): string {
  if (share == null || !Number.isFinite(share)) return EMPTY;
  return `${Math.round(share * 100)}%`;
}

/** Hours as a duration: 3.233 → "3 h 14 min", 0.6 → "36 min", 2 → "2 h". */
export function formatDuration(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return EMPTY;
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

/** Minutes as a duration: 194 → "3 h 14 min". */
export const formatMinutes = (minutes: number) => formatDuration(minutes / 60);

/** Hour of day as a 24-hour clock: 13.5 → "13:30". Wraps past midnight. */
export function formatClock(hour: number): string {
  const total = Math.round((((hour % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "MM-DD" from the pipeline as "24 Sep". */
export function formatMonthDay(mmdd: string): string {
  const [m, d] = mmdd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** A best-window range: "24 Sep – 7 Oct". */
export function formatDayRange(start: string, end: string): string {
  return `${formatMonthDay(start)} ${EN_DASH} ${formatMonthDay(end)}`;
}

/** An ISO date as "15 Sep 2025". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatLat(lat: number, digits = 2): string {
  return `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? "N" : "S"}`;
}

export function formatLon(lon: number, digits = 2): string {
  return `${Math.abs(lon).toFixed(digits)}° ${lon >= 0 ? "E" : "W"}`;
}

export const formatLatLon = (lat: number, lon: number, digits = 2) =>
  `${formatLat(lat, digits)} · ${formatLon(lon, digits)}`;

/** Degrees of angle: 6.9 → "6.9°", −3 → "−3°". */
export const formatDegrees = (value: number | null | undefined, digits = 1) =>
  value == null ? EMPTY : `${formatNumber(value, digits)}°`;

/** Temperature: −28.5 → "−28.5 °C". */
export const formatTemp = (celsius: number | null | undefined, digits = 1) =>
  celsius == null ? EMPTY : `${formatNumber(celsius, digits)} °C`;

/** A low–high range of days: "1–7". */
export const formatRange = (lo: number, hi: number, digits = 0) =>
  `${formatNumber(lo, digits)}${EN_DASH}${formatNumber(hi, digits)}`;

/** Site and target names without the parenthetical: "Svalbard (Adventdalen)" → "Svalbard". */
export const shortName = (name: string) => name.split(" (")[0];

/** Pipeline identifiers as words: "not_representative" → "not representative". */
export const humanize = (id: string) => id.replace(/_/g, " ");
