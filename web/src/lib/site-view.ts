/**
 * View model for the site page: the slice of the pipeline output that the
 * page needs, and the derived rows for its calendar and fidelity card.
 * Pure functions only, so the Node test runner can check them against the
 * real data files.
 */
import type {
  AnalogIndex,
  BestWindow,
  FidelityRow,
  Level,
  Period,
  Preset,
  PresetMonth,
  SiteDetail,
  SiteMeta,
  SiteMonth,
  Target,
  TargetMonth,
  WeatherCell,
} from "./data.ts";
import { formatDegrees, formatDuration, formatNumber, formatPercent, formatTemp, humanize, shortName } from "./format.ts";

export type MinuteWindow = [start: number, end: number];

export interface SunSample {
  date: string;
  /** Apparent elevation from local mean solar midnight, every `stepMin` minutes. */
  elevation: number[];
  windows: Record<string, MinuteWindow[]>;
}

export interface TargetView {
  months: TargetMonth[];
  presets: Record<string, { months: PresetMonth[]; best_window: BestWindow | null }>;
}

/** Everything the site page renders, without the fields it does not use. */
export interface SiteViewData {
  site: SiteMeta;
  period: Period;
  campaignDays: number;
  minUsableDays: number;
  targets: Target[];
  presets: Preset[];
  fidelityRows: FidelityRow[];
  levels: Record<Level, string>;
  /** Short display name per source id. */
  sourceNames: Record<string, string>;
  /** Top of the usable-share colour ramp, shared by every site. */
  maxScore: number;
  /** Top of the band-hours colour ramp, shared by every site. */
  maxBandHours: number;
  grid: { cell: WeatherCell; merra2Deg: [number, number]; ceresDeg: number; modisKm: number };
  snowNote: string | null;
  months: SiteMonth[];
  byTarget: Record<string, TargetView>;
  sun: { stepMin: number; months: SunSample[] };
}

function highest(values: Iterable<number>): number {
  let max = 0;
  for (const v of values) if (Number.isFinite(v)) max = Math.max(max, v);
  return max;
}

export function toSiteView(index: AnalogIndex, detail: SiteDetail): SiteViewData {
  const byTarget: Record<string, TargetView> = {};
  for (const [id, t] of Object.entries(detail.targets)) byTarget[id] = { months: t.months, presets: t.presets };

  const sourceNames: Record<string, string> = {};
  for (const [id, s] of Object.entries(index.sources)) sourceNames[id] = s.name.split(" (")[0].split(",")[0];

  const scores = Object.values(index.scores).flatMap((p) => Object.values(p).flatMap((s) => Object.values(s)));
  const bandHours = Object.values(index.conditions).flatMap((s) => Object.values(s).flatMap((c) => c.band_hours));

  return {
    site: detail.site,
    period: index.period,
    campaignDays: index.campaign_days,
    minUsableDays: index.min_usable_days,
    targets: index.targets,
    presets: index.presets,
    fidelityRows: index.fidelity_rows,
    levels: index.levels,
    sourceNames,
    maxScore: Math.ceil(highest(scores.flatMap((s) => s.score)) * 20) / 20 || 1,
    maxBandHours: Math.ceil(highest(bandHours)) || 1,
    grid: {
      cell: detail.grid.merra2_cell,
      merra2Deg: detail.grid.merra2_deg,
      ceresDeg: detail.grid.ceres_deg,
      modisKm: detail.grid.modis_window_km,
    },
    snowNote: detail.snow_note,
    months: detail.months,
    byTarget,
    sun: {
      stepMin: detail.sun_samples.step_min,
      months: detail.sun_samples.months.map((m) => ({ date: m.date, elevation: m.elevation, windows: m.windows })),
    },
  };
}

/* ---------- selection ---------- */

export interface Selection {
  target: Target;
  preset: Preset;
  targetMonths: TargetMonth[];
  presetMonths: PresetMonth[];
  best: BestWindow | null;
  /** True when the best window is expected to give at least some usable days. */
  useful: boolean;
}

export function select(view: SiteViewData, targetId: string, presetId: string): Selection {
  const target = view.targets.find((t) => t.id === targetId) ?? view.targets[0];
  const preset = view.presets.find((p) => p.id === presetId) ?? view.presets[0];
  const t = view.byTarget[target.id];
  const p = t.presets[preset.id];
  const best = p.best_window;
  return {
    target,
    preset,
    targetMonths: t.months,
    presetMonths: p.months,
    best,
    useful: !!best && best.held_out_mean > 0,
  };
}

/** Month (0-based) the page opens on: the best window's start, else the month with most band hours. */
export function defaultMonth(view: SiteViewData, targetId: string, presetId: string): number {
  const { best, useful, targetMonths, presetMonths } = select(view, targetId, presetId);
  if (best && useful) return Number(best.start.slice(0, 2)) - 1;
  const byScore = argmax(presetMonths.map((m) => m.usable_share));
  if (presetMonths[byScore].usable_share > 0) return byScore;
  return argmax(targetMonths.map((m) => m.band_hours));
}

