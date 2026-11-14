/**
 * Sun position on Earth with the NOAA solar calculator algorithm (after Meeus).
 *
 * This is the engine the pipeline uses (pipeline/src/analog_pipeline/sun.py),
 * ported so the browser can draw the low-sun ring and evaluate any searched
 * place. Times are UTC milliseconds since the Unix epoch; angles are degrees
 * unless a name says otherwise.
 *
 * Reference: NOAA Global Monitoring Laboratory, Solar Calculation Details,
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 */

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

const UNIX_EPOCH_JD = 2440587.5;
const J2000_JD = 2451545;
const MS_PER_DAY = 86_400_000;
const MS_PER_MIN = 60_000;
export const MIN_PER_DAY = 1440;

/** The pipeline samples the daily sun path on the 15th of each month of this year. */
export const SAMPLE_YEAR = 2025;
export const SAMPLE_DAY = 15;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface SunPosition {
  /** Geometric elevation above a flat horizon. */
  elevation: number;
  /** Elevation with NOAA's refraction correction: what a crew on the ground sees. */
  apparentElevation: number;
  /** Clockwise from north. */
  azimuth: number;
}

/** A run of minutes after local midnight, start inclusive and end exclusive. */
export type MinuteWindow = [start: number, end: number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mod = (v: number, m: number) => ((v % m) + m) % m;

function julianCentury(ms: number): number {
  return (ms / MS_PER_DAY + UNIX_EPOCH_JD - J2000_JD) / 36525;
}

/** Solar declination (radians) and equation of time (minutes) at `ms`. */
export function declinationAndEot(ms: number): { declination: number; eotMin: number } {
  const jc = julianCentury(ms);
  const l0 = mod(280.46646 + jc * (36000.76983 + jc * 0.0003032), 360);
  const m = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const mr = m * D2R;
  const c =
    Math.sin(mr) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * mr) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * mr) * 0.000289;
  const omega = (125.04 - 1934.136 * jc) * D2R;
  const appLong = l0 + c - 0.00569 - 0.00478 * Math.sin(omega);
  const seconds = 21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813));
  const obliq = (23 + (26 + seconds / 60) / 60 + 0.00256 * Math.cos(omega)) * D2R;
  const declination = Math.asin(Math.sin(obliq) * Math.sin(appLong * D2R));
  const y = Math.tan(obliq / 2) ** 2;
  const l0r = l0 * D2R;
  const eotMin =
    4 *
    R2D *
    (y * Math.sin(2 * l0r) -
      2 * e * Math.sin(mr) +
      4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) -
      0.5 * y * y * Math.sin(4 * l0r) -
      1.25 * e * e * Math.sin(2 * mr));
  return { declination, eotMin };
}

/** NOAA's approximate atmospheric refraction correction, in degrees. */
export function refraction(elevation: number): number {
  if (elevation > 85) return 0;
  const t = Math.tan(elevation * D2R);
  if (elevation > 5) return (58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5) / 3600;
  if (elevation > -0.575) {
    const e = elevation;
    return (1735 + e * (-518.2 + e * (103.4 + e * (-12.79 + e * 0.711)))) / 3600;
  }
  return -20.772 / t / 3600;
}

/** Geometric elevation whose apparent elevation equals `apparent`. Inverts {@link refraction}. */
export function geometricFromApparent(apparent: number): number {
  let lo = apparent - 1;
  let hi = apparent + 0.01;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (mid + refraction(mid) < apparent) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const minutesOfUtcDay = (ms: number) => mod(ms, MS_PER_DAY) / MS_PER_MIN;

/** Hour angle (radians), declination (radians) and solar zenith (radians). */
function zenith(ms: number, lat: number, lon: number) {
  const { declination, eotMin } = declinationAndEot(ms);
  const trueSolar = mod(minutesOfUtcDay(ms) + eotMin + 4 * lon, MIN_PER_DAY);
  const hourAngle = (trueSolar / 4 - 180) * D2R;
  const la = lat * D2R;
  const cosZen = clamp(
    Math.sin(la) * Math.sin(declination) + Math.cos(la) * Math.cos(declination) * Math.cos(hourAngle),
    -1,
    1,
  );
  return { hourAngle, declination, zen: Math.acos(cosZen) };
}

export function solarPosition(ms: number, lat: number, lon: number): SunPosition {
  const { hourAngle, declination, zen } = zenith(ms, lat, lon);
  const la = lat * D2R;
  const elevation = 90 - zen * R2D;
  const cosAz = (Math.sin(la) * Math.cos(zen) - Math.sin(declination)) / (Math.cos(la) * Math.sin(zen));
  const az0 = Math.acos(clamp(Number.isFinite(cosAz) ? cosAz : 1, -1, 1)) * R2D;
  const azimuth = hourAngle > 0 ? mod(az0 + 180, 360) : mod(540 - az0, 360);
  return { elevation, apparentElevation: elevation + refraction(elevation), azimuth };
}

/** Apparent sun elevation: the value the pipeline uses for every band test. */
export function apparentElevation(ms: number, lat: number, lon: number): number {
  const elevation = 90 - zenith(ms, lat, lon).zen * R2D;
  return elevation + refraction(elevation);
}

/** The point on Earth with the Sun straight overhead. */
export function subsolarPoint(ms: number): LatLon {
  const { declination, eotMin } = declinationAndEot(ms);
  const lon = mod((720 - minutesOfUtcDay(ms) - eotMin) / 4 + 180, 360) - 180;
  return { lat: declination * R2D, lon };
}

/** UTC time for the planner clock: day `day` of `month` (0-based) at `hourUtc`. */
export function clockMs(month: number, hourUtc: number, year = SAMPLE_YEAR, day = SAMPLE_DAY): number {
  return Date.UTC(year, month, day) + hourUtc * 3_600_000;
}

/** ISO date of the pipeline's sample day for `month` (0-based), e.g. "2025-09-15". */
export function sampleDate(month: number, year = SAMPLE_YEAR, day = SAMPLE_DAY): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** UTC time of local mean solar midnight that starts `dateIso` at longitude `lon`. */
export function localDayStartMs(dateIso: string, lon: number): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - Math.round(lon * 240) * 1000;
}

