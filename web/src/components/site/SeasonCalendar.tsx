"use client";

import { cn } from "@/lib/cn";
import { MONTH_INITIALS, MONTHS } from "@/lib/format";
import { onRamp, rampColor, rampGradient } from "@/lib/palette";
import type { CalendarCell, CalendarRow } from "@/lib/site-view";

interface SeasonCalendarProps {
  rows: CalendarRow[];
  month: number;
  onMonth: (month: number) => void;
}

const NIGHT = "repeating-linear-gradient(135deg, #070a10 0 4px, #0f1420 4px 8px)";
const NOT_MEASURED = "repeating-linear-gradient(135deg, transparent 0 5px, rgb(236 232 225 / 0.07) 5px 6px)";

function cellStyle(c: CalendarCell) {
  if (c.kind === "night") return { background: NIGHT };
  if (c.kind === "not_measured") return { background: NOT_MEASURED };
  if (c.kind === "zero") return { background: "transparent" };
  return { background: rampColor(c.t), color: onRamp(c.t) };
}

/** Every condition by month, with the selected month outlined down the page. */
export function SeasonCalendar({ rows, month, onMonth }: SeasonCalendarProps) {
  const body = rows.filter((r) => !r.total);
  const totals = rows.filter((r) => r.total);

  const renderRow = (r: CalendarRow) => (
    <tr key={r.id}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-[1] bg-sky-1 pr-3 text-left align-middle text-[13px] leading-tight font-normal",
          r.total ? "font-medium text-ink" : "text-ink-2",
        )}
      >
        {r.label}
        <small className="mt-0.5 block text-[11px] font-normal text-ink-3">{r.sub}</small>
      </th>
      {r.cells.map((c, i) => (
        <td key={i} className="p-0" onClick={() => onMonth(i)}>
          <div
            title={c.title}
            style={cellStyle(c)}
            className={cn(
              "relative grid h-[42px] cursor-pointer place-items-center rounded-[5px] font-mono text-[11px] tabular-nums",
              "outline outline-offset-1 transition-[background-color,color,outline-color] duration-300",
              i === month ? "outline-ink" : "outline-transparent hover:outline-line-2",
              c.kind === "zero" && "text-ink-3 shadow-[inset_0_0_0_1px_var(--color-line)]",
              (c.kind === "night" || c.kind === "not_measured") && "text-ink-3 shadow-[inset_0_0_0_1px_var(--color-line)]",
            )}
          >
            {c.text}
            {c.cold && (
              <span className="absolute top-0.5 right-1 text-[8.5px] leading-none text-rose" aria-label="Extreme cold">
                −40
              </span>
            )}
          </div>
        </td>
      ))}
    </tr>
  );

  return (
    <div>
      <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[660px] table-fixed border-separate border-spacing-[3px]">
          <caption className="sr-only">Conditions by month. Brighter cells are more Moon-like.</caption>
          <colgroup>
            <col className="w-[196px] max-sm:w-[150px]" />
            {MONTHS.map((m) => (
              <col key={m} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <td className="sticky left-0 z-[1] bg-sky-1" />
              {MONTHS.map((m, i) => (
                <th key={m} scope="col" className="p-0 pb-1 font-normal">
                  <button
                    type="button"
                    aria-pressed={i === month}
                    aria-label={`Follow ${m} through the page`}
                    onClick={() => onMonth(i)}
                    className={cn(
                      "min-h-6 w-full cursor-pointer rounded font-mono text-[11px] transition-colors duration-200",
                      i === month ? "text-sun" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    <span className="max-sm:hidden">{m}</span>
                    <span className="sm:hidden">{MONTH_INITIALS[i]}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body.map(renderRow)}</tbody>
          <tfoot>
            <tr aria-hidden="true">
              <td colSpan={13} className="h-2 p-0" />
            </tr>
            {totals.map(renderRow)}
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-2.5">
          Less Moon-like
          <i className="inline-block h-2 w-24 rounded-full" style={{ background: rampGradient() }} />
          More Moon-like
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block size-3.5 rounded-[3px] shadow-[inset_0_0_0_1px_var(--color-line)]" style={{ background: NIGHT }} />
          Polar night
        </span>
        <span className="inline-flex items-center gap-2">
          <i
            className="inline-block size-3.5 rounded-[3px] shadow-[inset_0_0_0_1px_var(--color-line)]"
            style={{ background: NOT_MEASURED }}
          />
          Not measured
        </span>
        <span className="inline-flex items-center gap-2">
          <b className="font-mono text-[10px] font-normal text-rose">−40</b>
          Median wind chill below −40&nbsp;°C
        </span>
      </div>
    </div>
  );
}
