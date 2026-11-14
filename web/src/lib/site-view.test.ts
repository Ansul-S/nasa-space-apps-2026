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
    assert.equal(counts.not_calculated, 1);
    assert.equal(lines.find((l) => l.id === "sun_band")!.level, "match");
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
