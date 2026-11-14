/**
 * Checks the Moon sun engine against JPL Horizons: the sub-solar point on the
 * Moon (target 301, observer 500@399, quantity 15, MOON_ME frame, east-positive
 * longitude), requested on 15 Nov 2026.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { LUNAR_DAY_HOURS, moonLight, moonSubsolarPoint, moonSunElevation } from "./moon-sun.ts";

const HORIZONS: { utc: string; lon: number; lat: number }[] = [
  { utc: "2025-01-15T00:00:00Z", lon: 352.060348, lat: -1.412562 },
  { utc: "2025-04-15T06:00:00Z", lon: 333.321617, lat: 0.785045 },
  { utc: "2025-09-15T10:30:00Z", lon: 262.323621, lat: -0.16024 },
  { utc: "2025-12-15T18:00:00Z", lon: 230.284684, lat: -1.529586 },
];

const lonDiff = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

describe("Moon subsolar point matches JPL Horizons", () => {
  for (const ref of HORIZONS) {
    test(ref.utc, () => {
      const s = moonSubsolarPoint(Date.parse(ref.utc));
      assert.ok(Math.abs(s.lat - ref.lat) < 0.02, `lat ${s.lat} vs ${ref.lat}`);
      assert.ok(lonDiff(s.lon, ref.lon) < 0.02, `lon ${s.lon} vs ${ref.lon}`);
      assert.ok(s.lon >= -180 && s.lon <= 180);
    });
  }
});

describe("lighting at the lunar South Pole", () => {
  test("the Sun never climbs high at Mons Mouton", () => {
    const light = moonLight(-84.6, 31, 6.9, Date.UTC(2025, 8, 1));
    assert.ok(light.maxElevation < 6.9, `max ${light.maxElevation}`);
    assert.ok(light.maxElevation > 4, `max ${light.maxElevation}`);
    // Whenever the Sun is up there, it is inside the band.
    assert.equal(light.bandShare, light.upShare);
    assert.ok(light.upShare > 0.3 && light.upShare < 0.8);
  });

  test("the equator gets a full day and night, mostly above the band", () => {
    const light = moonLight(0, 0, 6.9, Date.UTC(2025, 8, 1));
    assert.ok(Math.abs(light.upShare - 0.5) < 0.03, `up ${light.upShare}`);
    assert.ok(light.bandShare < 0.06, `band ${light.bandShare}`);
    assert.ok(light.maxElevation > 85);
  });

  test("elevation at the subsolar point is 90°", () => {
    const ms = Date.parse("2025-09-15T10:30:00Z");
    const s = moonSubsolarPoint(ms);
    assert.ok(Math.abs(moonSunElevation(ms, s.lat, s.lon) - 90) < 1e-6);
  });

  test("lunar day length", () => {
    assert.ok(Math.abs(LUNAR_DAY_HOURS - 708.73) < 0.01);
  });
});
