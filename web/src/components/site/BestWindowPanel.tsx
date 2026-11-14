"use client";

import { AnimatePresence, motion } from "motion/react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { cn } from "@/lib/cn";
import { formatDayRange, formatNumber, formatPercent, formatRange } from "@/lib/format";
import { shortTarget, type Selection } from "@/lib/site-view";

interface BestWindowPanelProps {
  sel: Selection;
  campaignDays: number;
  minUsableDays: number;
}

/** The page's answer: the best 14-day window for the chosen target and limits. */
export function BestWindowPanel({ sel, campaignDays, minUsableDays }: BestWindowPanelProps) {
  const { best, useful, target, preset } = sel;
  const key = `${target.id}/${preset.id}`;

  return (
    <Panel
      tone={useful ? "sun" : "default"}
      className="relative overflow-hidden px-6 py-5.5 transition-[border-color] duration-500"
      aria-live="polite"
    >
      <Eyebrow accent={useful ? "Best window" : undefined}>
        {useful ? shortTarget(target) : `Best window · ${shortTarget(target)}`}
      </Eyebrow>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }}
        >
          {best ? (
            <>
              <div
                className={cn(
                  "mt-2.5 font-display text-[clamp(36px,3.6vw,52px)] leading-none",
                  useful ? "text-sun-pale" : "text-ink-2",
                )}
              >
                {formatDayRange(best.start, best.end)}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5.5 gap-y-3 border-t border-line pt-3.5">
                <Stat
                  tone={useful ? "sun" : "muted"}
                  value={formatNumber(best.held_out_mean)}
                  label={`usable days of ${campaignDays}, expected`}
                />
                <Stat value={formatRange(best.p10, best.p90)} label="bad year – good year" />
                <Stat value={formatPercent(best.p_at_least)} label={`chance of ${minUsableDays} or more`} />
              </div>
            </>
          ) : (
            <>
              <div className="mt-2.5 font-display text-[clamp(36px,3.6vw,52px)] leading-none text-ink-3">
                No usable window
              </div>
              <p className="mt-4 border-t border-line pt-3.5 text-[13px] text-ink-2">
                The Sun never stays in the 0–{formatNumber(target.band_max_deg)}° band for 2 hours. This is why tests
                here use lamps at night.
              </p>
            </>
          )}
          <p className="mt-3 text-[11.5px] text-ink-3">
            {campaignDays}-day campaign · {preset.label}
          </p>
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