/** Apparent elevations over one local mean solar day, every `stepMin` minutes from local midnight. */
export function sunDay(lat: number, lon: number, dateIso: string, stepMin = 10): number[] {
  const start = localDayStartMs(dateIso, lon);
  const out: number[] = [];
  for (let min = 0; min < MIN_PER_DAY; min += stepMin) {
    out.push(apparentElevation(start + min * MS_PER_MIN, lat, lon));
  }
  return out;
}

/**
 * Stretches of one local mean solar day with the apparent Sun inside [bandMin, bandMax],
 * at 1-minute steps. Same rule as the pipeline's `windows` field in each site file.
 */
export function bandWindows(
  lat: number,
  lon: number,
  dateIso: string,
  bandMax: number,
  bandMin = 0,
): MinuteWindow[] {
  const start = localDayStartMs(dateIso, lon);
  const windows: MinuteWindow[] = [];
  let runStart = -1;
  for (let min = 0; min <= MIN_PER_DAY; min++) {
    let inBand = false;
    if (min < MIN_PER_DAY) {
      const e = apparentElevation(start + min * MS_PER_MIN, lat, lon);
      inBand = e >= bandMin && e <= bandMax;
    }
    if (inBand && runStart < 0) runStart = min;
    if (!inBand && runStart >= 0) {
      windows.push([runStart, min]);
      runStart = -1;
    }
  }
  return windows;
}

export interface BandDay {
  /** Total time in the band, hours. */
  hours: number;
  /** Longest unbroken stretch, hours. */
  longestHours: number;
  windows: MinuteWindow[];
}

/** Time in the band on one local mean solar day. */
export function bandDay(lat: number, lon: number, dateIso: string, bandMax: number, bandMin = 0): BandDay {
  const windows = bandWindows(lat, lon, dateIso, bandMax, bandMin);
  let total = 0;
  let longest = 0;
  for (const [a, b] of windows) {
    total += b - a;
    longest = Math.max(longest, b - a);
  }
  return { hours: total / 60, longestHours: longest / 60, windows };
}

/* ---------- low-sun ring geometry ---------- */

/**
 * Geometric elevation limits of the ring for a band given in apparent elevation.
 * The globe shader works in geometric elevation, so it needs these values
 * (about −0.57° and band max − 0.13°) rather than the band itself.
 */
export function ringLimits(bandMax: number, bandMin = 0): [lower: number, upper: number] {
  return [geometricFromApparent(bandMin), geometricFromApparent(bandMax)];
}

/**
 * Points on the small circle where the Sun's geometric elevation is `elevation`:
 * the circle at angular distance 90° − elevation from the subsolar point.
 */
export function elevationCircle(subsolar: LatLon, elevation: number, segments = 180): LatLon[] {
  const p0 = subsolar.lat * D2R;
  const l0 = subsolar.lon * D2R;
  const dist = (90 - elevation) * D2R;
  const points: LatLon[] = [];
  for (let i = 0; i <= segments; i++) {
    const bearing = (i / segments) * 2 * Math.PI;
    const lat = Math.asin(
      Math.sin(p0) * Math.cos(dist) + Math.cos(p0) * Math.sin(dist) * Math.cos(bearing),
    );
    const lon =
      l0 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dist) * Math.cos(p0),
        Math.cos(dist) - Math.sin(p0) * Math.sin(lat),
      );
    points.push({ lat: lat * R2D, lon: mod(lon * R2D + 180, 360) - 180 });
  }
  return points;
}

export interface LowSunRing {
  subsolar: LatLon;
  /** Edge where the apparent Sun sits at the band minimum (the horizon side). */
  lower: LatLon[];
  /** Edge where the apparent Sun sits at the band maximum (the day side). */
  upper: LatLon[];
  /** Geometric elevation of each edge. */
  limits: [lower: number, upper: number];
}

/** The ring on Earth where the Sun is inside the band at time `ms`. */
export function lowSunRing(ms: number, bandMax: number, bandMin = 0, segments = 180): LowSunRing {
  const subsolar = subsolarPoint(ms);
  const limits = ringLimits(bandMax, bandMin);
  return {
    subsolar,
    lower: elevationCircle(subsolar, limits[0], segments),
    upper: elevationCircle(subsolar, limits[1], segments),
    limits,
  };
}
