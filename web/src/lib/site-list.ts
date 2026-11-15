/**
 * The sites overview: every site ranked by its best low-sun window for the
 * default target and preset, read from index.json.
 */
import {
  DEFAULT_CHILL,
  DEFAULT_CLOUD,
  DEFAULT_TARGET,
  getPreset,
  getTarget,
  maxScore,
  presetId,
  scoresFor,
  type AnalogIndex,
  type BestWindow,
  type Monthly,
  type Preset,
  type SiteMeta,
  type Target,
} from "./data.ts";

export interface SiteCard {
  site: SiteMeta;
  /** Rank by held-out best-window days; null when the site has no usable window. */
  rank: number | null;
  best: BestWindow | null;
  /** Share of usable days per month, 0–1. */
  score: Monthly<number>;
  /** The month with the highest share, or null when every month is 0. */
  bestMonth: number | null;
}

export interface SiteList {
  target: Target;
  preset: Preset;
  campaignDays: number;
  /** Top of the colour ramp for the month strips. */
  maxScore: number;
  cards: SiteCard[];
  counts: { validation: number; candidate: number; newSites: number };
}

export function toSiteList(index: AnalogIndex): SiteList {
  const target = getTarget(index, DEFAULT_TARGET);
  const preset = getPreset(index, presetId(DEFAULT_CLOUD, DEFAULT_CHILL));
  const rows = index.sites.map((site) => {
    const s = scoresFor(index, target.id, preset.id, site.id);
    const top = Math.max(...s.score);
    return { site, best: s.best_window, score: s.score, bestMonth: top > 0 ? s.score.indexOf(top) : null };
  });
  // Best held-out window first; sites without one keep their index order at the end.
  rows.sort((a, b) => (b.best?.held_out_mean ?? -1) - (a.best?.held_out_mean ?? -1));
  let rank = 0;
  const cards = rows.map((r) => ({ ...r, rank: r.best ? ++rank : null }));
  return {
    target,
    preset,
    campaignDays: index.campaign_days,
    maxScore: maxScore(index),
    cards,
    counts: {
      validation: index.sites.filter((s) => s.role === "validation").length,
      candidate: index.sites.filter((s) => s.role === "candidate").length,
      newSites: index.sites.filter((s) => !s.known_analog).length,
    },
  };
}
