/**
 * Figures for the methods page: the validation checks and the counts the
 * method and limits sections quote. Every figure is read from the pipeline
 * output, so the page cannot drift from the data.
 */
import {
  bandHoursFor,
  DEFAULT_CHILL,
  DEFAULT_CLOUD,
  DEFAULT_TARGET,
  FEATURED_SITE,
  getPreset,
  getSite,
  presetId,
  scoresFor,
  type AnalogIndex,
  type BestWindow,
  type Level,
  type SiteDetail,
  type SiteMeta,
  type WeatherCellClass,
} from "./data.ts";
import { expectedDays } from "./planner.ts";

/** Public repository; check cards link to the tests that run them. */
export const REPO_URL = "https://github.com/Ansul-S/nasa-space-apps-2026";
export const repoFile = (path: string) => `${REPO_URL}/blob/main/${path}`;

/** The sites the checks read in detail. */
export const METHODS_SITE_IDS = {
  arizona: "sf-volcanic-field",
  svalbard: "svalbard",
  ellesmere: FEATURED_SITE,
  devon: "devon-island",
} as const;

export type MethodsSiteKey = keyof typeof METHODS_SITE_IDS;

const MARCH = 2;
const APRIL = 3;
const AUGUST = 7;

/**
 * Tolerances of the sun-engine tests: pipeline/tests/test_sun.py (against
 * NREL SPA through pvlib) and web/src/lib/sun.test.ts (browser engine against
 * the pipeline output). Keep in step with those files.
 */
export const SUN_TESTS = {
  spaSites: 3,
  spaYear: 2024,
  spaElevationDeg: 0.02,
  spaAzimuthDeg: 0.1,
  spaBandDeg: 0.1,
  browserElevationDeg: 0.05,
  browserBandHours: 0.005,
} as const;

/**
 * A documented field season at a well-known analog site: the 2010 season of
 * the Haughton-Mars Project on Devon Island began on 19 July and ran three
 * weeks (NASA news release, reprinted by ScienceDaily on 29 July 2010). Months are 0-based.
 */
export const FIELD_SEASON = {
  site: METHODS_SITE_IDS.devon,
  name: "Haughton-Mars Project",
  months: [6, 7],
  detail: "The 2010 season began on 19 July and ran three weeks.",
  sourceName: "NASA news release, ScienceDaily, 29 July 2010",
  url: "https://www.sciencedaily.com/releases/2010/07/100726142951.htm",
} as const;

export interface MarchApril {
  targetId: string;
  targetName: string;
  presetId: string;
  presetLabel: string;
  /** Expected usable days of a campaign starting in the month. */
  march: number;
  april: number;
}

