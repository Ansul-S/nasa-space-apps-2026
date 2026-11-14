"use client";

import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useId, useState } from "react";

import type { PresetMonth } from "@/lib/data";
import { formatNumber, formatPercent, formatRange, MONTH_INITIALS, MONTHS } from "@/lib/format";
import { COLORS, rampColor } from "@/lib/palette";

import { ChartTip } from "./ChartTip";
import { useSize } from "./hooks";

interface OddsChartProps {
  months: PresetMonth[];
  /** Selected start month, 0-based. */
  month: number;
  onMonth: (month: number) => void;
  campaignDays: number;
  minUsableDays: number;
  maxScore: number;
}

const M = { l: 34, r: 14, t: 36, b: 28 };
const SPRING = { type: "spring", bounce: 0.15, duration: 0.6 } as const;

/**
 * Usable days in a campaign starting in each month: the median as a bar,
 * the bad-year to good-year range as a line, and the chance of at least
 * `minUsableDays` days above each column.
 */
export function OddsChart({ months, month, onMonth, campaignDays, minUsableDays, maxScore }: OddsChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [box, { width, height }] = useSize<HTMLDivElement>({ width: 680, height: 300 });
  const [hover, setHover] = useState<number | null>(null);

  const compact = width < 560;
  const plot = { x: M.l, y: M.t, w: width - M.l - M.r, h: height - M.t - M.b };
  const y = scaleLinear([0, campaignDays], [plot.y + plot.h, plot.y]);
  const cw = plot.w / 12;
  const cx = (i: number) => plot.x + cw * i + cw / 2;
  const bw = Math.min(30, cw * 0.46);
  const base = y(0);
  const ticks = [...new Set([0, minUsableDays, Math.round(campaignDays / 2), campaignDays])];

  const tipMonth = hover ?? null;
  const tipOdds = tipMonth == null ? null : months[tipMonth].odds;

  return (
    <div ref={box} className="relative h-[260px] w-full sm:h-[300px]">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="chart absolute inset-0 h-full w-full select-none"
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={`${uid}-bars`}>
            <rect x={0} y={0} width={width} height={base} />
          </clipPath>
        </defs>

        {/* Selected start month. */}
        <motion.rect
          initial={false}
          animate={{ attrX: plot.x + cw * month + 2 }}
          transition={SPRING}
          y={plot.y - 30}
          width={Math.max(0, cw - 4)}
          height={plot.h + 30}
          rx={8}
          fill={COLORS.ink}
          fillOpacity="0.04"
          stroke={COLORS.ink}
          strokeOpacity="0.12"
        />

        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={plot.x}
              x2={plot.x + plot.w}
              y1={y(v)}
              y2={y(v)}
              stroke={v === minUsableDays ? COLORS.sun : COLORS.ink}
              strokeOpacity={v === 0 ? 0.25 : v === minUsableDays ? 0.35 : 0.06}
              strokeDasharray={v === minUsableDays ? "3 4" : undefined}
            />
            <text x={plot.x - 10} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {!compact && (
          <text x={plot.x + plot.w} y={y(minUsableDays) - 6} textAnchor="end" className="fill-sun/80">
            {minUsableDays} days
          </text>
        )}

        <g clipPath={`url(#${uid}-bars)`}>
          {months.map((p, i) => {
            const o = p.odds;
            const has = o.median > 0;
            const top = has ? y(o.median) : base;
            return (
              <motion.rect
                key={i}
                x={cx(i) - bw / 2}
                width={bw}
                rx={4}
                initial={false}
                animate={{
                  attrY: top,
                  height: base - top + 6,
                  fill: has ? rampColor(0.2 + 0.8 * Math.min(1, p.usable_share / maxScore)) : COLORS.sky3,
                }}
                transition={SPRING}
              />
            );
          })}
        </g>

        {months.map((p, i) => {
          const o = p.odds;
          const selected = i === month;
          return (
            <g key={i}>
              {o.p90 > 0 ? (
                <>
                  <motion.line
                    x1={cx(i)}
                    x2={cx(i)}
                    initial={false}
                    animate={{ y1: y(o.p10), y2: y(o.p90) }}
                    transition={SPRING}
                    stroke={COLORS.ink2}
                    strokeWidth="1.5"
                  />
                  <motion.line
                    x1={cx(i) - 6}
                    x2={cx(i) + 6}
                    initial={false}
                    animate={{ y1: y(o.p90), y2: y(o.p90) }}
                    transition={SPRING}
                    stroke={COLORS.ink2}
                    strokeWidth="1.5"
                  />
                </>
              ) : null}
              {o.median <= 0 && (
                <line
                  x1={cx(i) - bw / 2}
                  x2={cx(i) + bw / 2}
                  y1={base - 1}
                  y2={base - 1}
                  stroke={COLORS.ink3}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
              <text
                x={cx(i)}
                y={plot.y - 12}
                textAnchor="middle"
                className={
                  o.p_at_least >= 0.5 ? "fill-sun" : o.p_at_least > 0 ? "fill-ink-2" : "fill-ink-3/60"
                }
              >
                {o.p_at_least > 0 ? (compact ? Math.round(o.p_at_least * 100) : formatPercent(o.p_at_least)) : "0"}
              </text>
              <text x={cx(i)} y={height - 8} textAnchor="middle" className={selected ? "fill-ink" : undefined}>
                {compact ? MONTH_INITIALS[i] : MONTHS[i]}
              </text>
              <rect
                x={cx(i) - cw / 2}
                y={plot.y - 32}
                width={cw}
                height={plot.h + 32 + M.b}
                fill="transparent"
                className="cursor-pointer"
                onPointerEnter={() => setHover(i)}
                onClick={() => onMonth(i)}
              />
            </g>
          );
        })}
      </svg>

      <ChartTip
        x={tipMonth == null ? 0 : cx(tipMonth)}
        y={tipOdds ? y(Math.max(tipOdds.median, tipOdds.p90)) : 0}
        width={width}
        visible={tipMonth != null}
      >
        {tipOdds && tipMonth != null && (
          <>
            {MONTHS[tipMonth]} start · median <b className="font-medium">{formatNumber(tipOdds.median, 0)}</b>{" "}
            <span>·</span> {formatRange(tipOdds.p10, tipOdds.p90)} <span>·</span> P(≥{minUsableDays}){" "}
            {formatPercent(tipOdds.p_at_least)}
          </>
        )}
      </ChartTip>

      <div className="sr-only">
        <table>
          <caption>Usable days for a {campaignDays}-day campaign starting in each month</caption>
          <thead>
            <tr>
              <th scope="col">Start month</th>
              <th scope="col">Median usable days</th>
              <th scope="col">Bad year to good year</th>
              <th scope="col">Chance of {minUsableDays} or more</th>
            </tr>
          </thead>
          <tbody>
            {months.map((p, i) => (
              <tr key={i}>
                <th scope="row">{MONTHS[i]}</th>
                <td>{formatNumber(p.odds.median, 0)}</td>
                <td>{formatRange(p.odds.p10, p.odds.p90)}</td>
                <td>{formatPercent(p.odds.p_at_least)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
