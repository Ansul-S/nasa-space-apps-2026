import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatClock,
  formatDayRange,
  formatDuration,
  formatLatLon,
  formatMinutes,
  formatNumber,
  formatPercent,
  formatRange,
  formatTemp,
  shortName,
} from "./format.ts";

test("numbers drop trailing zeros and use a true minus sign", () => {
  assert.equal(formatNumber(3.3), "3.3");
  assert.equal(formatNumber(7.0), "7");
  assert.equal(formatNumber(10), "10");
  assert.equal(formatNumber(0.04), "0");
  assert.equal(formatNumber(-0.04), "0");
  assert.equal(formatNumber(-28.5), "−28.5");
  assert.equal(formatNumber(3.14159, 2), "3.14");
  assert.equal(formatNumber(null), "—");
});

test("durations", () => {
  assert.equal(formatMinutes(36), "36 min");
  assert.equal(formatMinutes(194), "3 h 14 min");
  assert.equal(formatMinutes(192), "3 h 12 min");
  assert.equal(formatDuration(2), "2 h");
  assert.equal(formatDuration(4.18), "4 h 11 min");
});

test("dates, clock and ranges", () => {
  assert.equal(formatDayRange("09-24", "10-07"), "24 Sep – 7 Oct");
  assert.equal(formatClock(10.5), "10:30");
  assert.equal(formatClock(24), "00:00");
  assert.equal(formatClock(-0.25), "23:45");
  assert.equal(formatRange(1, 7), "1–7");
});

test("percent, temperature, coordinates and names", () => {
  assert.equal(formatPercent(0.686), "69%");
  assert.equal(formatTemp(-28.5), "−28.5\u00a0°C");
  assert.equal(formatLatLon(81, -75), "81.00° N · 75.00° W");
  assert.equal(shortName("Svalbard (Adventdalen)"), "Svalbard");
});
