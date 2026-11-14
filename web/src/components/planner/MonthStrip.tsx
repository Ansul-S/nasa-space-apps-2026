import { cn } from "@/lib/cn";
import { MONTH_INITIALS, MONTHS_LONG } from "@/lib/format";
import { rampColor } from "@/lib/palette";

interface MonthStripProps {
  /** Ramp position 0–1 for each month; 0 or less draws an empty cell. */
  values: number[];
  /** Text for each month's tooltip. */
  titles: string[];
  month?: number | null;
  /** Show month initials under the cells. */
  labels?: boolean;
  className?: string;
  cellClassName?: string;
  /** Hide from assistive technology when the same facts are given in text nearby. */
  decorative?: boolean;
}

/** Twelve small cells, one per month, coloured on the score ramp. */
export function MonthStrip({
  values,
  titles,
  month = null,
  labels = false,
  className,
  cellClassName,
  decorative = false,
}: MonthStripProps) {
  return (
    <div className={className} aria-hidden={decorative || undefined}>
      <div
        className="grid grid-cols-12 gap-[2px]"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : titles.map((t, i) => `${MONTHS_LONG[i]}: ${t}`).join("; ")}
      >
        {values.map((v, i) => (
          <i
            key={i}
            title={`${MONTHS_LONG[i]}: ${titles[i]}`}
            className={cn(
              "block rounded-[2px] bg-sky-3",
              i === month && "outline outline-1 outline-offset-1 outline-ink",
              cellClassName ?? "h-1.5",
            )}
            style={v > 0 ? { background: rampColor(v) } : undefined}
          />
        ))}
      </div>
      {labels && (
        <div aria-hidden="true" className="mt-1 grid grid-cols-12 gap-[2px] text-center font-mono text-[9.5px] text-ink-3">
          {MONTH_INITIALS.map((m, i) => (
            <span key={i} className={cn(i === month && "text-ink")}>
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
