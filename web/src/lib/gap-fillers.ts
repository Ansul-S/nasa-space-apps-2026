/**
 * Lighting gap-fillers: for a place that lacks the low Sun, the calculated
 * sites and windows that provide it, and what each one costs in snow and cold.
 * Pure functions over index.json, shared by the planner and the site page.
 */
import type { AnalogIndex, BestWindow, Level, Monthly, SiteConditions, SiteMeta, SnowClass } from "./data.ts";
import { distanceKm } from "./orbit.ts";

/** Expected usable days a window must give to be offered. */
export const MIN_GAP_DAYS = 1;

export interface GapScores {
  /** Share of usable days for a campaign starting in each month. */
  score: Monthly<number>;
  best_window: Pick<BestWindow, "start" | "end" | "held_out_mean"> | null;
}

/** The slice of index.json the gap-fillers read. PlannerData satisfies it as is. */
export interface GapIndex {
  sites: SiteMeta[];
  campaignDays: number;
  /** scores[targetId][presetId][siteId] */
  scores: Record<string, Record<string, Record<string, GapScores>>>;
  siteConditions: Record<string, Pick<SiteConditions, "snow_pct" | "wind_chill_median_c">>;
  /** Snow cover limits, %: below `free` is snow-free, from `covered` up is snow-covered. */
  snowLimits: { free: number; covered: number };
}

export const snowLimits = (index: AnalogIndex): GapIndex["snowLimits"] => ({
  free: index.thresholds.snow_free_pct,
  covered: index.thresholds.snow_covered_pct,
});

/** Only the fields the gap-fillers read, for pages that ship them to the browser. */
export function toGapIndex(index: AnalogIndex): GapIndex {
  const scores: GapIndex["scores"] = {};
  for (const [t, byPreset] of Object.entries(index.scores)) {
    scores[t] = {};
    for (const [p, bySite] of Object.entries(byPreset)) {
      scores[t][p] = {};
      for (const [s, sc] of Object.entries(bySite)) {
        const bw = sc.best_window;
        scores[t][p][s] = {
          score: sc.score,
          best_window: bw ? { start: bw.start, end: bw.end, held_out_mean: bw.held_out_mean } : null,
        };
      }
    }
  }
  const siteConditions: GapIndex["siteConditions"] = {};
  for (const [s, c] of Object.entries(index.site_conditions)) {
    siteConditions[s] = { snow_pct: c.snow_pct, wind_chill_median_c: c.wind_chill_median_c };
  }
  return { sites: index.sites, campaignDays: index.campaign_days, scores, siteConditions, snowLimits: snowLimits(index) };
}

/* ---------- picks ---------- */

/** Why a window is offered: the most usable days, the closest with any, or the top site in the chosen month. */
export type GapReason = "most" | "closest" | "month";

export interface GapFiller {
  site: SiteMeta;
  reasons: GapReason[];
  /** Expected usable days in one campaign. */
  days: number;
  /** The best 14-day window, "MM-DD"; null for a month pick. */
  window: { start: string; end: string } | null;
  /** Month (0-based) whose snow and wind chill are quoted: the window's middle day, or the picked month. */
  month: number;
  km: number;
  snowPct: number | null;
  snowClass: SnowClass | null;
  windChillC: number;
}

export interface GapResult {
  fillers: GapFiller[];
  /** True when no site averages `MIN_GAP_DAYS` usable days in the chosen month. */
  monthEmpty: boolean;
  /** True when every offered window with measured snow is snow-covered, and at least one is measured. */
  allSnow: boolean;
  /** True when snow is not measured for at least one offered window. */
  someUnmeasured: boolean;
}

export interface GapQuery {
  targetId: string;
  presetId: string;
  /** The place that lacks the light. */
  lat: number;
  lon: number;
  /** Month (0-based) for the month pick. */
  month: number;
  /** A calculated site to leave out: the place itself. */
  excludeId?: string;
}

