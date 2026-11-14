/**
 * The landing story's figures, checked against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex, SiteDetail } from "./data.ts";
import { formatDayRange, formatMinutes, formatNumber, formatPercent } from "./format.ts";
import { ringSteps, ringTime, STORY_MONTH, STORY_SITE_IDS, toStoryData, windowMinutes, type StorySiteKey } from "./story.ts";
import { clockMs, solarPosition } from "./sun.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), "utf8")) as T;

const index = readJson<AnalogIndex>("index.json");
const details = Object.fromEntries(
  Object.entries(STORY_SITE_IDS).map(([key, id]) => [key, readJson<SiteDetail>(`sites/${id}.json`)]),
) as Record<StorySiteKey, SiteDetail>;
const story = toStoryData(index, details);

describe("story figures", () => {
  test("Mons Mouton: band 0–6.9°, the Sun circles the horizon in 29.5 days", () => {
    assert.equal(story.target.band_min_deg, 0);
    assert.equal(formatNumber(story.target.band_max_deg), "6.9");
    assert.equal(formatNumber(story.lunarDayDays), "29.5");
  });

  test("15 September: Arizona 36 min twice, Ellesmere 3 h 14 min and 3 h 12 min", () => {
    assert.equal(story.days.arizona.date, "2025-09-15");
    assert.equal(story.days.ellesmere.date, "2025-09-15");
    assert.deepEqual(windowMinutes(story.days.arizona.windows).map(formatMinutes), ["36 min", "36 min"]);
    assert.deepEqual(windowMinutes(story.days.ellesmere.windows).map(formatMinutes), ["3 h 14 min", "3 h 12 min"]);
  });

  test("Svalbard in August: 6.3 h of low sun, 3% clear hours, 0 usable days", () => {
    assert.equal(formatNumber(story.svalbardAugust.bandHours), "6.3");
    assert.equal(formatPercent(story.svalbardAugust.clearShare), "3%");
    assert.equal(formatNumber(story.svalbardAugust.expected), "0");
    assert.equal(story.svalbardAugust.clearSky, "breaks_down");
  });

  test("Ellesmere in April: wind chill median −28.5 °C, 47% of hours at −28 °C or warmer", () => {
    assert.equal(formatNumber(story.ellesmereApril.windChillMedian), "−28.5");
    assert.equal(formatPercent(story.ellesmereApril.windChillOkShare), "47%");
    assert.equal(formatNumber(story.ellesmereApril.expected), "2.1");
    assert.equal(formatNumber(story.ellesmereApril.bandHours), "7.3");
    assert.equal(story.ellesmereApril.windChill, "partial");
  });

  test("Ellesmere best window: 24 Sep – 7 Oct, 3.3 usable days held out, 69% chance of 3 or more", () => {
    assert.equal(formatDayRange(story.ellesmereBest.start, story.ellesmereBest.end), "24 Sep – 7 Oct");
    assert.equal(formatNumber(story.ellesmereBest.held_out_mean), "3.3");
    assert.equal(formatPercent(story.ellesmereBest.p_at_least), "69%");
    assert.equal(story.minUsableDays, 3);
    assert.equal(story.ellesmereCell.class, "mixed");
    assert.deepEqual(story.ellesmereBestLevels, { sunBand: "match", windChill: "match", clearSky: "breaks_down" });
  });

  test("Devon Island: 0 usable days in July, best window 30 Apr – 13 May with 3.0", () => {
    assert.equal(formatNumber(story.devonJuly.expected), "0");
    assert.equal(formatNumber(story.devonJuly.bandHours), "1.8");
    // The Sun never sets in July and only dips into the band around midnight.
    assert.ok(story.devonJuly.sunMin > 0 && story.devonJuly.sunMin < story.target.band_max_deg);
    assert.equal(formatPercent(story.devonJuly.cloudMean / 100), "77%");
    assert.equal(formatDayRange(story.devonBest.start, story.devonBest.end), "30 Apr – 13 May");
    assert.equal(formatNumber(story.devonBest.held_out_mean), "3");
  });

  test("record years and preset", () => {
    assert.deepEqual(story.years, [2016, 2025]);
    assert.equal(story.preset.cloud_max_pct, 30);
    assert.equal(story.preset.wind_chill_min_c, -28);
  });
});

describe("ring story clock", () => {
  const steps = ringSteps(story);
  const elevation = (ms: number, key: "arizona" | "ellesmere") =>
    solarPosition(ms, story.sites[key].lat, story.sites[key].lon).apparentElevation;
  const inBand = (e: number) => e >= story.target.band_min_deg && e <= story.target.band_max_deg;

  test("the still frames put Arizona and Ellesmere inside the band", () => {
    assert.ok(inBand(elevation(ringTime(steps[1].clock, null), "arizona")));
    assert.ok(inBand(elevation(ringTime(steps[2].clock, null), "ellesmere")));
    assert.ok(inBand(elevation(ringTime(steps[3].clock, null), "ellesmere")));
  });

  test("the Arizona loop starts and ends outside the band", () => {
    const c = steps[1].clock;
    assert.equal(c.kind, "day");
    if (c.kind !== "day") return;
    assert.ok(!inBand(elevation(clockMs(STORY_MONTH, c.from), "arizona")));
    assert.ok(!inBand(elevation(clockMs(STORY_MONTH, c.to - 0.01), "arizona")));
  });

  test("day loops stay on the sample day; the year loop keeps its hour", () => {
    for (const s of steps) {
      for (const sec of [0, 1.3, 7.9, 40]) {
        const d = new Date(ringTime(s.clock, sec));
        if (s.clock.kind === "day") assert.equal(d.toISOString().slice(0, 10), "2025-09-15");
        else assert.equal(d.getUTCHours() + d.getUTCMinutes() / 60, Math.round(s.clock.hour * 60) / 60);
      }
    }
    const year = steps[3].clock;
    assert.equal(new Date(ringTime(year, 0)).toISOString().slice(0, 10), "2025-09-15");
    assert.equal(new Date(ringTime(year, 365 / 24)).getUTCFullYear(), 2025);
  });
});
