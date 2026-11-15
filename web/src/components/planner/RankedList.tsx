"use client";

import { LayoutGroup, motion } from "motion/react";
import { memo } from "react";

import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { formatDayRange, formatNumber, formatPercent, formatRange, MONTHS_LONG, shortName } from "@/lib/format";
import type { PlannerData, RankedSite, RankMode } from "@/lib/planner";

import { MonthStrip } from "./MonthStrip";

interface RankedListProps {
  rows: RankedSite[];
  data: PlannerData;
  mode: RankMode;
  month: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}

const SPRING = { type: "spring", bounce: 0.12, duration: 0.6 } as const;

/** Sites ranked for the month or by best window. Rows glide to their new place when the ranking changes. */
export const RankedList = memo(function RankedList({ rows, data, mode, month, selectedId, onSelect, onHover }: RankedListProps) {
  const live = rows.filter((r) => r.rank !== null);
  const dead = rows.filter((r) => r.rank === null);
  return (
    <LayoutGroup>
      <ol className="flex flex-col gap-0.5" aria-label={mode === "best" ? "Sites ranked by best window" : `Sites ranked for ${MONTHS_LONG[month]}`}>
        {live.map((r) => (
          <Row key={r.site.id} row={r} {...{ data, mode, month, selectedId, onSelect, onHover }} />
        ))}
      </ol>
      {dead.length > 0 && (
        <motion.div layout="position" transition={SPRING}>
          <div className="mx-2.5 mt-3 border-t border-line pt-4 pb-1.5 eyebrow">
            {mode === "best" ? "No usable window in any month" : `No usable days in ${MONTHS_LONG[month]}`}
          </div>
          <ol className="flex flex-col gap-0.5">
            {dead.map((r) => (
              <Row key={r.site.id} row={r} {...{ data, mode, month, selectedId, onSelect, onHover }} />
            ))}
          </ol>
        </motion.div>
      )}
    </LayoutGroup>
  );
});

function Row({
  row,
  data,
  mode,
  month,
  selectedId,
  onSelect,
  onHover,
}: { row: RankedSite } & Omit<RankedListProps, "rows">) {
  const { site, scores } = row;
  const dim = row.rank === null;
  const selected = site.id === selectedId;
  const bw = scores.best_window;
  const value = row.value > 0 && row.value < 0.05 ? "<0.1" : formatNumber(row.value, 1);
  const sub =
    mode === "best"
      ? bw && row.value > 0
        ? formatDayRange(bw.start, bw.end)
        : "no window"
      : `median ${formatNumber(scores.median[month], 0)} · ${formatRange(scores.p10[month], scores.p90[month])}`;
  return (
    <motion.li layout="position" transition={SPRING}>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${site.name}. ${dim ? "No usable days" : `Rank ${row.rank}`}. ${value} ${mode === "best" ? "expected usable days in the best window" : "usable days per " + data.campaignDays}, ${sub}.`}
        onClick={() => onSelect(site.id)}
        onMouseEnter={() => onHover?.(site.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(site.id)}
        onBlur={() => onHover?.(null)}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[10px] border px-2.5 py-[11px] text-left transition-colors duration-200",
          selected ? "border-line-2 bg-sky-2" : "border-transparent hover:bg-sky-1",
        )}
      >
        <span className="self-start pt-0.5 font-mono text-xs text-ink-3">
          {dim ? "–" : String(row.rank).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate text-sm font-medium", dim && !selected && "text-ink-2")}>
            {shortName(site.name)}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            {site.region}
            {site.role === "validation" && <Tag tone="validation">Validation</Tag>}
            {!site.known_analog && <Tag tone="new">New site</Tag>}
            {site.weather_cell_class === "not_representative" && (
              <Tag tone="warn" title={data.cellNotes.not_representative}>
                Cold-biased cell
              </Tag>
            )}
          </span>
        </span>
        <span className="self-start text-right">
          <b className={cn("block font-display text-[30px] leading-[0.9] font-normal tabular-nums", dim && "text-ink-3")}>
            {value}
          </b>
          <span className="font-mono text-[11px] whitespace-nowrap text-ink-3">{sub}</span>
        </span>
        <MonthStrip
          className={cn("col-span-2 col-start-2 mt-1.5", dim && !selected && "opacity-50")}
          values={scores.score.map((v) => (v > 0 ? v / data.maxScore : 0))}
          titles={scores.score.map((v) => `${formatPercent(v)} of days usable`)}
          month={mode === "month" ? month : null}
          decorative
        />
      </button>
    </motion.li>
  );
}
