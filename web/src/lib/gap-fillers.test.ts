/**
 * Lighting gap-fillers, checked against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex, SiteDetail } from "./data.ts";
import {
  lightingGapFillers,
  MIN_GAP_DAYS,
  snowClassOf,
  toGapIndex,
  windowMidMonth,
  type GapQuery,
} from "./gap-fillers.ts";
import { toPlannerData } from "./planner.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), "utf8")) as T;
const index = readJson<AnalogIndex>("index.json");
const gi = toGapIndex(index);
const SEP = 8;
const JUN = 5;

const site = (id: string) => index.sites.find((s) => s.id === id)!;
const from = (id: string, targetId = "mons-mouton", presetId = "strict-28", month = SEP): GapQuery => ({
  targetId,
  presetId,
  lat: site(id).lat,
  lon: site(id).lon,
  month,
  excludeId: id,
});

describe("lighting gap-fillers", () => {
  test("Arizona: most days at Peary Land, closest at Cornwallis Island, top in September at Kronprins Christian Land", () => {
    const r = lightingGapFillers(gi, from("sf-volcanic-field"));
    assert.deepEqual(
      r.fillers.map((f) => [f.site.id, f.reasons]),
      [
        ["peary-land", ["most"]],
        ["cornwallis-resolute", ["closest"]],
        ["kronprins-christian-land", ["month"]],
      ],
    );
    const [most, closest, month] = r.fillers;
    assert.equal(most.days, 4.5);
    assert.deepEqual(most.window, { start: "09-21", end: "10-04" });
    assert.equal(most.month, SEP);
    assert.equal(Math.round(most.km), 5983);
    assert.equal(most.snowClass, "snow_covered");
    assert.equal(most.snowPct, 76.2);
    assert.equal(closest.days, 2.21);
    assert.equal(Math.round(closest.km), 4465);
    assert.equal(closest.month, 4, "28 Apr – 11 May is quoted for May");
    assert.equal(month.window, null);
    assert.ok(Math.abs(month.days - 2.842) < 1e-9);
    assert.equal(r.allSnow, true);
    assert.equal(r.someUnmeasured, false);
    assert.equal(r.monthEmpty, false);
    // December's top site is in Antarctica, where MODIS does not measure snow.
    const dec = lightingGapFillers(gi, from("sf-volcanic-field", "mons-mouton", "strict-28", 11));
    assert.equal(dec.fillers[2].site.id, "vestfold-hills");
    assert.equal(dec.fillers[2].snowClass, null);
    assert.equal(dec.allSnow, true);
    assert.equal(dec.someUnmeasured, true);
  });

  test("the planner data gives the same answer as the trimmed index", () => {
    const planner = toPlannerData(index);
    for (const month of [0, JUN, SEP]) {
      const q = from("sf-volcanic-field", "mons-malapert", "relaxed-40", month);
      assert.deepEqual(lightingGapFillers(planner, q), lightingGapFillers(gi, q));
    }
  });

  test("every pick gives enough days and never offers the place itself", () => {
    for (const t of index.targets)
      for (const p of index.presets)
        for (const s of index.sites)
          for (let m = 0; m < 12; m++) {
            const r = lightingGapFillers(gi, from(s.id, t.id, p.id, m));
            assert.ok(r.fillers.length >= 1 && r.fillers.length <= 3);
            assert.equal(new Set(r.fillers.flatMap((f) => f.reasons)).size, r.fillers.flatMap((f) => f.reasons).length);
            for (const f of r.fillers) {
              assert.notEqual(f.site.id, s.id);
              assert.ok(f.days >= MIN_GAP_DAYS, `${f.site.id} ${f.days}`);
              assert.ok(Number.isFinite(f.windChillC));
            }
            assert.equal(r.monthEmpty, !r.fillers.some((f) => f.reasons.includes("month")));
          }
  });

  test("one site picked for two reasons with the same window is listed once", () => {
    // A point beside Peary Land: the most days and the closest are the same window.
    const r = lightingGapFillers(gi, { targetId: "mons-mouton", presetId: "strict-28", lat: 82.1, lon: -31, month: SEP });
    assert.deepEqual(r.fillers[0].reasons, ["most", "closest"]);
    assert.equal(r.fillers[0].site.id, "peary-land");
    assert.equal(r.fillers.length, 2);
  });

  test("a month with no usable day anywhere offers no month pick", () => {
    const r = lightingGapFillers(gi, from("sf-volcanic-field", "mons-malapert", "strict-28", JUN));
    assert.equal(r.monthEmpty, true);
    assert.ok(r.fillers.every((f) => f.window));
  });

  test("window middle month", () => {
    assert.equal(windowMidMonth("09-21", 14), SEP);
    assert.equal(windowMidMonth("09-24", 14), 9, "24 Sep – 7 Oct is quoted for October");
    assert.equal(windowMidMonth("12-26", 14), 0);
    assert.equal(windowMidMonth("12-22", 14), 11);
  });

  test("snow classes match the pipeline's", () => {
    for (const s of index.sites) {
      const detail = readJson<SiteDetail>(`sites/${s.id}.json`);
      detail.months.forEach((mo, m) => {
        assert.equal(snowClassOf(index.site_conditions[s.id].snow_pct[m], gi.snowLimits), mo.snow_class, `${s.id} ${m}`);
      });
    }
  });
});
