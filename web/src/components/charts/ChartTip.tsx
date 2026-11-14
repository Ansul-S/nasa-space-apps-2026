import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ChartTipProps {
  /** Anchor point in the chart's pixel space. */
  x: number;
  y: number;
  /** Chart width, so the tip flips to the left near the right edge. */
  width: number;
  visible: boolean;
  children: ReactNode;
}

/** Floating read-out for a chart cursor. Muted parts go in <span>. */
export function ChartTip({ x, y, width, visible, children }: ChartTipProps) {
  const flip = x > width * 0.62;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-10 rounded-lg border border-line-2 bg-sky-0/92 px-2.5 py-2",
        "font-mono text-xs whitespace-nowrap text-ink shadow-float backdrop-blur-sm transition-opacity duration-150",
        "[&_span]:text-ink-3",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transform: `translate(${flip ? `calc(${x - 14}px - 100%)` : `${x + 14}px`}, ${Math.max(0, y - 44)}px)` }}
    >
      {children}
    </div>
  );
}
