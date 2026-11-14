import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Tone = "default" | "sun";

const TONES: Record<Tone, string> = {
  default: "border-line bg-[linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))]",
  sun:
    "border-sun/45 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(246_182_90/0.14),transparent_55%)," +
    "linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))]",
};

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside";
  /** "sun" highlights the one panel that answers the question on a screen. */
  tone?: Tone;
}

/** Bordered surface that groups one chart, card or table. */
export function Panel({ as: Tag = "div", tone = "default", className, ...props }: PanelProps) {
  return <Tag className={cn("rounded-panel border", TONES[tone], className)} {...props} />;
}