export function snowClassOf(pct: number | null, limits: GapIndex["snowLimits"]): SnowClass | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct < limits.free) return "snow_free";
  if (pct < limits.covered) return "patchy";
  return "snow_covered";
}

/** Fidelity level of the ground for a snow class, as the pipeline sets it. */
export const SNOW_LEVEL: Record<SnowClass | "none", Level> = {
  snow_free: "match",
  patchy: "partial",
  snow_covered: "breaks_down",
  none: "not_calculated",
};

/** Month (0-based) of the middle day of a `days`-long window starting "MM-DD". */
export function windowMidMonth(start: string, days: number): number {
  const [m, d] = start.split("-").map(Number);
  return new Date(Date.UTC(2025, m - 1, d + Math.floor(days / 2))).getUTCMonth();
}

/**
 * Up to three calculated sites that give the low Sun this place lacks: the
 * window with the most usable days, the closest window with at least
 * `MIN_GAP_DAYS`, and the top site in the chosen month. A site picked for two
 * reasons with the same window is listed once.
 */
export function lightingGapFillers(gi: GapIndex, q: GapQuery): GapResult {
  const bySite = gi.scores[q.targetId]?.[q.presetId];
  if (!bySite) throw new Error(`No scores for ${q.targetId} / ${q.presetId}`);
  const days = gi.campaignDays;

  const candidates = gi.sites
    .filter((s) => s.id !== q.excludeId && bySite[s.id])
    .map((site) => ({ site, sc: bySite[site.id], km: distanceKm(q, site) }));

  const make = (c: (typeof candidates)[number], reason: GapReason, value: number, month: number, window: GapFiller["window"]): GapFiller => {
    const cond = gi.siteConditions[c.site.id];
    const snowPct = cond?.snow_pct[month] ?? null;
    return {
      site: c.site,
      reasons: [reason],
      days: value,
      window,
      month,
      km: c.km,
      snowPct,
      snowClass: snowClassOf(snowPct, gi.snowLimits),
      windChillC: cond?.wind_chill_median_c[month] ?? Number.NaN,
    };
  };

  const fromWindow = (c: (typeof candidates)[number], reason: GapReason) => {
    const bw = c.sc.best_window!;
    return make(c, reason, bw.held_out_mean, windowMidMonth(bw.start, days), { start: bw.start, end: bw.end });
  };

  const withWindow = candidates.filter((c) => (c.sc.best_window?.held_out_mean ?? 0) >= MIN_GAP_DAYS);
  const most = [...withWindow].sort(
    (a, b) => b.sc.best_window!.held_out_mean - a.sc.best_window!.held_out_mean || a.km - b.km,
  )[0];
  const closest = [...withWindow].sort((a, b) => a.km - b.km)[0];
  const monthValue = (c: (typeof candidates)[number]) => (c.sc.score[q.month] ?? 0) * days;
  const top = candidates
    .filter((c) => monthValue(c) >= MIN_GAP_DAYS)
    .sort((a, b) => monthValue(b) - monthValue(a) || a.km - b.km)[0];

  const fillers: GapFiller[] = [];
  const add = (f: GapFiller) => {
    const same = fillers.find(
      (x) => x.site.id === f.site.id && (x.window?.start === f.window?.start || (!f.window && x.month === f.month)),
    );
    if (same) same.reasons.push(...f.reasons);
    else fillers.push(f);
  };
  if (most) add(fromWindow(most, "most"));
  if (closest) add(fromWindow(closest, "closest"));
  if (top) add(make(top, "month", monthValue(top), q.month, null));

  const measured = fillers.filter((f) => f.snowClass);
  return {
    fillers,
    monthEmpty: !top,
    allSnow: measured.length > 0 && measured.every((f) => f.snowClass === "snow_covered"),
    someUnmeasured: measured.length < fillers.length,
  };
}
