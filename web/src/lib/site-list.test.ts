/**
 * The sites overview, checked against the pipeline output in public/data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import type { AnalogIndex } from "./data.ts";
import { formatNumber } from "./format.ts";
import { toSiteList } from "./site-list.ts";

const index = JSON.parse(
  readFileSync(new URL("../../public/data/index.json", import.meta.url), "utf8"),
) as AnalogIndex;
const list = toSiteList(index);

describe("sites overview", () => {
  test("lists every site once", () => {
    assert.equal(list.cards.length, index.sites.length);
    assert.equal(new Set(list.cards.map((c) => c.site.id)).size, index.sites.length);
  });

  test("ranks by held-out best-window days, highest first", () => {
    const ranked = list.cards.filter((c) => c.best);
    for (let i = 1; i < ranked.length; i++)
      assert.ok(ranked[i - 1].best!.held_out_mean >= ranked[i].best!.held_out_mean);
    assert.deepEqual(
      ranked.map((c) => c.rank),
      ranked.map((_, i) => i + 1),
    );
  });

  test("Peary Land leads and Ellesmere Island has 3.3 days, 24 Sep – 7 Oct", () => {
    assert.equal(list.cards[0].site.id, "peary-land");
    assert.equal(formatNumber(list.cards[0].best?.held_out_mean), "4.5");
    const ellesmere = list.cards.find((c) => c.site.id === "ellesmere-inland");
    assert.equal(formatNumber(ellesmere?.best?.held_out_mean), "3.3");
    assert.equal(ellesmere?.best?.start, "09-24");
  });

  test("Arizona has no window, no rank and comes last", () => {
    const az = list.cards.find((c) => c.site.id === "sf-volcanic-field");
    assert.equal(az?.best, null);
    assert.equal(az?.rank, null);
    assert.equal(az?.bestMonth, null);
    assert.equal(list.cards.at(-1)?.best, null);
  });

  test("counts: 5 validation and 9 candidate sites", () => {
    assert.equal(list.counts.validation, 5);
    assert.equal(list.counts.candidate, 9);
    assert.equal(list.counts.validation + list.counts.candidate, index.sites.length);
  });
});
