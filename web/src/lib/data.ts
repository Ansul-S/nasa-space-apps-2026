/**
 * Types and helpers for the pipeline output in public/data.
 *
 * index.json holds the ranking data for every site; sites/<id>.json holds one
 * site's month-by-month detail. Both are written by pipeline/src/analog_pipeline/build.py
 * (schema_version 1). This module is safe to import from client and server code;
 * server-only file reads live in data.server.ts.
 */

export const DATA_BASE = "/data";
export const SCHEMA_VERSION = 1;

/* ---------- shared vocabulary ---------- */

export type Level = "match" | "partial" | "breaks_down" | "impossible" | "not_calculated";
export type WeatherCellClass = "representative" | "mixed" | "not_representative";
export type SiteRole = "validation" | "candidate";
export type MonthFlag = "polar_night" | "extreme_cold";
export type SnowClass = "snow_free" | "patchy" | "snow_covered";
export type CloudLimit = "30" | "50";
export type ChillLimit = "-28" | "-40";

/** Twelve values, January first. */
export type Monthly<T> = T[];

export interface Period {
  start: string;
  end: string;
  days: number;
  years: number[];
}

/** Slope in a box around a target or site, on the grid in `AnalogIndex.terrain`. Null before it is calculated. */
export interface TerrainStats {
  /** Share of the box that is land (the rest is sea). */
  land_share: number;
  median_slope_deg: number;
  p90_slope_deg: number;
  /** Share of the box steeper than `TerrainMeta.steep_deg`. */
  steep_share: number;
  /** Highest minus lowest point in the box. */
  relief_m: number;
  /** Share of the box in each bin of `TerrainMeta.hist_edges_deg`, plus one bin above the last edge. */
  hist_share: number[];
}

export interface TerrainMeta {
  method: string;
  grid_m: number;
  box_km: number;
  steep_deg: number;
  hist_edges_deg: number[];
}

export interface Target {
  id: string;
  name: string;
  body: "moon";
  lat: number;
  lon: number;
  band_min_deg: number;
  band_max_deg: number;
  sun_rate_deg_per_h: number;
  terrain?: TerrainStats | null;
}

export interface Objective {
  id: string;
  name: string;
  seasonal_conditions: string[];
}

export interface Preset {
  id: string;
  label: string;
  cloud_max_pct: number;
  wind_chill_min_c: number;
  default: boolean;
  warning: string | null;
}

export interface FidelityRow {
  id: string;
  label: string;
  kind: "fidelity" | "earth_only" | "operations";
  source?: string;
  /** Fixed level for rows that do not depend on the site or month. */
  level?: Level;
  note?: string;
}

export interface Source {
  name: string;
  detail: string;
  url: string;
}

export interface SiteMeta {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  role: SiteRole;
  known_analog: boolean;
  utc_offset_solar_h: number;
  weather_cell_class: WeatherCellClass;
  terrain?: TerrainStats | null;
}

/** Usable days in a 14-day campaign. */
export interface Odds {
  mean: number;
  median: number;
  p10: number;
  p90: number;
  /** Chance of at least `min_usable_days` usable days. */
  p_at_least: number;
  n: number;
}

export interface BestWindow extends Odds {
  /** "MM-DD". */
  start: string;
  end: string;
  /** Expected usable days, each year scored on a window chosen without it. Quote this one. */
  held_out_mean: number;
}

export interface SiteScores {
  /** Share of usable days for a campaign starting in each month. */
  score: Monthly<number>;
  median: Monthly<number>;
  p10: Monthly<number>;
  p90: Monthly<number>;
  p_at_least: Monthly<number>;
  best_window: BestWindow | null;
}

export interface SiteBandConditions {
  band_hours: Monthly<number>;
  window_days_share: Monthly<number>;
}

export interface SiteConditions {
  cloud_mean_pct: Monthly<number>;
  snow_pct: Monthly<number | null>;
  wind_chill_median_c: Monthly<number>;
  flags: Monthly<MonthFlag[]>;
}

export interface AnalogIndex {
  schema_version: number;
  generated: string;
  period: Period;
  campaign_days: number;
  min_usable_days: number;
  targets: Target[];
  objectives: Objective[];
  presets: Preset[];
  rule: Record<string, string | number>;
  thresholds: Record<string, number>;
  levels: Record<Level, string>;
  weather_cell_classes: Record<WeatherCellClass, string>;
  fidelity_rows: FidelityRow[];
  sources: Record<string, Source>;
  /** Grid and box of the terrain statistics; null before they are calculated. */
  terrain?: TerrainMeta | null;
  sites: SiteMeta[];
  /** scores[targetId][presetId][siteId] */
  scores: Record<string, Record<string, Record<string, SiteScores>>>;
  /** conditions[targetId][siteId] */
  conditions: Record<string, Record<string, SiteBandConditions>>;
  site_conditions: Record<string, SiteConditions>;
}

/* ---------- sites/<id>.json ---------- */

export interface WeatherCell {
  lat: number;
  lon: number;
  land: number;
  land_ice: number;
  ocean: number;
  lake: number;
  elevation_m: number;
  class: WeatherCellClass;
  note: string;
}

