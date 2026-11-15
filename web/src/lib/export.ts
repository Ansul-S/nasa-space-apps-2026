/**
 * CSV files built in the browser from the data a page already holds: the site
 * page's twelve months and the planner's ranking. Pure functions, except
 * `downloadCsv`, which needs a browser.
 *
 * Shares are 0–1 fractions. An empty cell is a value that is not measured or
 * not defined. Lines starting with "#" describe the file; pandas skips them
 * with `comment="#"`.
 */
import type { CloudLimit, ChillLimit, SourceRef } from "./data.ts";
import { MONTHS, MONTHS_LONG } from "./format.ts";
import { WINDOW_MIN_H, type PlannerData, type RankedSite, type RankMode } from "./planner.ts";
import type { Selection, SiteViewData } from "./site-view.ts";

export type CsvValue = string | number | boolean | null | undefined;
export type CsvMeta = [key: string, value: string][];

interface Column<T> {
  name: string;
  value: (row: T) => CsvValue;
}

/** One field, quoted when it holds a comma, quote, line break or edge space (RFC 4180). Empty for missing values. */
export function csvField(v: CsvValue): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  const s = String(v);
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

/** `v` rounded to `digits` decimals, or null when it is missing. */
export const round = (v: number | null | undefined, digits: number): number | null =>
  v == null || !Number.isFinite(v) ? null : Number(v.toFixed(digits)) || 0;

/**
 * "# key: value" lines, then the header and the rows, with CRLF line ends.
 * Commas in a note become semicolons, so a spreadsheet keeps each note in one cell.
 */
export function toCsv(meta: CsvMeta, columns: string[], rows: CsvValue[][]): string {
  for (const [i, r] of rows.entries())
    if (r.length !== columns.length) throw new Error(`Row ${i} has ${r.length} fields for ${columns.length} columns`);
  const note = ([k, v]: [string, string]) => `# ${k}: ${v.replace(/\s*[\r\n]+\s*/g, " ").replace(/,\s*/g, "; ")}`;
  const line = (r: CsvValue[]) => r.map(csvField).join(",");
  return [...meta.map(note), line(columns), ...rows.map(line)].join("\r\n") + "\r\n";
}

function table<T>(meta: CsvMeta, columns: Column<T>[], rows: T[]): string {
  return toCsv(
    meta,
    columns.map((c) => c.name),
    rows.map((r) => columns.map((c) => c.value(r))),
  );
}

const sourceNotes = (sources: SourceRef[]): CsvMeta => sources.map((s) => ["source", `${s.name} <${s.url}>`]);

const USABLE_DAY = `the Sun stays in the target's band for an unbroken ${WINDOW_MIN_H} h while the cloud and wind limits and the rain and wind-chill limits all hold`;

const bandText = (t: { name: string; band_min_deg: number; band_max_deg: number }) =>
  `${t.name} (Sun ${t.band_min_deg}° to ${t.band_max_deg}° above the horizon)`;

/* ---------- site page: twelve months ---------- */

export const siteCsvName = (view: SiteViewData, sel: Selection) =>
  `${view.site.id}_${sel.target.id}_${sel.preset.id}.csv`;

