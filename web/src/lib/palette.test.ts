/**
 * Colour checks: text on the score ramp keeps AA contrast everywhere.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { contrast, onPaperRamp, onRamp, PAPER, paperRampRgb, rampRgb } from "./palette.ts";

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

test("text on every ramp colour has at least 4.5:1 contrast", () => {
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const k = contrast(rgb(onRamp(t)), rampRgb(t));
    assert.ok(k >= 4.5, `t=${t}: ${onRamp(t)} on rgb(${rampRgb(t).join(",")}) is ${k.toFixed(2)}:1`);
  }
});

test("text on every paper ramp colour has at least 4.5:1 contrast", () => {
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const k = contrast(rgb(onPaperRamp(t)), paperRampRgb(t));
    assert.ok(k >= 4.5, `t=${t}: ${onPaperRamp(t)} on rgb(${paperRampRgb(t).join(",")}) is ${k.toFixed(2)}:1`);
  }
});

test("print text colours reach AA on white paper", () => {
  for (const key of ["ink", "ink2", "ink3", "sun", "rose"] as const) {
    const k = contrast(rgb(PAPER[key]), rgb(PAPER.paper));
    assert.ok(k >= 4.5, `${key} ${PAPER[key]} is ${k.toFixed(2)}:1 on white`);
  }
});

test("contrast matches the WCAG reference values", () => {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]).toFixed(1), "21.0");
  assert.equal(contrast([255, 255, 255], [255, 255, 255]), 1);
});
