/**
 * Planner model: the slice of index.json the planner needs, the ranking, and
 * the lighting for any searched point on Earth.
 */
import {
  maxScore,
  sourceList,
  type AnalogIndex,
  type BestWindow,
  type Preset,
  type SiteConditions,
  type SiteMeta,
  type SiteScores,
  type SourceRef,
  type Target,
  type TerrainMeta,
  type WeatherCellClass,
} from "./data.ts";
import { snowLimits, type GapIndex } from "./gap-fillers.ts";
import { centralAngle } from "./orbit.ts";
import { bandDay, bandWindows, clockMs, MIN_PER_DAY, sampleDate, solarPosition, type MinuteWindow } from "./sun.ts";

export type RankMode = "month" | "best";

/** Unbroken hours in the band that the usable-day rule needs. */
export const WINDOW_MIN_H = 2;

/** Satisfies GapIndex, so the planner passes it straight to the gap-fillers. */
export interface PlannerData extends GapIndex {
  sites: SiteMeta[];
  targets: Target[];
  presets: Preset[];
  objective: string;
  campaignDays: number;
  minUsableDays: number;
  /** scores[targetId][presetId][siteId] */
  scores: Record<string, Record<string, Record<string, SiteScores>>>;
  /** bandHours[targetId][siteId]: mean hours a day with the Sun in the band, per month. */
  bandHours: Record<string, Record<string, number[]>>;
  /** Monthly snow cover, wind chill and flags per site. */
  siteConditions: Record<string, SiteConditions>;
  cellNotes: Record<WeatherCellClass, string>;
  /** Top of the colour ramp: the highest monthly usable-day share anywhere. */
  maxScore: number;
  years: [first: number, last: number];
  /** Grid and box of the terrain slopes; null before they are calculated. */
  terrain: TerrainMeta | null;
  /** First and last day of the weather record, ISO dates. */
  record: [start: string, end: string];
  /** Day the pipeline built the data, ISO date. */
  generated: string;
  sources: SourceRef[];
}

export function toPlannerData(index: AnalogIndex): PlannerData {
  const bandHours: PlannerData["bandHours"] = {};
  for (const [t, bySite] of Object.entries(index.conditions)) {
    bandHours[t] = Object.fromEntries(Object.entries(bySite).map(([s, c]) => [s, c.band_hours]));
  }
  return {
    sites: index.sites,
    targets: index.targets,
    presets: index.presets,
    objective: index.objectives[0]?.name ?? "",
    campaignDays: index.campaign_days,
    minUsableDays: index.min_usable_days,
    scores: index.scores,
    bandHours,
    siteConditions: index.site_conditions,
    snowLimits: snowLimits(index),
    cellNotes: index.weather_cell_classes,
    maxScore: maxScore(index),
    years: [index.period.years[0], index.period.years[index.period.years.length - 1]],
    terrain: index.terrain ?? null,
    record: [index.period.start, index.period.end],
    generated: index.generated,
    sources: sourceList(index),
  };
}

/* ---------- ranking ---------- */

export interface RankedSite {
  site: SiteMeta;
  scores: SiteScores;
  /** The ranking value: expected usable days in a campaign (month mode) or the best window's held-out mean. */
  value: number;
  /** 1-based rank among sites with usable days; null for sites without any. */
  rank: number | null;
  bandHours: number;
}

/** Expected usable days in a campaign of `campaignDays` days within `month`. */
export const expectedDays = (scores: SiteScores, month: number, campaignDays: number) =>
  (scores.score[month] ?? 0) * campaignDays;

/**
 * Sites ordered for the planner list. Month mode ranks by the share of usable
 * days in the month, shown as expected usable days in a campaign; best-window
 * mode ranks by the best window's held-out mean. Ties go to more hours in the band.
 */
