import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "new" | "validation" | "warn";

const TONES: Record<Tone, string> = {
  neutral: "border-line-2 text-ink-2",
  new: "border-sun/40 text-sun",
  validation: "border-ice/35 text-ice",
  warn: "border-rose/40 text-rose",
};

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

/** Small uppercase label for a site's role or a data caveat. */
export function Tag({ tone = "neutral", className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-px font-mono text-[9.5px] leading-[1.6] tracking-[0.1em] uppercase",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