function argmax(values: number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]) best = i;
  });
  return best;
}

/* ---------- daily sun path ---------- */

export interface SunWindow {
  start: number;
  end: number;
  /** Minutes in the band, including the part on the other side of midnight. */
  minutes: number;
  /** True for the second half of a stretch that crosses local midnight; it carries no label. */
  continuation: boolean;
}

/**
 * Band windows for one sample day, with a stretch across local midnight
 * (one window ending at 1440 and one starting at 0) joined into one.
 */
export function sunWindows(windows: MinuteWindow[]): SunWindow[] {
  const out: SunWindow[] = windows.map(([a, b]) => ({ start: a, end: b, minutes: b - a, continuation: false }));
  if (out.length > 1 && out[0].start === 0 && out[out.length - 1].end === 1440) {
    const head = out[0];
    const tail = out[out.length - 1];
    const total = head.minutes + tail.minutes;
    const main = tail.minutes >= head.minutes ? tail : head;
    const other = main === tail ? head : tail;
    main.minutes = total;
    other.minutes = total;
    other.continuation = true;
  }
  return out;
}

/** "04:27–07:41" for a window, in local solar time. Joined stretches read across midnight. */
export function windowClock(w: SunWindow, all: SunWindow[]): string {
  const clock = (min: number) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  if (w.minutes !== w.end - w.start) {
    // Part of a stretch across midnight: run from the evening start to the morning end.
    const evening = all[all.length - 1];
    const morning = all[0];
    return `${clock(evening.start)}–${clock(morning.end)}`;
  }
  return `${clock(w.start)}–${clock(w.end)}`;
}

/** Why a sample day has no band window, or null when it has one. */
export function emptyDayReason(elevation: number[], bandMax: number): string | null {
  const max = Math.max(...elevation);
  const min = Math.min(...elevation);
  if (max < 0) return "Polar night: the Sun stays below the horizon all day";
  if (min > bandMax) return "Midnight sun: the Sun stays above the band all day";
  return null;
}

/* ---------- seasonal calendar ---------- */

export type CellKind = "value" | "zero" | "night" | "not_measured";

export interface CalendarCell {
  /** 0–1 position on the colour ramp. */
  t: number;
  text: string;
  kind: CellKind;
  /** Extreme-cold flag, shown as a corner mark. */
  cold?: boolean;
  /** Full sentence for the cell's tooltip. */
  title: string;
}