export function rankSites(
  data: PlannerData,
  targetId: string,
  presetId: string,
  month: number,
  mode: RankMode,
): RankedSite[] {
  const byPreset = data.scores[targetId]?.[presetId];
  if (!byPreset) throw new Error(`No scores for ${targetId} / ${presetId}`);
  const rows = data.sites.map((site) => {
    const scores = byPreset[site.id];
    const value =
      mode === "best" ? (scores.best_window?.held_out_mean ?? 0) : expectedDays(scores, month, data.campaignDays);
    return { site, scores, value, rank: null as number | null, bandHours: data.bandHours[targetId][site.id][month] };
  });
  rows.sort((a, b) => b.value - a.value || b.bandHours - a.bandHours || a.site.name.localeCompare(b.site.name));
  let rank = 0;
  for (const r of rows) if (r.value > 0) r.rank = ++rank;
  return rows;
}

/** For each month, the best usable-day share among all sites: the height of the clock's month bars. */
export function monthPeaks(data: PlannerData, targetId: string, presetId: string): number[] {
  const byPreset = data.scores[targetId][presetId];
  return Array.from({ length: 12 }, (_, m) => Math.max(0, ...data.sites.map((s) => byPreset[s.id].score[m] ?? 0)));
}

/** Colour-ramp position, 0–1, for a site in the current mode. */
export function rampPosition(row: RankedSite, data: PlannerData, month: number, mode: RankMode): number {
  if (mode === "best") return row.value / (data.maxScore * data.campaignDays || 1);
  return (row.scores.score[month] ?? 0) / (data.maxScore || 1);
}

/* ---------- searched points ---------- */

export interface PointLight {
  /** Hours with the Sun in the band on the sample day. */
  hours: number;
  longestHours: number;
  windows: MinuteWindow[];
  /** Hours in the band on the sample day of every month. */
  year: number[];
  /** Longest unbroken hours in the band on the sample day of every month. */
  yearLongest: number[];
}

/** Sun-band hours at any point, on the pipeline's sample day (the 15th) of `month`. */
export function pointLight(lat: number, lon: number, month: number, bandMax: number, bandMin = 0): PointLight {
  const days = Array.from({ length: 12 }, (_, m) => bandDay(lat, lon, sampleDate(m), bandMax, bandMin));
  const day = days[month];
  return {
    hours: day.hours,
    longestHours: day.longestHours,
    windows: day.windows,
    year: days.map((d) => d.hours),
    yearLongest: days.map((d) => d.longestHours),
  };
}

/** Apparent sun elevation at a point at the planner clock time. */
export const sunElevationAt = (lat: number, lon: number, month: number, hourUtc: number) =>
  solarPosition(clockMs(month, hourUtc), lat, lon).apparentElevation;

export interface Nearest {
  site: SiteMeta;
  km: number;
}

export function nearestSite(sites: SiteMeta[], lat: number, lon: number): Nearest {
  let best: Nearest | null = null;
  for (const site of sites) {
    const km = (centralAngle({ lat, lon }, site) * Math.PI * 6371) / 180;
    if (!best || km < best.km) best = { site, km };
  }
  if (!best) throw new Error("No sites");
  return best;
}

/* ---------- clock ---------- */

/** UTC hour of local mean solar time `minutes` after midnight at longitude `lon`. */
export const utcHourOfLocal = (minutes: number, lon: number) =>
  ((((minutes / 60 - lon / 15) % 24) + 24) % 24);

/** Local mean solar time, hours, at longitude `lon` for a UTC hour. */
export const localHourOfUtc = (hourUtc: number, lon: number) => ((((hourUtc + lon / 15) % 24) + 24) % 24);

/**
 * A clock hour (UTC) that puts `lat, lon` inside the low-sun ring on the 15th
 * of `month`: the middle of its longest band window, or local noon if it has none.
 */
export function ringHour(lat: number, lon: number, month: number, bandMax: number): number {
  const windows = bandWindows(lat, lon, sampleDate(month), bandMax);
  if (!windows.length) return utcHourOfLocal(MIN_PER_DAY / 2, lon);
  const [a, b] = windows.reduce((best, w) => (w[1] - w[0] > best[1] - best[0] ? w : best));
  return Math.round(utcHourOfLocal((a + b) / 2, lon) * 12) / 12;
}

/** The best window for a site, if the site has one with usable days. */
export const usableWindow = (bw: BestWindow | null) => (bw && bw.held_out_mean > 0 ? bw : null);
