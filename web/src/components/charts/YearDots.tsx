"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { COLORS, rampColor } from "@/lib/palette";

import { useSize } from "./hooks";

interface YearDotsProps {
  /** Usable days per year, in the order of `years`. */
  values: number[];
  years: number[];
  campaignDays: number;
  /** Size classes; the chart fills the box. */
  className?: string;
}

const M = { l: 16, r: 16, t: 10, b: 30 };

/**
 * Lay dots out on one axis without overlap: each dot takes the lowest row
 * where it clears every dot already placed in that row.
 */
function beeswarm(xs: number[], r: number): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const rows: number[][] = [];
  const out = new Array<number>(xs.length);
  for (const [x, i] of order) {
    let row = rows.findIndex((placed) => placed.every((p) => Math.abs(p - x) >= 2 * r + 1));
    if (row < 0) row = rows.push([]) - 1;
    rows[row].push(x);
    out[i] = row;
  }
  return out;
}

/** One dot per season on a 0–campaignDays axis. */
export function YearDots({ values, years, campaignDays, className }: YearDotsProps) {
  const [box, { width, height }] = useSize<HTMLDivElement>({ width: 360, height: 200 });
  const plot = { x: M.l, y: M.t, w: width - M.l - M.r, h: height - M.t - M.b };
  const x = scaleLinear([0, campaignDays], [plot.x, plot.x + plot.w]);
  const xs = values.map((v) => x(v));

  // Largest radius, up to 11 px, at which the stacked rows still fit.
  let r = 11;
  let rows = beeswarm(xs, r);
  while (r > 4 && (Math.max(0, ...rows) + 1) * (2 * r + 1) > plot.h) {
    r -= 0.5;
    rows = beeswarm(xs, r);
  }
  const ticks = Array.from({ length: Math.floor(campaignDays / 2) + 1 }, (_, i) => i * 2);

  return (
    <div ref={box} className={cn("relative w-full", className ?? "h-[200px]")}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Usable days in each year: ${values.map((v, k) => `${years[k]} ${formatNumber(v)}`).join(", ")}`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={x(v)}
              x2={x(v)}
              y1={plot.y}
              y2={plot.y + plot.h}
              stroke={COLORS.ink}
              strokeOpacity={v === 0 ? 0.2 : 0.05}
            />
            <text x={x(v)} y={height - 10} textAnchor="middle">
              {v}
            </text>
          </g>
        ))}
        {values.map((v, k) => {
          const on = v > 0;
          return (
            <motion.g
              key={years[k]}
              initial={false}
              animate={{ x: xs[k], y: plot.y + plot.h - r - 1 - rows[k] * (2 * r + 1) }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.7, delay: k * 0.02 }}
            >
              <circle
                r={r}
                fill={on ? rampColor(Math.min(1, 0.35 + (0.65 * v) / campaignDays)) : COLORS.sky2}
                stroke={on ? COLORS.sky0 : COLORS.ink3}
                strokeWidth={on ? 1.5 : 1.2}
              >
                <title>{`${years[k]}: ${formatNumber(v)} usable ${v === 1 ? "day" : "days"}`}</title>
              </circle>
              {r >= 8 && (
                <text
                  y={3.2}
                  textAnchor="middle"
                  style={{ fontSize: r >= 10 ? 9 : 8, fill: on ? COLORS.inkOnSun : COLORS.ink3 }}
                >
                  {String(years[k]).slice(2)}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
