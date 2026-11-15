/**
 * Colour checks: text on the score ramp keeps AA contrast everywhere.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { contrast, onRamp, rampRgb } from "./palette.ts";

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

test("text on every ramp colour has at least 4.5:1 contrast", () => {
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const k = contrast(rgb(onRamp(t)), rampRgb(t));
    assert.ok(k >= 4.5, `t=${t}: ${onRamp(t)} on rgb(${rampRgb(t).join(",")}) is ${k.toFixed(2)}:1`);
  }
});

test("contrast matches the WCAG reference values", () => {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]).toFixed(1), "21.0");
  assert.equal(contrast([255, 255, 255], [255, 255, 255]), 1);
});