export interface MethodsData {
  years: [first: number, last: number];
  campaignDays: number;
  minUsableDays: number;
  siteCount: number;
  targetCount: number;
  presetCount: number;
  /** Data products read by the pipeline; the calculated sun position is not one. */
  sourceCount: number;
  sites: Record<MethodsSiteKey, SiteMeta>;
  arizona: {
    /** Months × targets × presets checked, and how many had any usable day. */
    cases: number;
    usableCases: number;
    /** Mean hours a day with the Sun in the default target's band, highest month. */
    bandHoursMax: number;
    /** Longest unbroken stretch in the band in any month, for any target. */
    longestWindowMax: number;
    /** Kolmogorov-Smirnov distance of slopes against the default target, and its level. */
    terrainKs: number | null;
    terrainLevel: Level;
  };
  svalbard: {
    cases: number;
    zeroMedianCases: number;
    /** Highest expected usable days in August over every target and preset. */
    expectedMax: number;
    cloudMeanPct: number;
  };
  /** Ellesmere Island, March against April at the default wind-chill limit. */
  ellesmere: MarchApril[];
  heldOut: {
    /** Best windows over every site, target and preset. */
    count: number;
    meanInflation: number;
    maxInflation: number;
    /** Windows whose held-out mean is above the in-sample mean. */
    aboveInSample: number;
    /** The featured site's best window at the defaults. */
    example: BestWindow;
  };
  fieldSeason: {
    /** Monthly snow cover at the site, null when not measured. */
    snowPct: (number | null)[];
    snowFreeMonths: number[];
    /** Every field-season month is snow-free in the data. */
    holds: boolean;
  };
  cells: Record<WeatherCellClass, number>;
}

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export function toMethodsData(index: AnalogIndex, details: Record<MethodsSiteKey, SiteDetail>): MethodsData {
  const site = (key: MethodsSiteKey) => {
    const s = getSite(index, METHODS_SITE_IDS[key]);
    if (!s) throw new Error(`Methods site ${METHODS_SITE_IDS[key]} is missing from index.json`);
    return s;
  };
  const targets = index.targets;
  const presets = index.presets;
  const defaultPreset = getPreset(index, presetId(DEFAULT_CLOUD, DEFAULT_CHILL));

  // Arizona: no usable day in any month, for any target or preset.
  const az = METHODS_SITE_IDS.arizona;
  let azCases = 0;
  let azUsable = 0;
  for (const t of targets)
    for (const p of presets)
      for (const v of scoresFor(index, t.id, p.id, az).score) {
        azCases++;
        if (v > 0) azUsable++;
      }
  const azDetail = details.arizona.targets;
  const azTerrain = azDetail[DEFAULT_TARGET].terrain;

  // Svalbard in August: a typical campaign has no usable day.
  const sv = METHODS_SITE_IDS.svalbard;
  const svCases = targets.flatMap((t) => presets.map((p) => scoresFor(index, t.id, p.id, sv)));

  // Ellesmere: April beats March at the default wind-chill limit.
  const chill = defaultPreset.wind_chill_min_c;
  const ellesmere: MarchApril[] = targets.flatMap((t) =>
    presets
      .filter((p) => p.wind_chill_min_c === chill)
      .map((p) => {
        const s = scoresFor(index, t.id, p.id, METHODS_SITE_IDS.ellesmere);
        return {
          targetId: t.id,
          targetName: t.name,
          presetId: p.id,
          presetLabel: p.label,
          march: expectedDays(s, MARCH, index.campaign_days),
          april: expectedDays(s, APRIL, index.campaign_days),
        };
      }),
  );

  // Best windows: how much choosing the best of 365 start days flatters the mean.
  const windows: BestWindow[] = [];
  for (const t of targets)
    for (const p of presets)
      for (const s of index.sites) {
        const bw = index.scores[t.id][p.id][s.id].best_window;
        if (bw) windows.push(bw);
      }
  const inflation = windows.map((w) => w.mean - w.held_out_mean);
  const example = scoresFor(index, DEFAULT_TARGET, defaultPreset.id, FEATURED_SITE).best_window;
  if (!example) throw new Error(`${FEATURED_SITE} has no best window`);

  // Field season: the documented months should be snow-free in the data.
  const snowPct = index.site_conditions[FIELD_SEASON.site].snow_pct;
  const snowFreeMonths = snowPct.flatMap((v, m) => (v != null && v < index.thresholds.snow_free_pct ? [m] : []));

  const cells: Record<WeatherCellClass, number> = { representative: 0, mixed: 0, not_representative: 0 };
  for (const s of index.sites) cells[s.weather_cell_class]++;

  return {
    years: [index.period.years[0], index.period.years[index.period.years.length - 1]],
    campaignDays: index.campaign_days,
    minUsableDays: index.min_usable_days,
    siteCount: index.sites.length,
    targetCount: targets.length,
    presetCount: presets.length,
    sourceCount: Object.keys(index.sources).filter((id) => id !== "sun").length,
    sites: { arizona: site("arizona"), svalbard: site("svalbard"), ellesmere: site("ellesmere"), devon: site("devon") },
    arizona: {
      cases: azCases,
      usableCases: azUsable,
      bandHoursMax: Math.max(...bandHoursFor(index, DEFAULT_TARGET, az)),
      longestWindowMax: Math.max(...targets.flatMap((t) => azDetail[t.id].months.map((m) => m.longest_window_hours))),
      terrainKs: azTerrain?.ks ?? null,
      terrainLevel: azTerrain?.level ?? "not_calculated",
    },
    svalbard: {
      cases: svCases.length,
      zeroMedianCases: svCases.filter((s) => s.median[AUGUST] === 0).length,
      expectedMax: Math.max(...svCases.map((s) => expectedDays(s, AUGUST, index.campaign_days))),
      cloudMeanPct: index.site_conditions[sv].cloud_mean_pct[AUGUST],
    },
    ellesmere,
    heldOut: {
      count: windows.length,
      meanInflation: round(inflation.reduce((a, b) => a + b, 0) / inflation.length, 2),
      maxInflation: round(Math.max(...inflation), 2),
      aboveInSample: inflation.filter((d) => d < 0).length,
      example,
    },
    fieldSeason: {
      snowPct,
      snowFreeMonths,
      holds: FIELD_SEASON.months.every((m) => snowFreeMonths.includes(m)),
    },
    cells,
  };
}
