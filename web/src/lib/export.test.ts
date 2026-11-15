/**
 * CSV export: field quoting, and the site and ranking files checked against
 * the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex, SiteDetail } from "./data.ts";
import { csvField, rankingCsv, rankingCsvName, round, siteCsv, siteCsvName, toCsv } from "./export.ts";
import { rankSites, toPlannerData } from "./planner.ts";
import { select, toSiteView } from "./site-view.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), "utf8")) as T;
const index = readJson<AnalogIndex>("index.json");
const view = (id: string) => toSiteView(index, readJson<SiteDetail>(`sites/${id}.json`));
const DEFAULT = ["mons-mouton", "strict-28"] as const;
const SEP = 8;

/** Split one CSV line into fields (no line breaks inside fields in these files). */
function fields(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Notes, header and rows of a file, with rows keyed by column. */
function parse(csv: string) {
  assert.ok(csv.endsWith("\r\n"), "ends with CRLF");
  const lines = csv.slice(0, -2).split("\r\n");
  assert.ok(lines.every((l) => !l.includes("\n")), "every line break is CRLF");
  const notes = lines.filter((l) => l.startsWith("# "));
  const [header, ...body] = lines.filter((l) => !l.startsWith("# ")).map(fields);
  for (const r of body) assert.equal(r.length, header.length, `row ${r[0]} has one field per column`);
  return { notes, header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]]))) };
}

const note = (notes: string[], key: string) => notes.find((n) => n.startsWith(`# ${key}: `))?.slice(key.length + 4);

describe("csv fields", () => {
  test("quotes commas, quotes and edge spaces; leaves the rest bare", () => {
    assert.equal(csvField("Svalbard"), "Svalbard");
    assert.equal(csvField("San Francisco Volcanic Field, Arizona"), '"San Francisco Volcanic Field, Arizona"');
    assert.equal(csvField('say "low"'), '"say ""low"""');
    assert.equal(csvField(" pad"), '" pad"');
    assert.equal(csvField("a\nb"), '"a\nb"');
  });

  test("missing values are empty; numbers and booleans are plain", () => {
    assert.equal(csvField(null), "");
    assert.equal(csvField(undefined), "");
    assert.equal(csvField(Number.NaN), "");
    assert.equal(csvField(0), "0");
    assert.equal(csvField(-28.5), "-28.5");
    assert.equal(csvField(true), "true");
    assert.equal(round(0.16349, 3), 0.163);
    assert.equal(round(-0.0001, 2), 0);
    assert.equal(round(null, 2), null);
  });

  test("notes keep one cell each, and a short row is an error", () => {
    const csv = toCsv([["limits", "Cloud ≤30%, wind chill ≥ −28 °C"]], ["a", "b"], [[1, "x,y"]]);
    assert.equal(csv, '# limits: Cloud ≤30%; wind chill ≥ −28 °C\r\na,b\r\n1,"x,y"\r\n');
    assert.throws(() => toCsv([], ["a", "b"], [[1]]), /1 fields for 2 columns/);
  });
});

