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
  ink3: "#7A7F88",
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

/** Ramp colour for `t` in 0–1 as [r, g, b]. */
export function rampRgb(t: number): Rgb {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(Math.floor(x), RAMP.length - 2);
  const f = x - i;
  return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * f)) as Rgb;
}

/** Ramp colour for `t` in 0–1 as a CSS colour. */
export const rampColor = (t: number) => `rgb(${rampRgb(t).join(" ")})`;

/** Ramp as a CSS gradient, for legends. */
export const rampGradient = (direction = "90deg", stops = 6) =>
  `linear-gradient(${direction}, ${Array.from({ length: stops }, (_, i) => rampColor(i / (stops - 1))).join(", ")})`;

/** Text colour that stays readable on a ramp cell. */
export const onRamp = (t: number) => (t > 0.55 ? COLORS.inkOnSun : COLORS.ink);