/** The site's twelve months for the selected target and limits. */
export function siteCsv(view: SiteViewData, sel: Selection, url?: string): string {
  const { site, campaignDays: days, minUsableDays: n, grid } = view;
  const { target, preset, best } = sel;
  const cloud = String(preset.cloud_max_pct) as CloudLimit;
  const chill = String(preset.wind_chill_min_c) as ChillLimit;
  const cell = grid.cell;
  // Rows whose level comes from the data; the rest are fixed for every site and month.
  const levelRows = view.fidelityRows.filter((r) => !r.level).map((r) => r.id);

  const meta: CsvMeta = [
    ["file", "Wayfinders Frontier seasonal analog planner, monthly conditions at one site"],
    ["site", `${site.name}, ${site.region} (${site.id})`],
    ["coordinates", `lat ${site.lat}, lon ${site.lon} (decimal degrees; negative is south or west)`],
    ["target", bandText(target)],
    ["limits", `${preset.label} (${preset.id})`],
    ["usable day", USABLE_DAY],
    ["campaign", `${days} days; the odds columns are for campaigns that start on each day of the month`],
    [
      "best window",
      best
        ? `${best.start} to ${best.end} (MM-DD), ${round(best.held_out_mean, 2)} usable days expected (each year scored on a window chosen without it), bad to good year ${best.p10} to ${best.p90}, chance of ${n} or more ${round(best.p_at_least, 3)}`
        : `none: the Sun never stays in the band for an unbroken ${WINDOW_MIN_H} h`,
    ],
    ["record", `${view.period.start} to ${view.period.end}`],
    [
      "weather cell",
      `${cell.class.replace(/_/g, " ")}, bare land ${round(cell.land, 2)}, land ice ${round(cell.land_ice, 2)}, ocean ${round(cell.ocean, 2)}; MERRA-2 grid ${grid.merra2Deg.join("° × ")}°, cloud ${grid.ceresDeg}°, snow ${grid.modisKm} km window`,
    ],
    ["data built", view.generated],
    ...(url ? ([["page", url]] as CsvMeta) : []),
    ...sourceNotes(view.sources),
  ];

  const columns: Column<number>[] = [
    { name: "site_id", value: () => site.id },
    { name: "target_id", value: () => target.id },
    { name: "preset_id", value: () => preset.id },
    { name: "month", value: (m) => m + 1 },
    { name: "month_name", value: (m) => MONTHS_LONG[m] },
    { name: "sun_band_hours_per_day", value: (m) => round(sel.targetMonths[m].band_hours, 2) },
    { name: "longest_band_stretch_hours", value: (m) => round(sel.targetMonths[m].longest_window_hours, 2) },
    { name: `days_with_${WINDOW_MIN_H}h_stretch_share`, value: (m) => round(sel.targetMonths[m].window_days_share, 3) },
    { name: "sun_rate_deg_per_hour", value: (m) => round(sel.targetMonths[m].sun_rate_deg_per_h, 2) },
    { name: "sun_min_deg", value: (m) => round(view.months[m].sun_min_deg, 1) },
    { name: "sun_max_deg", value: (m) => round(view.months[m].sun_max_deg, 1) },
    { name: "polar_night_share", value: (m) => round(view.months[m].polar_night_share, 3) },
    { name: "cloud_mean_pct", value: (m) => round(view.months[m].cloud_mean_pct, 1) },
    { name: `cloud_le_${cloud}pct_hours_share`, value: (m) => round(view.months[m].clear_hours_share[cloud], 3) },
    { name: "dry_days_share", value: (m) => round(view.months[m].dry_days_share, 3) },
    { name: "snow_cover_pct", value: (m) => round(view.months[m].snow_pct, 1) },
    { name: "snow_class", value: (m) => view.months[m].snow_class },
    { name: "air_temp_mean_c", value: (m) => round(view.months[m].t2m_mean_c, 1) },
    { name: "wind_mean_m_per_s", value: (m) => round(view.months[m].wind_mean_ms, 1) },
    { name: "wind_chill_median_c", value: (m) => round(view.months[m].wind_chill_median_c, 1) },
    { name: "wind_chill_p10_c", value: (m) => round(view.months[m].wind_chill_p10_c, 1) },
    {
      name: `wind_chill_ge_minus${chill.replace("-", "")}c_hours_share`,
      value: (m) => round(view.months[m].wind_chill_ok_share[chill], 3),
    },
    { name: "usable_day_share", value: (m) => round(sel.presetMonths[m].usable_share, 3) },
    { name: "expected_usable_days", value: (m) => round(sel.presetMonths[m].usable_share * days, 2) },
    { name: "median_usable_days", value: (m) => sel.presetMonths[m].odds.median },
    { name: "p10_usable_days", value: (m) => sel.presetMonths[m].odds.p10 },
    { name: "p90_usable_days", value: (m) => sel.presetMonths[m].odds.p90 },
    { name: `chance_at_least_${n}_usable_days`, value: (m) => round(sel.presetMonths[m].odds.p_at_least, 3) },
    { name: "flags", value: (m) => view.months[m].flags.join(" ") },
    ...levelRows.map((id) => ({ name: `level_${id}`, value: (m: number) => sel.presetMonths[m].levels[id] ?? null })),
  ];

  return table(meta, columns, Array.from({ length: 12 }, (_, m) => m));
}