export interface SiteMonth {
  month: number;
  sun_min_deg: number;
  sun_max_deg: number;
  polar_night_share: number;
  cloud_mean_pct: number;
  clear_hours_share: Record<CloudLimit, number>;
  dry_days_share: number;
  t2m_mean_c: number;
  wind_mean_ms: number;
  wind_chill_median_c: number;
  wind_chill_p10_c: number;
  wind_chill_ok_share: Record<ChillLimit, number>;
  snow_pct: number | null;
  snow_class: SnowClass | null;
  snow_years: (number | null)[];
  flags: MonthFlag[];
}

export interface TargetMonth {
  month: number;
  band_hours: number;
  longest_window_hours: number;
  window_days_share: number;
  /** Null when the Sun never enters the band that month. */
  sun_rate_deg_per_h: number | null;
  level: Level;
}

export interface PresetMonth {
  month: number;
  usable_share: number;
  score: number;
  odds: Odds & { years: number[] };
  levels: Partial<Record<string, Level>>;
}

export interface SunSampleMonth {
  date: string;
  /** Apparent elevation from local mean solar midnight, every `step_min` minutes. */
  elevation: number[];
  azimuth: number[];
  /** windows[targetId]: minutes after local midnight, end exclusive. */
  windows: Record<string, [number, number][]>;
}

export interface SiteDetail {
  schema_version: number;
  site: SiteMeta;
  grid: {
    merra2_cell: WeatherCell;
    merra2_deg: [number, number];
    ceres_deg: number;
    modis_window_km: number;
  };
  snow_note: string | null;
  period: Period;
  months: Monthly<SiteMonth>;
  /** targets[targetId] */
  targets: Record<
    string,
    {
      months: Monthly<TargetMonth>;
      presets: Record<string, { months: Monthly<PresetMonth>; best_window: BestWindow | null }>;
      /** One hex digit per day: bit i is set when preset i allows a usable day. */
      daily_usable: string;
      /** Kolmogorov-Smirnov distance between the site's and the target's slope distributions, and its level. */
      terrain?: { ks: number | null; level: Level };
    }
  >;
  sun_samples: { time: string; step_min: number; months: Monthly<SunSampleMonth> };
}

/* ---------- planner choices ---------- */

export type CloudChoice = "strict" | "relaxed";
export type ChillChoice = "28" | "40";

export const DEFAULT_TARGET = "mons-mouton";
export const DEFAULT_CLOUD: CloudChoice = "strict";
export const DEFAULT_CHILL: ChillChoice = "28";
export const FEATURED_SITE = "ellesmere-inland";

/** Preset id for a cloud and wind-chill choice, e.g. "strict-28". */
export const presetId = (cloud: CloudChoice, chill: ChillChoice) => `${cloud}-${chill}`;
export const cloudLimit = (cloud: CloudChoice): CloudLimit => (cloud === "strict" ? "30" : "50");
export const chillLimit = (chill: ChillChoice): ChillLimit => `-${chill}`;

/* ---------- lookups ---------- */

export function getSite(index: AnalogIndex, id: string): SiteMeta | undefined {
  return index.sites.find((s) => s.id === id);
}

export function getTarget(index: AnalogIndex, id: string): Target {
  const t = index.targets.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown target: ${id}`);
  return t;
}

export function getPreset(index: AnalogIndex, id: string): Preset {
  const p = index.presets.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset: ${id}`);
  return p;
}

export function scoresFor(index: AnalogIndex, targetId: string, preset: string, siteId: string): SiteScores {
  const s = index.scores[targetId]?.[preset]?.[siteId];
  if (!s) throw new Error(`No scores for ${targetId} / ${preset} / ${siteId}`);
  return s;
}

export const bandHoursFor = (index: AnalogIndex, targetId: string, siteId: string): Monthly<number> =>
  index.conditions[targetId][siteId].band_hours;

/** Highest monthly usable-day share anywhere, rounded up to 0.05: the top of the colour ramp. */
export function maxScore(index: AnalogIndex): number {
  let max = 0;
  for (const byPreset of Object.values(index.scores))
    for (const bySite of Object.values(byPreset))
      for (const s of Object.values(bySite)) for (const v of s.score) max = Math.max(max, v || 0);
  return Math.ceil(max * 20) / 20;
}

/** A data source as the CSV files and the print card list it. */
export interface SourceRef {
  id: string;
  name: string;
  url: string;
}

/** Every data source, in the order of index.json. */
export const sourceList = (index: AnalogIndex): SourceRef[] =>
  Object.entries(index.sources).map(([id, s]) => ({ id, name: s.name, url: s.url }));

/** Display name of a fidelity source, without its version detail. */
export function sourceName(index: AnalogIndex, sourceId: string | undefined): string {
  if (!sourceId) return "";
  const s = index.sources[sourceId];
  return s ? s.name.split(" (")[0].split(",")[0] : "";
}

/* ---------- client loading ---------- */

const cache = new Map<string, Promise<unknown>>();

function fetchJson<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${DATA_BASE}/${path}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${path} (HTTP ${r.status})`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p;
}

/** Load index.json in the browser. Cached for the session. */
export const fetchIndex = () => fetchJson<AnalogIndex>("index.json");

/** Load one site's detail file in the browser. Cached for the session. */
export const fetchSite = (id: string) => fetchJson<SiteDetail>(`sites/${encodeURIComponent(id)}.json`);
