/**
 * Checks the site page's view model against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex, SiteDetail } from "./data.ts";
import { formatDayRange, formatNumber, MONTHS } from "./format.ts";
import {
  calendarRows,
  defaultMonth,
  emptyDayReason,
  fidelityLines,
  levelCounts,
  select,
  sunWindows,
  toSiteView,
  windowClock,
  windowMonths,
  windowWhy,
} from "./site-view.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), "utf8")) as T;

const index = readJson<AnalogIndex>("index.json");
const view = (id: string) => toSiteView(index, readJson<SiteDetail>(`sites/${id}.json`));
const DEFAULT = ["mons-mouton", "strict-28"] as const;

describe("acceptance", () => {
  test("Ellesmere: best window 24 Sep – 7 Oct, 3.3 usable days", () => {
    const sel = select(view("ellesmere-inland"), ...DEFAULT);
    assert.ok(sel.best && sel.useful);
    assert.equal(formatDayRange(sel.best.start, sel.best.end), "24 Sep – 7 Oct");
    assert.equal(formatNumber(sel.best.held_out_mean), "3.3");
    assert.equal(defaultMonth(view("ellesmere-inland"), ...DEFAULT), 8);
  });

  test("Arizona: 0 usable days in every month, for every target and preset", () => {
    const v = view("sf-volcanic-field");
    for (const t of v.targets)
      for (const p of v.presets) {
        const sel = select(v, t.id, p.id);
        assert.equal(sel.best, null, `${t.id} ${p.id}`);
        const usable = calendarRows(v, sel, MONTHS).find((r) => r.id === "usable")!;
        assert.deepEqual(
          usable.cells.map((c) => [c.text, c.kind]),
          MONTHS.map(() => ["0", "zero"]),
          `${t.id} ${p.id}`,
        );
      }
  });
});

describe("view model", () => {
  test("every site and selection builds", () => {
    for (const s of index.sites) {
      const v = view(s.id);
      for (const t of v.targets)
        for (const p of v.presets) {
          const sel = select(v, t.id, p.id);
          const m = defaultMonth(v, t.id, p.id);
          assert.ok(m >= 0 && m < 12);
          const rows = calendarRows(v, sel, MONTHS);
          assert.equal(rows.length, 5);
          for (const r of rows) assert.equal(r.cells.length, 12);
          for (let i = 0; i < 12; i++) {
            const lines = fidelityLines(v, sel, i);
            assert.equal(lines.length, index.fidelity_rows.length);
            assert.ok(lines.every((l) => l.moon && l.site && l.level));
          }
        }
    }
  });

  test("colour ramp tops are shared by all sites", () => {
    const a = view("ellesmere-inland");
    const b = view("vestfold-hills");
    assert.equal(a.maxScore, b.maxScore);
    assert.equal(a.maxBandHours, 9);
  });

  test("McMurdo's zero-value window is not treated as an answer", () => {
    const sel = select(view("mcmurdo-dry-valleys"), ...DEFAULT);
    assert.ok(sel.best);
    assert.equal(sel.best.held_out_mean, 0);
    assert.equal(sel.useful, false);
  });

  test("Antarctic snow is shown as not measured", () => {
    const v = view("vestfold-hills");
    const ground = calendarRows(v, select(v, ...DEFAULT), MONTHS).find((r) => r.id === "ground")!;
    assert.ok(ground.cells.every((c) => c.kind === "not_measured"));
    assert.equal(fidelityLines(v, select(v, ...DEFAULT), 0).find((l) => l.id === "ground")!.site, "Not measured here");
  });

  test("polar night months are marked in the sun row", () => {
    const v = view("svalbard");
    const sun = calendarRows(v, select(v, ...DEFAULT), MONTHS).find((r) => r.id === "sun_band")!;
    assert.deepEqual(
      sun.cells.map((c) => c.kind === "night"),
      [true, true, false, false, false, false, false, false, false, false, true, true],
    );
  });

  test("fidelity groups and counts", () => {
    const v = view("ellesmere-inland");
    const lines = fidelityLines(v, select(v, ...DEFAULT), 8);
    assert.deepEqual(
      lines.map((l) => l.id),
      ["sun_band", "sun_motion", "sky_light", "ground", "terrain", "clear_sky", "wind_chill", "gravity", "vacuum", "radiation"],
    );
    const counts = Object.fromEntries(levelCounts(lines));
    assert.equal(counts.impossible, 3);
    assert.equal(counts.not_calculated, undefined);
    assert.equal(lines.find((l) => l.id === "sun_band")!.level, "match");
  });

  test("terrain row: slope at the target and the site, the same in every month", () => {
    const v = view("ellesmere-inland");
    const sel = select(v, ...DEFAULT);
    const terrain = fidelityLines(v, sel, 8).find((l) => l.id === "terrain")!;
    assert.equal(terrain.moon, "Median 5.9°, 90% under 10.9°");
    assert.equal(terrain.site, "Median 9.5°, 90% under 30.8°");
    assert.equal(terrain.level, "partial");
    assert.equal(terrain.source, "Copernicus DEM GLO-30");
    for (let m = 0; m < 12; m++) assert.equal(fidelityLines(v, sel, m).find((l) => l.id === "terrain")!.level, "partial");

    // Arizona: terrain like Mons Mouton, light nothing like it (roadmap validation check 2).
    const az = view("sf-volcanic-field");
    const azLines = fidelityLines(az, select(az, ...DEFAULT), 8);
    assert.equal(azLines.find((l) => l.id === "terrain")!.level, "match");
    assert.equal(azLines.find((l) => l.id === "sun_band")!.level, "breaks_down");

    // A coastal box that is mostly sea says so.
    const fj = view("franz-josef-land");
    assert.match(fidelityLines(fj, select(fj, ...DEFAULT), 8).find((l) => l.id === "terrain")!.site, /only 25% of the box is land/);
  });
});

describe("why the best window", () => {
  test("a window's days in each month, across the year end too", () => {
    assert.deepEqual(windowMonths("09-24", 14), [
      { month: 8, days: 7 },
      { month: 9, days: 7 },
    ]);
    assert.deepEqual(windowMonths("12-25", 14), [
      { month: 11, days: 7 },
      { month: 0, days: 7 },
    ]);
    assert.deepEqual(windowMonths("07-01", 14), [{ month: 6, days: 14 }]);
  });

  test("Ellesmere: monthly shares weighted by the window's days, weakest named", () => {
    const v = view("ellesmere-inland");
    const sel = select(v, ...DEFAULT);
    const why = windowWhy(v, sel)!;
    assert.equal(why.months, "Sep–Oct");
    assert.deepEqual(
      why.reasons.map((r) => r.id),
      ["sun", "clear_sky", "wind_chill", "dry"],
    );
    const clear = why.reasons.find((r) => r.id === "clear_sky")!;
    const expected = (v.months[8].clear_hours_share["30"] + v.months[9].clear_hours_share["30"]) / 2;
    assert.ok(Math.abs(clear.share - expected) < 1e-9);
    const lowest = Math.min(...why.reasons.map((r) => r.share));
    assert.equal(why.reasons.find((r) => r.id === why.weakest)!.share, lowest);
    for (const r of why.reasons) assert.ok(r.share >= 0 && r.share <= 1, r.id);
    assert.ok(why.snowPct != null);
  });

  test("no window, no reasons; a zero-value window still has them", () => {
    const az = view("sf-volcanic-field");
    assert.equal(windowWhy(az, select(az, ...DEFAULT)), null);
    const mc = view("mcmurdo-dry-valleys");
    const why = windowWhy(mc, select(mc, ...DEFAULT))!;
    assert.equal(why.reasons.length, 4);
    assert.equal(why.snowPct, null);
  });
});

describe("sun windows", () => {
  test("Ellesmere on 15 Sep: two stretches, 3 h 14 min and 3 h 12 min", () => {
    const v = view("ellesmere-inland");
    const w = sunWindows(v.sun.months[8].windows["mons-mouton"]);
    assert.deepEqual(
      w.map((x) => x.minutes),
      [194, 192],
    );
    assert.equal(windowClock(w[0], w), "04:27–07:41");
  });

  test("a stretch across local midnight is joined", () => {
    const v = view("mcmurdo-dry-valleys");
    const w = sunWindows(v.sun.months[1].windows["mons-mouton"]);
    assert.deepEqual(
      w.map((x) => [x.minutes, x.continuation]),
      // The longer half (00:00–04:23) carries the label.
      [
        [502, false],
        [502, true],
      ],
    );
    assert.equal(windowClock(w[0], w), "20:01–04:23");
  });

  test("empty days say why", () => {
    const v = view("svalbard");
    const bandMax = index.targets[0].band_max_deg;
    assert.match(emptyDayReason(v.sun.months[0].elevation, bandMax)!, /Polar night/);
    assert.match(emptyDayReason(v.sun.months[5].elevation, bandMax)!, /Midnight sun/);
    assert.equal(emptyDayReason(v.sun.months[8].elevation, bandMax), null);
  });
});