/* ---------- planner: the ranked list ---------- */

export interface RankingQuery {
  targetId: string;
  presetId: string;
  month: number;
  mode: RankMode;
}

export const rankingCsvName = (q: RankingQuery) =>
  `ranking_${q.targetId}_${q.presetId}_${q.mode === "best" ? "best-window" : MONTHS[q.month].toLowerCase()}.csv`;

/** The planner's ranking, in the order on screen, with the chosen month and each site's best window. */
export function rankingCsv(data: PlannerData, rows: RankedSite[], q: RankingQuery, url?: string): string {
  const target = data.targets.find((t) => t.id === q.targetId);
  const preset = data.presets.find((p) => p.id === q.presetId);
  if (!target || !preset) throw new Error(`Unknown target or preset: ${q.targetId} / ${q.presetId}`);
  const days = data.campaignDays;
  const n = data.minUsableDays;
  const month = q.month;

  const meta: CsvMeta = [
    ["file", "Wayfinders Frontier seasonal analog planner, analog sites ranked for a lunar target"],
    ["target", bandText(target)],
    ["limits", `${preset.label} (${preset.id})`],
    [
      "ranked by",
      q.mode === "best"
        ? `expected usable days in each site's best ${days}-day window (each year scored on a window chosen without it)`
        : `expected usable days in a ${days}-day campaign starting in ${MONTHS_LONG[month]}`,
    ],
    ["rank", "empty for sites with no usable days"],
    ["usable day", USABLE_DAY],
    ["record", `${data.record[0]} to ${data.record[1]}`],
    ["data built", data.generated],
    ...(url ? ([["page", url]] as CsvMeta) : []),
    ...sourceNotes(data.sources),
  ];

  const bw = (r: RankedSite) => r.scores.best_window;
  const columns: Column<RankedSite>[] = [
    { name: "rank", value: (r) => r.rank },
    { name: "site_id", value: (r) => r.site.id },
    { name: "site_name", value: (r) => r.site.name },
    { name: "region", value: (r) => r.site.region },
    { name: "lat", value: (r) => r.site.lat },
    { name: "lon", value: (r) => r.site.lon },
    { name: "role", value: (r) => r.site.role },
    { name: "known_analog", value: (r) => r.site.known_analog },
    { name: "weather_cell_class", value: (r) => r.site.weather_cell_class },
    { name: "month", value: () => MONTHS_LONG[month] },
    { name: "month_usable_day_share", value: (r) => round(r.scores.score[month], 3) },
    { name: "month_expected_usable_days", value: (r) => round(r.scores.score[month] * days, 2) },
    { name: "month_median_usable_days", value: (r) => r.scores.median[month] },
    { name: "month_p10_usable_days", value: (r) => r.scores.p10[month] },
    { name: "month_p90_usable_days", value: (r) => r.scores.p90[month] },
    { name: `month_chance_at_least_${n}_usable_days`, value: (r) => round(r.scores.p_at_least[month], 3) },
    { name: "month_sun_band_hours_per_day", value: (r) => round(r.bandHours, 2) },
    { name: "best_window_start", value: (r) => bw(r)?.start },
    { name: "best_window_end", value: (r) => bw(r)?.end },
    { name: "best_window_expected_usable_days", value: (r) => round(bw(r)?.held_out_mean, 2) },
    { name: "best_window_median_usable_days", value: (r) => bw(r)?.median },
    { name: "best_window_p10_usable_days", value: (r) => bw(r)?.p10 },
    { name: "best_window_p90_usable_days", value: (r) => bw(r)?.p90 },
    { name: `best_window_chance_at_least_${n}_usable_days`, value: (r) => round(bw(r)?.p_at_least, 3) },
    { name: "slope_median_deg", value: (r) => round(r.site.terrain?.median_slope_deg, 1) },
    { name: "slope_p90_deg", value: (r) => round(r.site.terrain?.p90_slope_deg, 1) },
    { name: "terrain_land_share", value: (r) => round(r.site.terrain?.land_share, 3) },
  ];

  return table(meta, columns, rows);
}

/* ---------- browser ---------- */

/**
 * Save `csv` as a file. A byte-order mark goes first so Excel reads the file
 * as UTF-8 and shows "°" and "ø" correctly.
 */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  // Some browsers start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
