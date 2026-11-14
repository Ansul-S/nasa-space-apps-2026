"use client";

import { memo } from "react";

import { cn } from "@/lib/cn";
import { formatClock, formatPercent, MONTH_INITIALS, MONTHS, MONTHS_LONG } from "@/lib/format";
import { rampColor } from "@/lib/palette";
import { SAMPLE_DAY, SAMPLE_YEAR } from "@/lib/sun";

interface ClockBarProps {
  month: number;
  onMonth: (month: number) => void;
  hour: number;
  onHour: (hour: number) => void;
  playing: boolean;
  onPlay: (playing: boolean) => void;
  /** Best usable-day share among all sites, per month, and the ramp top. */
  peaks: number[];
  maxScore: number;
  /** Local solar time at the selected place, e.g. "05:12 at Ellesmere". */
  localNote?: string | null;
}

/** One clock for the whole planner: the month (sample day the 15th) and the time of day in UTC. */
export const ClockBar = memo(function ClockBar({
  month,
  onMonth,
  hour,
  onHour,
  playing,
  onPlay,
  peaks,
  maxScore,
  localNote,
}: ClockBarProps) {
  return (
    <div className="glass flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[14px] px-2.5 py-2 shadow-float sm:px-3.5 sm:py-2.5">
      <div role="group" aria-label="Month" className="grid min-w-0 flex-[1_1_340px] grid-cols-12 gap-[3px]">
        {MONTHS.map((m, i) => {
          const on = i === month;
          const t = peaks[i] / (maxScore || 1);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              aria-label={`${MONTHS_LONG[i]}: best site ${formatPercent(peaks[i])} of days usable`}
              onClick={() => onMonth(i)}
              className={cn(
                "relative flex h-9 cursor-pointer flex-col items-center justify-end rounded-[7px] pb-1 font-mono text-[10px] transition-colors duration-200 sm:h-[42px] sm:pb-[5px] sm:text-[11px]",
                on ? "bg-sky-3 text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]" : "text-ink-3 hover:bg-sky-2 hover:text-ink",
              )}
            >
              <i
                aria-hidden="true"
                className="absolute inset-x-1/4 bottom-[19px] rounded-t-[2px] transition-[height,background-color] duration-500 ease-soft sm:bottom-[22px]"
                style={{ height: peaks[i] > 0 ? Math.max(2, t * 14) : 0, background: rampColor(t) }}
              />
              {MONTH_INITIALS[i]}
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-[1_1_260px] items-center gap-2.5">
        <button
          type="button"
          aria-label={playing ? "Pause the day" : "Play the day"}
          aria-pressed={playing}
          onClick={() => onPlay(!playing)}
          className="grid size-[34px] flex-none cursor-pointer place-items-center rounded-full border border-line-2 bg-sky-2 transition-colors hover:border-sun"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
            <path d={playing ? "M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" : "M3 1.5v9l7.5-4.5z"} />
          </svg>
        </button>
        <input
          type="range"
          min={0}
          max={24}
          step={1 / 12}
          value={hour}
          onChange={(e) => onHour(Number(e.target.value))}
          aria-label="Time of day, UTC"
          aria-valuetext={`${formatClock(hour)} UTC`}
          className="range-sun min-w-20 flex-1"
        />
        <div className="min-w-0 font-mono text-xs leading-tight whitespace-nowrap" aria-live="off">
          <div>
            {SAMPLE_DAY} {MONTHS[month]} {SAMPLE_YEAR} · {formatClock(hour)} <span className="text-ink-3">UTC</span>
          </div>
          {localNote && <div className="truncate text-ink-3">{localNote}</div>}
        </div>
      </div>
    </div>
  );
});
