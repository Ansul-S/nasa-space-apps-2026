import type { Level } from "@/lib/data";
import { cn } from "@/lib/cn";
import { COLORS, PAPER } from "@/lib/palette";

export const LEVEL_LABELS: Record<Level, string> = {
  match: "Match",
  partial: "Partial",
  breaks_down: "Breaks down",
  impossible: "Impossible on Earth",
  not_calculated: "Not calculated",
};

/**
 * Sun symbol for a match level: a full sun for a match, a half sun for a
 * partial match, an empty rose ring where the analog breaks down, a struck
 * ring where Earth cannot reproduce the condition, and a dashed ring where
 * it was not calculated.
 */
export function LevelGlyph({ level, size = 14, tone = "sky" }: { level: Level; size?: number; tone?: "sky" | "paper" }) {
  const c =
    tone === "paper"
      ? { sun: PAPER.sunFill, rose: PAPER.rose, muted: PAPER.ink3 }
      : { sun: COLORS.sun, rose: COLORS.rose, muted: COLORS.ink3 };
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="flex-none">
      {level === "match" && <circle cx="7" cy="7" r="5.5" fill={c.sun} />}
      {level === "partial" && (
        <>
          <circle cx="7" cy="7" r="5" fill="none" stroke={c.sun} strokeWidth="1.4" />
          <path d="M7 2a5 5 0 0 0 0 10z" fill={c.sun} />
        </>
      )}
      {level === "breaks_down" && <circle cx="7" cy="7" r="5" fill="none" stroke={c.rose} strokeWidth="1.5" />}
      {level === "impossible" && (
        <>
          <circle cx="7" cy="7" r="5" fill="none" stroke={c.muted} strokeWidth="1.4" />
          <path d="M3.5 10.5l7-7" stroke={c.muted} strokeWidth="1.4" />
        </>
      )}
      {level === "not_calculated" && (
        <circle cx="7" cy="7" r="5" fill="none" stroke={c.muted} strokeWidth="1.3" strokeDasharray="2 2.2" />
      )}
    </svg>
  );
}

/** Glyph plus label, e.g. in the fidelity table. */
export function LevelBadge({ level, label, className }: { level: Level; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[12.5px] whitespace-nowrap", className)}>
      <LevelGlyph level={level} />
      {label ?? LEVEL_LABELS[level]}
    </span>
  );
}