export interface CalendarRow {
  id: string;
  label: string;
  sub: string;
  cells: CalendarCell[];
  total?: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function cell(t: number, text: string, title: string, extra: Partial<CalendarCell> = {}): CalendarCell {
  const kind = extra.kind ?? (t > 0 ? "value" : "zero");
  return { t: clamp01(t), text, title, ...extra, kind };
}

export function calendarRows(view: SiteViewData, sel: Selection, months: readonly string[]): CalendarRow[] {
  const { preset, targetMonths, presetMonths } = sel;
  const cloud = String(preset.cloud_max_pct) as "30" | "50";
  const chill = String(preset.wind_chill_min_c) as "-28" | "-40";
  const m = view.months;

  return [
    {
      id: "sun_band",
      label: "Sun in the band",
      sub: "hours a day",
      cells: targetMonths.map((tm, i) => {
        const night = m[i].flags.includes("polar_night");
        const text = formatNumber(tm.band_hours);
        return night
          ? cell(0, "night", `${months[i]}: polar night, ${text} h a day in the band`, { kind: "night" })
          : cell(tm.band_hours / view.maxBandHours, text, `${months[i]}: ${text} h a day in the band`);
      }),
    },
    {
      id: "clear_sky",
      label: "Clear sky",
      sub: `share of hours, cloud ≤${cloud}%`,
      cells: m.map((mo, i) => {
        const v = mo.clear_hours_share[cloud];
        return cell(v, formatPercent(v), `${months[i]}: cloud ≤${cloud}% in ${formatPercent(v)} of hours`);
      }),
    },
    {
      id: "ground",
      label: "Snow-free ground",
      sub: "snow cover, MODIS monthly",
      cells: m.map((mo, i) =>
        mo.snow_pct == null || mo.snow_class == null
          ? cell(0, "—", `${months[i]}: snow cover not measured here`, { kind: "not_measured" })
          : cell(
              1 - mo.snow_pct / 100,
              `${Math.round(mo.snow_pct)}%`,
              `${months[i]}: ${Math.round(mo.snow_pct)}% snow cover (${humanize(mo.snow_class)})`,
            ),
      ),
    },
    {
      id: "wind_chill",
      label: "Wind chill",
      sub: `share of hours ≥ ${formatNumber(preset.wind_chill_min_c, 0)}\u00a0°C`,
      cells: m.map((mo, i) => {
        const v = mo.wind_chill_ok_share[chill];
        const cold = mo.flags.includes("extreme_cold");
        return cell(
          v,
          formatPercent(v),
          `${months[i]}: wind chill ≥ ${formatNumber(preset.wind_chill_min_c, 0)}\u00a0°C in ${formatPercent(v)} of hours` +
            (cold ? "; median below −40\u00a0°C" : ""),
          { cold },
        );
      }),
    },
    {
      id: "usable",
      label: "Usable days",
      sub: `median of ${view.campaignDays}, campaign start`,
      total: true,
      cells: presetMonths.map((pm, i) => {
        const text = formatNumber(pm.odds.median, 0);
        const t = pm.usable_share > 0 ? pm.usable_share / view.maxScore : 0;
        return cell(t, text, `${months[i]} start: median ${text} usable days of ${view.campaignDays}`);
      }),
    },
  ];
}

/* ---------- fidelity card ---------- */

const SNOW_LABEL = { snow_free: "Snow-free", patchy: "Patchy snow", snow_covered: "Snow-covered" } as const;

export type FidelityGroup = "Lighting and ground" | "Earth-only conditions" | "Crew operations" | "Impossible on Earth";

export const FIDELITY_GROUPS: FidelityGroup[] = [
  "Lighting and ground",
  "Earth-only conditions",
  "Crew operations",
  "Impossible on Earth",
];

export interface FidelityLine {
  id: string;
  label: string;
  note?: string;
  group: FidelityGroup;
  moon: string;
  site: string;
  level: Level;
  source: string;
}

function groupOf(row: FidelityRow): FidelityGroup {
  if (row.level === "impossible") return "Impossible on Earth";
  if (row.kind === "earth_only") return "Earth-only conditions";
  if (row.kind === "operations") return "Crew operations";
  return "Lighting and ground";
}

/** One line per fidelity row for `month` (0-based), grouped as on the card. */
export function fidelityLines(view: SiteViewData, sel: Selection, month: number): FidelityLine[] {
  const { target, preset } = sel;
  const tm = sel.targetMonths[month];
  const pm = sel.presetMonths[month];
  const mo = view.months[month];
  const cloud = String(preset.cloud_max_pct) as "30" | "50";
  const chill = String(preset.wind_chill_min_c) as "-28" | "-40";
  const limit = formatNumber(preset.wind_chill_min_c, 0);

  const values: Record<string, [moon: string, site: string]> = {
    sun_band: [
      `0–${formatDegrees(target.band_max_deg)} through the lunar day`,
      `${formatNumber(tm.band_hours)} h a day in the band; a 2 h stretch on ${formatPercent(tm.window_days_share)} of days`,
    ],
    sun_motion: [
      `${formatNumber(target.sun_rate_deg_per_h, 2)}°/h`,
      tm.sun_rate_deg_per_h == null ? "Not in the band this month" : `${formatNumber(tm.sun_rate_deg_per_h)}°/h`,
    ],
    sky_light: ["Black sky, black shadows", "Blue sky, light scattered into shadows"],
    ground: [
      "Bare regolith",
      mo.snow_pct == null || mo.snow_class == null
        ? "Not measured here"
        : `${SNOW_LABEL[mo.snow_class]}, ${Math.round(mo.snow_pct)}% snow cover`,
    ],
    terrain: ["LOLA slope and roughness", "Not in this version"],
    clear_sky: ["No atmosphere", `Cloud ≤${cloud}% in ${formatPercent(mo.clear_hours_share[cloud])} of hours`],
    wind_chill: [
      "Suit-controlled",
      `Median ${formatTemp(mo.wind_chill_median_c)}; ≥ ${limit}\u00a0°C in ${formatPercent(mo.wind_chill_ok_share[chill])} of hours`,
    ],
    gravity: ["1.62 m/s² (1/6 g)", "9.81 m/s²"],
    vacuum: ["Hard vacuum", "1 atm of air"],
    radiation: ["No magnetic field or thick air", "Shielded by both"],
  };

  const lines = view.fidelityRows.map((row) => {
    const [moon, site] = values[row.id] ?? ["—", "—"];
    return {
      id: row.id,
      label: row.label,
      note: row.note,
      group: groupOf(row),
      moon,
      site,
      level: pm.levels[row.id] ?? row.level ?? "not_calculated",
      source: row.source ? (view.sourceNames[row.source] ?? "") : "",
    } satisfies FidelityLine;
  });
  return FIDELITY_GROUPS.flatMap((g) => lines.filter((l) => l.group === g));
}

/** How many rows sit at each level, in display order. */
export function levelCounts(lines: FidelityLine[]): [Level, number][] {
  const order: Level[] = ["match", "partial", "breaks_down", "impossible", "not_calculated"];
  return order.map((l) => [l, lines.filter((x) => x.level === l).length] as [Level, number]).filter(([, n]) => n > 0);
}

/* ---------- small helpers ---------- */

export const shortTarget = (t: Target) => shortName(t.name);
export const shortSite = (s: SiteMeta) => shortName(s.name);
export const durationLabel = (minutes: number) => formatDuration(minutes / 60);
