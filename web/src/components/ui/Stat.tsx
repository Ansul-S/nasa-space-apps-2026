import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "text-[30px] leading-none",
  md: "text-[56px] leading-[0.85]",
  lg: "text-[84px] leading-[0.9] tracking-[-0.02em]",
  xl: "text-[clamp(64px,8vw,120px)] leading-[0.9] tracking-[-0.02em]",
};

interface StatProps {
  value: ReactNode;
  /** Unit or qualifier set beside the number, e.g. "of 14 days". */
  unit?: ReactNode;
  /** Caption under the number. */
  label?: ReactNode;
  size?: Size;
  /** "sun" for the headline answer, "muted" for a zero. */
  tone?: "default" | "sun" | "muted";
  className?: string;
}

/** A large serif number with its caption. */
export function Stat({ value, unit, label, size = "sm", tone = "default", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "font-display tabular-nums",
          SIZES[size],
          tone === "sun" && "text-sun",
          tone === "muted" && "text-ink-3",
        )}
      >
        {value}
        {unit != null && <small className="ml-1.5 font-sans text-sm tracking-normal text-ink-2">{unit}</small>}
      </span>
      {label != null && <span className="text-[11.5px] text-ink-3">{label}</span>}
    </div>
  );
}
