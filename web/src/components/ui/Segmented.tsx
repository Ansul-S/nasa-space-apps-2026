"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  size?: "md" | "sm";
  className?: string;
}

/** A row of mutually exclusive toggle buttons with a sliding highlight. */
export function Segmented<T extends string>({ options, value, onChange, label, size = "md", className }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex flex-wrap gap-0.5 rounded-[10px] border border-line bg-sky-0 p-[3px]", className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative isolate cursor-pointer rounded-[7px] whitespace-nowrap transition-colors duration-200",
              on ? "text-ink" : "text-ink-2 hover:text-ink",
              size === "sm" ? "px-2.5 py-[5px] text-xs" : "px-3 py-[7px] text-[13px]",
            )}
          >
            {on && (
              <motion.span
                layoutId={`${id}-pill`}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-[7px] bg-sky-3 shadow-[inset_0_0_0_1px_var(--color-line-2)]"
                transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
