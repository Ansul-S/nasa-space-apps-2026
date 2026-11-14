/**
 * Planner ranking, searched-point lighting and search parsing, checked
 * against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex } from "./data.ts";
import { MOON_FEATURES, targetFeature } from "./moon-features.ts";
import {
  localHourOfUtc,
  monthPeaks,
  nearestSite,
  pointLight,
  rankSites,
  ringHour,
  toPlannerData,
  utcHourOfLocal,
} from "./planner.ts";
import { fold, localResults, parsePhoton } from "./search.ts";
import { bandDay, sampleDate } from "./sun.ts";

const index: AnalogIndex = JSON.parse(readFileSync(new URL("../../public/data/index.json", import.meta.url), "utf8"));
const data = toPlannerData(index);
const SEP = 8;

describe("ranking", () => {
  test("month mode ranks by usable-day share and numbers only sites with usable days", () => {
    for (const t of data.targets)
      for (const p of data.presets)
        for (let m = 0; m < 12; m++) {
          const rows = rankSites(data, t.id, p.id, m, "month");
          assert.equal(rows.length, data.sites.length);
          for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].value >= rows[i].value);
          rows.forEach((r) => assert.equal(r.rank !== null, r.value > 0));
          const ranks = rows.filter((r) => r.rank).map((r) => r.rank);
          assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
        }
  });

  test("Arizona has no usable days in any month or mode", () => {
    for (const t of data.targets)
      for (const p of data.presets)
        for (let m = 0; m < 12; m++)
          for (const mode of ["month", "best"] as const) {
            const az = rankSites(data, t.id, p.id, m, mode).find((r) => r.site.id === "sf-volcanic-field")!;
            assert.equal(az.value, 0);
            assert.equal(az.rank, null);
          }
  });

  test("best-window mode quotes the held-out mean", () => {
    const rows = rankSites(data, "mons-mouton", "strict-28", SEP, "best");
    const el = rows.find((r) => r.site.id === "ellesmere-inland")!;
    assert.equal(el.value, 3.3);
    assert.equal(el.scores.best_window?.start, "09-24");
  });

  test("month peaks are the best share among sites", () => {
    const peaks = monthPeaks(data, "mons-mouton", "strict-28");
    assert.equal(peaks.length, 12);
    for (let m = 0; m < 12; m++) {
      const top = rankSites(data, "mons-mouton", "strict-28", m, "month")[0];
      assert.equal(peaks[m], top.scores.score[m]);
    }
    assert.ok(peaks.every((v) => v <= data.maxScore));
  });
});

describe("searched points", () => {
  test("point lighting matches the sun engine on the sample day", () => {
    const light = pointLight(35.2, -111.65, SEP, 6.9);
    const day = bandDay(35.2, -111.65, sampleDate(SEP), 6.9);
    assert.equal(light.hours, day.hours);
    assert.equal(light.year.length, 12);
    assert.ok(light.hours > 0.9 && light.hours < 1.4, `Flagstaff ${light.hours}`);
    assert.ok(light.longestHours < 1, "never a 2-hour stretch in Arizona");
  });

  test("nearest calculated site", () => {
    const n = nearestSite(data.sites, 79.99, -85.93); // Eureka, Nunavut
    assert.equal(n.site.id, "axel-heiberg");
    assert.ok(n.km > 90 && n.km < 140, `${n.km} km`);
  });

  test("local and UTC clock hours", () => {
    assert.equal(utcHourOfLocal(12 * 60, -75), 17);
    assert.equal(localHourOfUtc(17, -75), 12);
    assert.equal(localHourOfUtc(1, 30), 3);
    assert.equal(utcHourOfLocal(60, 45), 22);
  });

  test("the ring hour puts the site inside the band", () => {
    const el = data.sites.find((s) => s.id === "ellesmere-inland")!;
    const h = ringHour(el.lat, el.lon, SEP, 6.9);
    const day = bandDay(el.lat, el.lon, sampleDate(SEP), 6.9);
    const local = localHourOfUtc(h, el.lon) * 60;
    assert.ok(day.windows.some(([a, b]) => local >= a && local < b), `local ${local}`);
  });
});

describe("search", () => {
  test("accent folding", () => {
    assert.equal(fold("Utqiaġvik Ny-Ålesund"), "utqiagvik ny-alesund");
  });

  test("sites and Moon features match by name and region", () => {
    const r = localResults("ellesmere", data.sites, MOON_FEATURES);
    assert.equal(r[0].kind, "site");
    const m = localResults("shackleton", data.sites, MOON_FEATURES);
    assert.equal(m[0].kind === "moon" && m[0].feature.gazetteer, 5450);
    assert.equal(localResults("", data.sites, MOON_FEATURES).length, 0);
    const moonFirst = localResults("a", data.sites, MOON_FEATURES, true);
    assert.equal(moonFirst[0].kind, "moon");
  });

  test("every planner target has a Moon feature at the same coordinates", () => {
    for (const t of data.targets) {
      const f = targetFeature(t.id);
      assert.equal(f.lat, t.lat);
      assert.equal(f.lon, t.lon);
    }
  });

  test("Photon responses", () => {
    const places = parsePhoton({
      features: [
        { geometry: { coordinates: [-111.65, 35.2] }, properties: { name: "Flagstaff", state: "Arizona", country: "United States" } },
        { geometry: { coordinates: [-111.65, 35.2] }, properties: { name: "Flagstaff", state: "Arizona", country: "United States" } },
        { geometry: { coordinates: [10, 20] }, properties: {} },
        { properties: { name: "No point" } },
      ],
    });
    assert.deepEqual(places, [{ name: "Flagstaff", detail: "Arizona, United States", lat: 35.2, lon: -111.65 }]);
    assert.deepEqual(parsePhoton(null), []);
    assert.deepEqual(parsePhoton({ features: "x" }), []);
  });
});
