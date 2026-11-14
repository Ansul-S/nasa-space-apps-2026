"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "@/lib/cn";
import { formatClock, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import { durationLabel, type SunWindow } from "@/lib/site-view";

import { ChartTip } from "./ChartTip";
import { useSize, useTweenedArray } from "./hooks";

interface SunChartProps {
  /** Apparent sun elevation from local midnight, every `stepMin` minutes. */
  elevation: number[];
  stepMin: number;
  bandMax: number;
  bandMin?: number;
  /** Band windows to label; drawn once the curve has settled. */
  windows?: SunWindow[];
  /** Shown in the plot when the day has no window. */
  emptyReason?: string | null;
  /** Elevation range of the plot, degrees. */
  domain?: [number, number];
  /** Height classes for the chart box. */
  className?: string;
}

const M = { l: 40, r: 22, t: 22, b: 30 };
const FALLBACK = { width: 1000, height: 340 };
const DOMAIN: [number, number] = [-10, 35];
const EASE = [0.22, 0.8, 0.24, 1] as const;

/**
 * Sun elevation through one local solar day, with the target's low-sun band
 * shaded and the part of the curve inside it in gold.
 */
export function SunChart({
  elevation,
  stepMin,
  bandMax,
  bandMin = 0,
  windows = [],
  emptyReason = null,
  domain = DOMAIN,
  className = "h-60 sm:h-[340px]",
}: SunChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [box, { width, height }] = useSize<HTMLDivElement>(FALLBACK);
  const [values, settled] = useTweenedArray(elevation);
  const [cursor, setCursor] = useState<number | null>(null);

  const compact = width < 560;
  const x = useMemo(() => scaleLinear([0, 24], [M.l, width - M.r]), [width]);
  const y = useMemo(() => scaleLinear(domain, [height - M.b, M.t]), [domain, height]);
  const plot = { x: M.l, y: M.t, w: width - M.l - M.r, h: height - M.t - M.b };

  const path = useMemo(() => {
    const [lo, hi] = domain;
    const pts = [...values, values[0]];
    return (
      line<number>()
        .x((_, i) => x((i * stepMin) / 60))
        .y((e) => y(Math.min(hi + 8, Math.max(lo - 8, e))))(pts) ?? ""
    );
  }, [values, stepMin, x, y, domain]);

  const yTicks = [];
  for (let e = Math.ceil(domain[0] / 5) * 5; e <= domain[1]; e += compact ? 10 : 5) yTicks.push(e);
  const xTicks = [];
  for (let h = 0; h <= 24; h += compact ? 6 : 3) xTicks.push(h);

  const peak = Math.max(...elevation);
  const peakAt = elevation.indexOf(peak);
  const pills = layoutPills(windows, x, compact);

  const n = values.length;
  const cursorHour = cursor == null ? null : (cursor * stepMin) / 60;
  const cursorEl = cursor == null ? null : values[cursor];
  const state = (e: number) => (e < bandMin ? "below the horizon" : e <= bandMax ? "in the band" : "above the band");

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const hour = Math.min(24, Math.max(0, x.invert(px)));
    setCursor(Math.min(n - 1, Math.round((hour * 60) / stepMin)));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = Math.max(1, Math.round((e.shiftKey ? 180 : 30) / stepMin));
    const cur = cursor ?? Math.round((12 * 60) / stepMin);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(n - 1, cur + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(0, cur - step);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next != null) {
      e.preventDefault();
      setCursor(next);
    }
  }

  const firstWindow = windows.find((w) => !w.continuation);
  const focusStart = firstWindow ? Math.round((firstWindow.start + firstWindow.end) / 2 / stepMin) : Math.round(720 / stepMin);

  return (
    <div
      ref={box}
      tabIndex={0}
      role="slider"
      aria-label="Time of day on the sun chart"
      aria-valuemin={0}
      aria-valuemax={24}
      aria-valuenow={cursorHour ?? 12}
      aria-valuetext={
        cursorHour == null || cursorEl == null
          ? "Use the arrow keys to read the curve"
          : `${formatClock(cursorHour)} local solar time, Sun at ${formatNumber(cursorEl)}°, ${state(cursorEl)}`
      }
      onFocus={() => setCursor((c) => c ?? focusStart)}
      onBlur={() => setCursor(null)}
      onKeyDown={onKey}
      className={cn("relative w-full touch-pan-y rounded-lg focus-visible:outline-offset-4", className)}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="chart absolute inset-0 h-full w-full select-none"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setCursor(null)}
      >
        <defs>
          <clipPath id={`${uid}-plot`}>
            <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
          </clipPath>
          <clipPath id={`${uid}-band`}>
            <rect x={plot.x} y={y(bandMax)} width={plot.w} height={y(bandMin) - y(bandMax)} />
          </clipPath>
          <linearGradient id={`${uid}-band-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLORS.sun} stopOpacity="0.26" />
            <stop offset="1" stopColor={COLORS.sunHot} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id={`${uid}-dusk`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLORS.sunHot} stopOpacity="0" />
            <stop offset="1" stopColor={COLORS.sunHot} stopOpacity="0.07" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-10%" y="-60%" width="120%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky above the horizon warms toward it; below it is night. */}
        <rect x={plot.x} y={plot.y} width={plot.w} height={y(0) - plot.y} fill={`url(#${uid}-dusk)`} />
        <rect x={plot.x} y={y(0)} width={plot.w} height={plot.y + plot.h - y(0)} fill={COLORS.sky0} fillOpacity="0.6" />

        {yTicks.map((e) => (
          <g key={`y${e}`}>
            <line
              x1={plot.x}
              x2={plot.x + plot.w}
              y1={y(e)}
              y2={y(e)}
              stroke={COLORS.ink}
              strokeOpacity={e === 0 ? 0.28 : 0.06}
            />
            {(e === 0 || Math.abs(e - bandMax) >= (compact ? 4 : 2.5)) && (
              <text x={plot.x - 10} y={y(e) + 4} textAnchor="end">
                {formatNumber(e, 0)}°
              </text>
            )}
          </g>
        ))}
        {xTicks.map((h) => (
          <g key={`x${h}`}>
            <line x1={x(h)} x2={x(h)} y1={plot.y} y2={plot.y + plot.h} stroke={COLORS.ink} strokeOpacity="0.04" />
            <text x={x(h)} y={height - 9} textAnchor="middle">
              {h === 24 ? "24:00" : formatClock(h)}
            </text>
          </g>
        ))}

        {/* The target's band. */}
        <motion.rect
          x={plot.x}
          width={plot.w}
          initial={false}
          animate={{ attrY: y(bandMax), height: y(bandMin) - y(bandMax) }}
          transition={{ duration: 0.45, ease: EASE }}
          fill={`url(#${uid}-band-fill)`}
        />
        <motion.line
          x1={plot.x}
          x2={plot.x + plot.w}
          initial={false}
          animate={{ y1: y(bandMax), y2: y(bandMax) }}
          transition={{ duration: 0.45, ease: EASE }}
          stroke={COLORS.sun}
          strokeOpacity="0.55"
          strokeDasharray="3 4"
        />
        <text x={plot.x - 10} y={y(bandMax) + 4} textAnchor="end" className="fill-sun">
          {formatNumber(bandMax)}°
        </text>
        {!compact && (
          <>
            <text x={plot.x + plot.w - 6} y={y(bandMax) - 7} textAnchor="end" className="fill-sun">
              band top
            </text>
            <text x={plot.x + plot.w - 6} y={y(0) + 15} textAnchor="end">
              horizon
            </text>
          </>
        )}

        {/* Window columns, once the curve has settled. */}
        <AnimatePresence>
          {settled &&
            windows.map((w) => (
              <motion.g
                key={`col-${w.start}-${w.end}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.35 }}
              >
                <rect
                  x={x(w.start / 60)}
                  y={plot.y}
                  width={Math.max(1, x(w.end / 60) - x(w.start / 60))}
                  height={plot.h}
                  fill={COLORS.sun}
                  fillOpacity="0.045"
                />
              </motion.g>
            ))}
        </AnimatePresence>

        {/* The curve, with its in-band part in gold. */}
        <g clipPath={`url(#${uid}-plot)`}>
          <path d={path} fill="none" stroke={COLORS.ink2} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
        <g filter={`url(#${uid}-glow)`}>
          <path
            d={path}
            fill="none"
            stroke={COLORS.sun}
            strokeWidth="3.2"
            strokeLinejoin="round"
            clipPath={`url(#${uid}-band)`}
          />
        </g>

        {peak > domain[1] && (
          <text x={x((peakAt * stepMin) / 60)} y={plot.y + 14} textAnchor="middle" className="fill-ink-2">
            ↑ {formatNumber(peak, 0)}° at midday
          </text>
        )}

        <AnimatePresence>
          {settled &&
            pills.map((p) => (
              <motion.g
                key={`pill-${p.key}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <rect
                  x={p.x - p.w / 2}
                  y={y(bandMax) - 34 - p.row * 27}
                  width={p.w}
                  height={22}
                  rx={11}
                  fill={COLORS.sky0}
                  stroke={COLORS.sun}
                  strokeOpacity="0.6"
                />
                <text x={p.x} y={y(bandMax) - 19 - p.row * 27} textAnchor="middle" className="fill-sun-pale">
                  {p.label}
                </text>
              </motion.g>
            ))}
          {settled && emptyReason && (
            <motion.g
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <text x={plot.x + plot.w / 2} y={y(bandMax) - 16} textAnchor="middle" className="fill-ink-2">
                {emptyReason}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {cursor != null && cursorEl != null && (
          <g pointerEvents="none">
            <line
              x1={x(cursorHour!)}
              x2={x(cursorHour!)}
              y1={plot.y}
              y2={plot.y + plot.h}
              stroke={COLORS.ink}
              strokeOpacity="0.35"
            />
            {cursorEl >= domain[0] && cursorEl <= domain[1] && (
              <>
                <circle cx={x(cursorHour!)} cy={y(cursorEl)} r="11" fill={COLORS.sun} fillOpacity="0.18" />
                <circle
                  cx={x(cursorHour!)}
                  cy={y(cursorEl)}
                  r="5"
                  fill={COLORS.sunPale}
                  stroke={COLORS.sky0}
                  strokeWidth="2"
                />
              </>
            )}
          </g>
        )}
      </svg>

      <ChartTip
        x={cursorHour == null ? 0 : x(cursorHour)}
        y={cursorEl == null ? 0 : y(Math.min(domain[1], Math.max(domain[0], cursorEl)))}
        width={width}
        visible={cursor != null}
      >
        {cursorHour != null && cursorEl != null && (
          <>
            {formatClock(cursorHour)} <span>local</span> · {formatNumber(cursorEl)}° <span>{state(cursorEl)}</span>
          </>
        )}
      </ChartTip>
    </div>
  );
}

interface Pill {
  key: string;
  x: number;
  w: number;
  row: number;
  label: string;
}

/** Duration labels over each window, stacked when two would overlap. */
function layoutPills(windows: SunWindow[], x: (h: number) => number, compact: boolean): Pill[] {
  const pills: Pill[] = [];
  for (const w of windows) {
    if (w.continuation) continue;
    const label = durationLabel(w.minutes);
    const pw = label.length * (compact ? 6.4 : 6.8) + 22;
    const cx = x((w.start + w.end) / 2 / 60);
    const lo = x(0) + pw / 2;
    const hi = x(24) - pw / 2;
    const px = Math.min(hi, Math.max(lo, cx));
    const prev = pills[pills.length - 1];
    const row = prev && px - pw / 2 < prev.x + prev.w / 2 + 6 ? prev.row + 1 : 0;
    pills.push({ key: `${w.start}-${w.end}`, x: px, w: pw, row, label });
  }
  return pills;
}
