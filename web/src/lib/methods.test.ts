/**
 * The methods page's validation figures, checked against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex, SiteDetail } from "./data.ts";
import { formatNumber } from "./format.ts";
import { FIELD_SEASON, METHODS_SITE_IDS, repoFile, toMethodsData, type MethodsSiteKey } from "./methods.ts";

const DATA = new URL("../../public/data/", import.meta.url);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, DATA), "utf8")) as T;

const index = readJson<AnalogIndex>("index.json");
const details = Object.fromEntries(
  Object.entries(METHODS_SITE_IDS).map(([key, id]) => [key, readJson<SiteDetail>(`sites/${id}.json`)]),
) as Record<MethodsSiteKey, SiteDetail>;
const data = toMethodsData(index, details);

describe("validation checks", () => {
  test("Arizona: no usable day in any of 96 month, target and preset cases", () => {
    assert.equal(data.arizona.cases, 12 * index.targets.length * index.presets.length);
    assert.equal(data.arizona.cases, 96);
    assert.equal(data.arizona.usableCases, 0);
  });

  test("Arizona: the longest low-sun stretch is under the 2 h a usable day needs", () => {
    assert.ok(data.arizona.longestWindowMax < Number(index.rule.window_min_h));
    assert.equal(formatNumber(data.arizona.longestWindowMax), "0.7");
    assert.equal(formatNumber(data.arizona.bandHoursMax), "1.4");
  });

  test("Arizona: terrain matches Mons Mouton (distance 0.19)", () => {
    assert.equal(data.arizona.terrainLevel, "match");
    assert.equal(formatNumber(data.arizona.terrainKs, 2), "0.19");
  });

  test("Svalbard in August: median 0 usable days in all 8 target and preset cases", () => {
    assert.equal(data.svalbard.cases, 8);
    assert.equal(data.svalbard.zeroMedianCases, 8);
    assert.ok(data.svalbard.expectedMax < 0.5);
    assert.equal(formatNumber(data.svalbard.cloudMeanPct, 0), "82");
  });

  test("Ellesmere: April beats March at −28 °C for both targets and both cloud limits", () => {
    assert.equal(data.ellesmere.length, 4);
    for (const c of data.ellesmere) assert.ok(c.april > c.march, `${c.targetId} ${c.presetId}`);
    const mouton = data.ellesmere.find((c) => c.targetId === "mons-mouton" && c.presetId === "strict-28");
    assert.equal(formatNumber(mouton?.march), "0.9");
    assert.equal(formatNumber(mouton?.april), "2.1");
  });

  test("best windows: the held-out mean is never above the in-sample mean", () => {
    assert.equal(data.heldOut.count, 104);
    assert.equal(data.heldOut.aboveInSample, 0);
    assert.equal(formatNumber(data.heldOut.meanInflation), "0.5");
    assert.equal(formatNumber(data.heldOut.maxInflation), "1.8");
    assert.equal(formatNumber(data.heldOut.example.mean), "3.7");
    assert.equal(formatNumber(data.heldOut.example.held_out_mean), "3.3");
  });

  test("field season: Devon Island is snow-free in July and August, the Haughton-Mars Project's months", () => {
    assert.equal(FIELD_SEASON.site, data.sites.devon.id);
    assert.deepEqual(data.fieldSeason.snowFreeMonths, [6, 7]);
    assert.ok(data.fieldSeason.holds);
  });

  test("weather cells: 3 representative, 8 mixed, 3 not representative", () => {
    assert.deepEqual(data.cells, { representative: 3, mixed: 8, not_representative: 3 });
  });

  test("the record and the counts the page quotes", () => {
    assert.deepEqual(data.years, [2016, 2025]);
    assert.equal(data.siteCount, 14);
    assert.equal(data.sourceCount, Object.keys(index.sources).length);
  });

  test("repository links point at files that exist", () => {
    for (const path of [
      "pipeline/tests/test_validation.py",
      "pipeline/tests/test_terrain.py",
      "pipeline/tests/test_sun.py",
      "pipeline/tests/test_odds.py",
      "web/src/lib/sun.test.ts",
      "web/src/lib/methods.test.ts",
      "pipeline/README.md",
    ]) {
      readFileSync(new URL(`../../../${path}`, import.meta.url));
      assert.match(repoFile(path), /^https:\/\/github\.com\/Ansul-S\/nasa-space-apps-2026\/blob\/main\//);
    }
  });
});
