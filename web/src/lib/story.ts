/**
 * The numbers the landing story quotes. Every figure is read from the
 * pipeline output, so the text cannot drift from the data.
 */
import {
  bandHoursFor,
  DEFAULT_CHILL,
  DEFAULT_CLOUD,
  DEFAULT_TARGET,
  FEATURED_SITE,
  getPreset,
  getSite,
  getTarget,
  presetId,
  scoresFor,
  type AnalogIndex,
  type BestWindow,
  type Level,
  type Preset,
  type SiteDetail,
  type SiteMeta,
  type Target,
  type WeatherCell,
} from "./data.ts";
import type { OrbitView } from "./orbit.ts";
import { expectedDays, ringHour, utcHourOfLocal } from "./planner.ts";
import { clockMs, SAMPLE_YEAR, type MinuteWindow } from "./sun.ts";

/** September: the sample day is 15 September, in the featured site's best season. */
export const STORY_MONTH = 8;
const APRIL = 3;
const JULY = 6;
const AUGUST = 7;

/** The sites the story visits, in order. */
export const STORY_SITE_IDS = {
  arizona: "sf-volcanic-field",
  ellesmere: FEATURED_SITE,
  svalbard: "svalbard",
  devon: "devon-island",
} as const;

export type StorySiteKey = keyof typeof STORY_SITE_IDS;

export interface StoryDay {
  /** ISO date of the sample day. */
  date: string;
  /** Apparent sun elevation from local solar midnight, every `stepMin` minutes. */
  elevation: number[];
  /** Minutes after local solar midnight with the Sun in the band, end exclusive. */
  windows: MinuteWindow[];
}

export interface StoryData {
  target: Target;
  preset: Preset;
  campaignDays: number;
  minUsableDays: number;
  /** A usable day needs this many unbroken hours with the Sun in the band. */
  windowMinHours: number;
  years: [first: number, last: number];
  /** Earth days for the Sun to circle the horizon once at the target. */
  lunarDayDays: number;
  stepMin: number;
  sites: Record<StorySiteKey, SiteMeta>;
  /** 15 September at the Arizona test site and inland Ellesmere Island. */
  days: { arizona: StoryDay; ellesmere: StoryDay };
  svalbardAugust: { expected: number; bandHours: number; clearShare: number; clearSky: Level };
  ellesmereApril: {
    expected: number;
    bandHours: number;
    windChillMedian: number;
    windChillOkShare: number;
    windChill: Level;
  };
  ellesmereBest: BestWindow;
  /** Match levels in the best window's month. */
  ellesmereBestLevels: { sunBand: Level; windChill: Level; clearSky: Level };
  ellesmereCell: WeatherCell;
  /** July on Devon Island; `sunMin` is the lowest sun elevation of the month, degrees. */
  devonJuly: { expected: number; bandHours: number; cloudMean: number; sunMin: number };
  devonBest: BestWindow;
}

/** Minutes in each band window. */
export const windowMinutes = (windows: MinuteWindow[]) => windows.map(([a, b]) => b - a);

export function toStoryData(index: AnalogIndex, details: Record<StorySiteKey, SiteDetail>): StoryData {
  const target = getTarget(index, DEFAULT_TARGET);
  const preset = getPreset(index, presetId(DEFAULT_CLOUD, DEFAULT_CHILL));
  const cloud = String(preset.cloud_max_pct) as "30" | "50";
  const chill = String(preset.wind_chill_min_c) as "-28" | "-40";

  const site = (key: StorySiteKey) => {
    const s = getSite(index, STORY_SITE_IDS[key]);
    if (!s) throw new Error(`Story site ${STORY_SITE_IDS[key]} is missing from index.json`);
    return s;
  };
  const scores = (key: StorySiteKey) => scoresFor(index, target.id, preset.id, STORY_SITE_IDS[key]);
  const bandHours = (key: StorySiteKey, month: number) => bandHoursFor(index, target.id, STORY_SITE_IDS[key])[month];
  const expected = (key: StorySiteKey, month: number) => expectedDays(scores(key), month, index.campaign_days);
  const best = (key: StorySiteKey) => {
    const bw = scores(key).best_window;
    if (!bw) throw new Error(`${STORY_SITE_IDS[key]} has no best window`);
    return bw;
  };
  const level = (key: StorySiteKey, month: number, row: string): Level => {
    const l = details[key].targets[target.id].presets[preset.id].months[month].levels[row];
    if (!l) throw new Error(`${STORY_SITE_IDS[key]}: no ${row} level in month ${month + 1}`);
    return l;
  };
  const day = (key: StorySiteKey): StoryDay => {
    const m = details[key].sun_samples.months[STORY_MONTH];
    return { date: m.date, elevation: m.elevation, windows: m.windows[target.id] ?? [] };
  };

  const ellesmereApril = details.ellesmere.months[APRIL];
  const stepMin = details.ellesmere.sun_samples.step_min;
  if (details.arizona.sun_samples.step_min !== stepMin) throw new Error("Story sun samples differ in step");

  return {
    target,
    preset,
    campaignDays: index.campaign_days,
    minUsableDays: index.min_usable_days,
    windowMinHours: Number(index.rule.window_min_h),
    years: [index.period.years[0], index.period.years[index.period.years.length - 1]],
    lunarDayDays: 360 / target.sun_rate_deg_per_h / 24,
    stepMin,
    sites: { arizona: site("arizona"), ellesmere: site("ellesmere"), svalbard: site("svalbard"), devon: site("devon") },
    days: { arizona: day("arizona"), ellesmere: day("ellesmere") },
    svalbardAugust: {
      expected: expected("svalbard", AUGUST),
      bandHours: bandHours("svalbard", AUGUST),
      clearShare: details.svalbard.months[AUGUST].clear_hours_share[cloud],
      clearSky: level("svalbard", AUGUST, "clear_sky"),
    },
    ellesmereApril: {
      expected: expected("ellesmere", APRIL),
      bandHours: bandHours("ellesmere", APRIL),
      windChillMedian: ellesmereApril.wind_chill_median_c,
      windChillOkShare: ellesmereApril.wind_chill_ok_share[chill],
      windChill: level("ellesmere", APRIL, "wind_chill"),
    },
    ellesmereBest: best("ellesmere"),
    ellesmereBestLevels: (() => {
      const month = Number(best("ellesmere").start.slice(0, 2)) - 1;
      return {
        sunBand: level("ellesmere", month, "sun_band"),
        windChill: level("ellesmere", month, "wind_chill"),
        clearSky: level("ellesmere", month, "clear_sky"),
      };
    })(),
    ellesmereCell: details.ellesmere.grid.merra2_cell,
    devonJuly: {
      expected: expected("devon", JULY),
      bandHours: bandHours("devon", JULY),
      cloudMean: details.devon.months[JULY].cloud_mean_pct,
      sunMin: details.devon.months[JULY].sun_min_deg,
    },
    devonBest: best("devon"),
  };
}

