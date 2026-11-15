/**
 * Colour values that code needs at runtime (SVG charts, WebGL, inline styles).
 * They mirror the tokens in app/globals.css; keep the two in step.
 */

export const COLORS = {
  sky0: "#05070A",
  sky1: "#0A0E14",
  sky2: "#111722",
  sky3: "#1A2230",
  ink: "#ECE8E1",
  ink2: "#ABADB2",
  ink3: "#858A93",
  inkOnSun: "#1B1007",
  sun: "#F6B65A",
  sunHot: "#FF8A3D",
  sunPale: "#FFE3A8",
  ember: "#8C3B1E",
  ice: "#9DB7D5",
  rose: "#E58A7B",
} as const;

type Rgb = [number, number, number];

/** Score ramp: no usable light is near-black, Moon-like is pale gold. */
const RAMP: Rgb[] = [
  [0x2a, 0x17, 0x10],
  [0x6e, 0x2e, 0x18],
  [0xc0, 0x5e, 0x26],
  [0xf0, 0x9a, 0x45],
  [0xf6, 0xb6, 0x5a],
  [0xff, 0xe3, 0xa8],
];

/**
 * The same scale for paper: no usable light is the paper itself, Moon-like is
 * deep gold, so the strongest cells still stand out in black-and-white print.
 */
const PAPER_RAMP: Rgb[] = [
  [0xf6, 0xf2, 0xea],
  [0xf6, 0xe0, 0xb4],
  [0xee, 0xbf, 0x72],
  [0xd9, 0x92, 0x3c],
  [0xb0, 0x63, 0x1c],
  [0x7a, 0x3c, 0x10],
];

/** Colours of the printed card: light paper, dark ink, a gold that keeps its contrast on white. */
export const PAPER = {
  paper: "#FFFFFF",
  ink: "#17150F",
  ink2: "#46433C",
  ink3: "#67635B",
  line: "#DDD7CC",
  line2: "#B9B2A5",
  sun: "#94570C",
  sunFill: "#D08A2C",
  rose: "#A8402D",
} as const;

function lerpRamp(stops: Rgb[], t: number): Rgb {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  const f = x - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f)) as Rgb;
}

/** Ramp colour for `t` in 0–1 as [r, g, b]. */
export const rampRgb = (t: number): Rgb => lerpRamp(RAMP, t);

/** Paper ramp colour for `t` in 0–1 as [r, g, b]. */
export const paperRampRgb = (t: number): Rgb => lerpRamp(PAPER_RAMP, t);

/** Ramp colour for `t` in 0–1 as a CSS colour. */
export const rampColor = (t: number) => `rgb(${rampRgb(t).join(" ")})`;

/** Paper ramp colour for `t` in 0–1 as a CSS colour. */
export const paperRampColor = (t: number) => `rgb(${paperRampRgb(t).join(" ")})`;

/** Ramp as a CSS gradient, for legends. */
export const rampGradient = (direction = "90deg", stops = 6) =>
  `linear-gradient(${direction}, ${Array.from({ length: stops }, (_, i) => rampColor(i / (stops - 1))).join(", ")})`;

/** Relative luminance of an sRGB colour (WCAG 2). */
function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const hexRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** WCAG contrast ratio of two colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text colour for a ramp cell with at least AA contrast (4.5:1): the theme's
 * light or dark ink, whichever reads better, or pure white or black where
 * neither ink is enough (the middle of the ramp).
 */
export const onRamp = (t: number) => readableInk(rampRgb(t), [COLORS.ink, COLORS.inkOnSun]);

/** Text colour for a paper ramp cell, by the same rule. */
export const onPaperRamp = (t: number) => readableInk(paperRampRgb(t), [PAPER.ink, PAPER.paper]);

function readableInk(bg: Rgb, choices: [string, string]): string {
  const inks = choices.map((c) => ({ c, k: contrast(hexRgb(c), bg) }));
  const best = inks[0].k >= inks[1].k ? inks[0] : inks[1];
  if (best.k >= 4.5) return best.c;
  return contrast([255, 255, 255], bg) >= contrast([0, 0, 0], bg) ? "#FFFFFF" : "#000000";
}