describe("site file", () => {
  test("Ellesmere, Mons Mouton, strict limits: 12 months that match the site data", () => {
    const v = view("ellesmere-inland");
    const sel = select(v, ...DEFAULT);
    const { notes, header, rows } = parse(siteCsv(v, sel, "https://example.org/sites/ellesmere-inland/"));
    assert.equal(siteCsvName(v, sel), "ellesmere-inland_mons-mouton_strict-28.csv");
    assert.equal(rows.length, 12);
    assert.deepEqual(
      rows.map((r) => r.month),
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
    for (const col of ["cloud_le_30pct_hours_share", "wind_chill_ge_minus28c_hours_share", "chance_at_least_3_usable_days"])
      assert.ok(header.includes(col), col);

    const sep = rows[SEP];
    const pm = sel.presetMonths[SEP];
    assert.equal(sep.month_name, "September");
    assert.equal(Number(sep.usable_day_share), pm.usable_share);
    assert.equal(Number(sep.expected_usable_days), round(pm.usable_share * 14, 2));
    assert.equal(Number(sep.median_usable_days), pm.odds.median);
    assert.equal(Number(sep.cloud_le_30pct_hours_share), v.months[SEP].clear_hours_share["30"]);
    assert.equal(sep.level_clear_sky, pm.levels.clear_sky);
    assert.equal(sep.level_terrain, "partial");
    // Rows with a fixed level everywhere get no column.
    assert.ok(!header.includes("level_gravity"));

    assert.match(note(notes, "best window")!, /^09-24 to 10-07 \(MM-DD\); 3\.\d+ usable days expected/);
    assert.equal(note(notes, "site"), "Inland Ellesmere Island; Canadian Arctic (ellesmere-inland)");
    assert.equal(note(notes, "page"), "https://example.org/sites/ellesmere-inland/");
    assert.equal(notes.filter((n) => n.startsWith("# source: ")).length, Object.keys(index.sources).length);
    assert.ok(notes.every((n) => !n.includes(",")), "notes hold no commas");
  });

  test("Antarctic snow is empty, not zero", () => {
    const v = view("vestfold-hills");
    const { rows } = parse(siteCsv(v, select(v, ...DEFAULT)));
    assert.ok(rows.every((r) => r.snow_cover_pct === "" && r.snow_class === ""));
  });

  test("Arizona has no best window, and the −40 °C limit renames its columns", () => {
    const v = view("sf-volcanic-field");
    const { notes, header, rows } = parse(siteCsv(v, select(v, "mons-mouton", "relaxed-40")));
    assert.match(note(notes, "best window")!, /^none/);
    assert.ok(header.includes("cloud_le_50pct_hours_share") && header.includes("wind_chill_ge_minus40c_hours_share"));
    assert.ok(rows.every((r) => r.usable_day_share === "0" && r.level_sun_band === "breaks_down"));
    assert.equal(note(notes, "page"), undefined);
  });
});

describe("ranking file", () => {
  const data = toPlannerData(index);

  test("September: the order on screen, ranks only for sites with usable days", () => {
    const q = { targetId: "mons-mouton", presetId: "strict-28", month: SEP, mode: "month" as const };
    const ranked = rankSites(data, q.targetId, q.presetId, q.month, q.mode);
    const { notes, rows } = parse(rankingCsv(data, ranked, q));
    assert.equal(rankingCsvName(q), "ranking_mons-mouton_strict-28_sep.csv");
    assert.deepEqual(
      rows.map((r) => r.site_id),
      ranked.map((r) => r.site.id),
    );
    assert.deepEqual(
      rows.map((r) => r.rank),
      ranked.map((r) => (r.rank === null ? "" : String(r.rank))),
    );
    assert.equal(rows[0].site_id, "kronprins-christian-land");
    assert.equal(Number(rows[0].month_expected_usable_days), round(ranked[0].value, 2));
    assert.ok(rows.every((r) => r.month === "September"));
    assert.match(note(notes, "ranked by")!, /campaign starting in September/);

    const az = rows.find((r) => r.site_id === "sf-volcanic-field")!;
    assert.equal(az.site_name, "San Francisco Volcanic Field, Arizona");
    assert.equal(az.rank, "");
    assert.equal(az.best_window_start, "");
    assert.equal(az.slope_median_deg, "4.9");
  });

  test("best-window mode: ranked by the held-out mean", () => {
    const q = { targetId: "mons-malapert", presetId: "relaxed-28", month: 0, mode: "best" as const };
    const ranked = rankSites(data, q.targetId, q.presetId, q.month, q.mode);
    const { notes, rows } = parse(rankingCsv(data, ranked, q));
    assert.equal(rankingCsvName(q), "ranking_mons-malapert_relaxed-28_best-window.csv");
    const days = rows.filter((r) => r.rank !== "").map((r) => Number(r.best_window_expected_usable_days));
    assert.ok(days.length > 0);
    assert.deepEqual(days, [...days].sort((a, b) => b - a));
    assert.match(note(notes, "ranked by")!, /best 14-day window/);
  });
});
