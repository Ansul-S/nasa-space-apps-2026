/**
 * Checks the browser sun engine against the pipeline output in public/data.
 * Run with `pnpm test` (Node's built-in test runner, no build step).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  apparentElevation,
  bandDay,
  bandWindows,
  elevationCircle,
  geometricFromApparent,
  lowSunRing,
  refraction,
  ringLimits,
  sampleDate,
  solarPosition,
  subsolarPoint,
  sunDay,
} from "./sun.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, DATA), "utf8"));

interface SunSampleMonth {
  date: string;
  elevation: number[];
  windows: Record<string, [number, number][]>;
}
interface SiteFile {
  site: { id: string; lat: number; lon: number };
  sun_samples: { step_min: number; months: SunSampleMonth[] };
}

const index = readJson("index.json");
const targets: { id: string; band_max_deg: number; band_min_deg: number }[] = index.targets;
const sites: SiteFile[] = index.sites.map((s: { id: string }) => readJson(`sites/${s.id}.json`));
const byId = (id: string) => sites.find((s) => s.site.id === id)!;

describe("band windows match the pipeline", () => {
  for (const file of sites) {
    test(file.site.id, () => {
      const { lat, lon } = file.site;
      file.sun_samples.months.forEach((month, i) => {
        assert.equal(month.date, sampleDate(i));
        for (const t of targets) {
          const ours = bandWindows(lat, lon, month.date, t.band_max_deg, t.band_min_deg);
          assert.deepEqual(ours, month.windows[t.id], `${month.date} ${t.id}`);
        }
      });
    });
  }

  test("story numbers for 15 September 2025", () => {
    const mouton = targets.find((t) => t.id === "mons-mouton")!.band_max_deg;
    const az = byId("sf-volcanic-field").site;
    const el = byId("ellesmere-inland").site;
    const minutes = (d: ReturnType<typeof bandDay>) => d.windows.map(([a, b]) => b - a);
    assert.deepEqual(minutes(bandDay(az.lat, az.lon, "2025-09-15", mouton)), [36, 36]);
    assert.deepEqual(minutes(bandDay(el.lat, el.lon, "2025-09-15", mouton)), [194, 192]);
  });
});

describe("daily sun path matches the pipeline", () => {
  for (const file of sites) {
    test(file.site.id, () => {
      const { lat, lon } = file.site;
      for (const month of file.sun_samples.months) {
        const ours = sunDay(lat, lon, month.date, file.sun_samples.step_min);
        assert.equal(ours.length, month.elevation.length);
        // The pipeline rounds to 0.1 degree.
        ours.forEach((e, k) => assert.ok(Math.abs(e - month.elevation[k]) <= 0.0501, `${month.date} step ${k}`));
      }
    });
  }
});

describe("monthly band hours match the pipeline", () => {
  // Same 5-minute grid as pipeline/src/analog_pipeline/analysis.py: steps start on
  // 2016-01-01 00:00 UTC, the Sun is sampled at each step midpoint, and a local
  // mean solar day owns the steps whose midpoint falls inside it.
  const STEP_MS = 5 * 60_000;
  const START = Date.UTC(2016, 0, 1);
  const N_DAYS = index.period.days as number;
  const firstStep = (lon: number) => Math.ceil((1440 - 4 * lon - 2.5) / 5);

  for (const id of ["sf-volcanic-field", "ellesmere-inland", "mcmurdo-dry-valleys"]) {
    test(id, () => {
      const { lat, lon } = byId(id).site;
      const k0 = firstStep(lon);
      const sums = targets.map(() => new Array(12).fill(0));
      const days = new Array(12).fill(0);
      for (let d = 0; d < N_DAYS; d++) {
        const month = new Date(START + (d + 1) * 86_400_000).getUTCMonth();
        days[month]++;
        for (let j = 0; j < 288; j++) {
          const e = apparentElevation(START + (k0 + d * 288 + j) * STEP_MS + STEP_MS / 2, lat, lon);
          targets.forEach((t, ti) => {
            if (e >= t.band_min_deg && e <= t.band_max_deg) sums[ti][month] += 5;
          });
        }
      }
      targets.forEach((t, ti) => {
        const expected: number[] = index.conditions[t.id][id].band_hours;
        expected.forEach((h, m) => {
          const ours = sums[ti][m] / days[m] / 60;
          assert.ok(Math.abs(ours - h) <= 0.0051, `${t.id} month ${m + 1}: ${ours.toFixed(3)} vs ${h}`);
        });
      });
    });
  }
});

describe("sun position", () => {
  test("Sun is overhead at the subsolar point", () => {
    for (const ms of [Date.UTC(2025, 2, 20, 9), Date.UTC(2025, 5, 21, 15), Date.UTC(2025, 11, 21, 3)]) {
      const s = subsolarPoint(ms);
      assert.ok(solarPosition(ms, s.lat, s.lon).elevation > 89.95);
    }
  });

  test("declination at the solstices", () => {
    assert.ok(Math.abs(subsolarPoint(Date.UTC(2025, 5, 21, 3)).lat - 23.44) < 0.01);
    assert.ok(Math.abs(subsolarPoint(Date.UTC(2025, 11, 21, 15)).lat + 23.44) < 0.01);
  });

  test("refraction inverse round-trips", () => {
    for (const apparent of [-1, 0, 0.5, 3, 6.9, 15, 40]) {
      const g = geometricFromApparent(apparent);
      assert.ok(Math.abs(g + refraction(g) - apparent) < 1e-9, `${apparent}`);
    }
    const [lower, upper] = ringLimits(6.9);
    assert.ok(Math.abs(lower + 0.572) < 0.01);
    assert.ok(Math.abs(upper - 6.77) < 0.01);
  });
});

describe("low-sun ring", () => {
  const ms = Date.UTC(2025, 8, 15, 10, 30);

  test("every point on an elevation circle has that elevation", () => {
    const sub = subsolarPoint(ms);
    for (const e of [-0.57, 0, 6.77, 30]) {
      for (const p of elevationCircle(sub, e, 90)) {
        assert.ok(Math.abs(solarPosition(ms, p.lat, p.lon).elevation - e) < 0.02, `${e} at ${p.lat},${p.lon}`);
      }
    }
  });

  test("ring edges sit at the band limits in apparent elevation", () => {
    const ring = lowSunRing(ms, 6.9, 0, 120);
    for (const p of ring.lower) assert.ok(Math.abs(apparentElevation(ms, p.lat, p.lon)) < 0.03);
    for (const p of ring.upper) assert.ok(Math.abs(apparentElevation(ms, p.lat, p.lon) - 6.9) < 0.03);
  });
});
