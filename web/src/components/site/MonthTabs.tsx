"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/cn";
import { MONTHS_LONG, MONTHS } from "@/lib/format";

interface MonthTabsProps {
  month: number;
  onMonth: (month: number) => void;
  className?: string;
}

/** Twelve month buttons with a gold marker that slides to the selected one. */
export function MonthTabs({ month, onMonth, className }: MonthTabsProps) {
  const id = useId();
  return (
    <div role="group" aria-label="Month" className={cn("grid grid-cols-6 gap-[3px] sm:grid-cols-12", className)}>
      {MONTHS.map((m, i) => {
        const on = i === month;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            aria-label={MONTHS_LONG[i]}
            onClick={() => onMonth(i)}
            className={cn(
              "relative isolate cursor-pointer rounded-md py-[7px] font-mono text-[11.5px] transition-colors duration-200",
              on ? "text-ink-on-sun" : "text-ink-3 hover:bg-sky-2 hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${id}-month`}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-md bg-sun shadow-[0_6px_22px_-8px_rgb(246_182_90/0.7)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
              />
            )}
            {m}
          </button>
        );
      })}
    </div>
  );
}