/* ---------- the ring story's globe ---------- */

/**
 * How the globe's clock runs during one step. "day" loops a stretch of the
 * sample day (UTC hours, `rate` clock hours per second); "year" keeps the
 * hour and steps through the year from the sample day (`rate` days per second).
 */
export type RingClock = DayClock | { kind: "year"; hour: number; rate: number };
type DayClock = { kind: "day"; from: number; to: number; rate: number; still: number };

export interface RingStep {
  view: OrbitView;
  clock: RingClock;
  /** Story sites whose labels show. */
  show: ("arizona" | "ellesmere")[];
}

const DAY_MS = 86_400_000;
const YEAR_START = Date.UTC(SAMPLE_YEAR, 0, 1);

/**
 * The clock, as UTC milliseconds, `seconds` into a step. With `seconds` null
 * (reduced motion) it returns the step's still frame.
 */
export function ringTime(clock: RingClock, seconds: number | null): number {
  if (clock.kind === "day") {
    const hour = seconds == null ? clock.still : clock.from + ((seconds * clock.rate) % (clock.to - clock.from));
    return clockMs(STORY_MONTH, hour);
  }
  const start = clockMs(STORY_MONTH, clock.hour);
  if (seconds == null) return start;
  const day0 = Math.floor((start - YEAR_START) / DAY_MS);
  const day = Math.floor(day0 + seconds * clock.rate) % 365;
  return YEAR_START + day * DAY_MS + clock.hour * 3_600_000;
}

/** A loop over the first band window of the sample day, padded on both sides. */
function windowClock(day: StoryDay, lon: number, padHours: number, rate: number): DayClock {
  const [start, end] = day.windows[0];
  const from = utcHourOfLocal(start, lon);
  const to = from + (end - start) / 60;
  return { kind: "day", from: from - padHours, to: to + padHours, rate, still: (from + to) / 2 };
}

/** The four steps: the ring sweeping the Earth, Arizona, Ellesmere, then the seasons. */
export function ringSteps(story: StoryData): RingStep[] {
  const { arizona, ellesmere } = story.sites;
  const bandMax = story.target.band_max_deg;
  return [
    {
      view: { lat: 38, lon: -95, dist: 4.6 },
      clock: { kind: "day", from: 0, to: 24, rate: 2.4, still: windowClock(story.days.arizona, arizona.lon, 0, 0).still },
      show: [],
    },
    {
      view: { lat: arizona.lat, lon: arizona.lon, dist: 2.3 },
      clock: windowClock(story.days.arizona, arizona.lon, 0.6, 0.22),
      show: ["arizona"],
    },
    {
      view: { lat: ellesmere.lat - 4, lon: ellesmere.lon, dist: 2.6 },
      clock: windowClock(story.days.ellesmere, ellesmere.lon, 0.75, 0.45),
      show: ["ellesmere"],
    },
    {
      view: { lat: 58, lon: -92, dist: 3.7 },
      clock: { kind: "year", hour: ringHour(ellesmere.lat, ellesmere.lon, STORY_MONTH, bandMax), rate: 20 },
      show: ["arizona", "ellesmere"],
    },
  ];
}
