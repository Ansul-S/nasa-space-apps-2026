import Link from "next/link";
import type { ReactNode } from "react";

import { Arrow } from "@/components/ui/Button";
import { LevelGlyph } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/cn";
import { formatDayRange, formatNumber, formatTemp, MONTHS, MONTHS_LONG, shortName } from "@/lib/format";
import { SNOW_LEVEL, type GapFiller, type GapReason, type GapResult } from "@/lib/gap-fillers";

const SNOW_TEXT = { snow_free: "snow-free", patchy: "patchy snow", snow_covered: "snow-covered" } as const;

function reasonLabel(reasons: GapReason[], month: number): string {
  const label = { most: "Most usable days", closest: "Closest", month: `Top in ${MONTHS_LONG[month]}` };
  return reasons.map((r) => label[r]).join(" · ");
}

const kmText = (km: number) => `${Math.round(km).toLocaleString("en")} km away`;
const whenText = (f: GapFiller) => (f.window ? formatDayRange(f.window.start, f.window.end) : `Campaigns in ${MONTHS[f.month]}`);
const daysText = (days: number) => formatNumber(days, 1);

/** What the window costs: snow on the ground and the median wind chill in its month. */
function Cost({ f, className }: { f: GapFiller; className?: string }) {
  return (
    <span className={cn("flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-2", className)}>
      <span className="mt-px">
        <LevelGlyph level={SNOW_LEVEL[f.snowClass ?? "none"]} size={12} />
      </span>
      <span>
        {MONTHS[f.month]}:{" "}
        {f.snowClass ? `${SNOW_TEXT[f.snowClass]} (${Math.round(f.snowPct ?? 0)}%)` : "snow not measured"}, median
        wind chill {formatTemp(f.windChillC)}
      </span>
    </span>
  );
}

function Notes({ result, month, className }: { result: GapResult; month: number; className?: string }) {
  const notes: ReactNode[] = [];
  if (result.allSnow)
    notes.push(
      result.someUnmeasured
        ? "Every window with measured snow cover is snow-covered, so a bare-ground test may need a second site."
        : "Each of these windows is snow-covered, so a bare-ground test needs a second site.",
    );
  if (result.monthEmpty) notes.push(`No calculated site averages a usable day in ${MONTHS_LONG[month]}.`);
  if (!notes.length) return null;
  return (
    <div className={cn("flex flex-col gap-1 text-[12px] leading-normal text-ink-3", className)}>
      {notes.map((n, i) => (
        <p key={i}>{n}</p>
      ))}
    </div>
  );
}

/* ---------- planner card: a compact list that flies the globe ---------- */

interface GapListProps {
  result: GapResult;
  campaignDays: number;
  month: number;
  /** One line under the heading on why the place needs a gap-filler. */
  lead: ReactNode;
  onFly: (siteId: string) => void;
  className?: string;
}

export function GapList({ result, campaignDays, month, lead, onFly, className }: GapListProps) {
  if (!result.fillers.length) return null;
  return (
    <section aria-labelledby="gap-title" className={cn("border-t border-line pt-3.5", className)}>
      <h3 id="gap-title" className="eyebrow">
        <b className="font-medium text-sun">Gap-filler</b> · get the light elsewhere
      </h3>
      <p className="mt-1.5 text-[12px] leading-normal text-ink-2">{lead}</p>
      <ul className="-mx-2 mt-2 flex flex-col">
        {result.fillers.map((f) => (
          <li key={`${f.site.id}/${f.window?.start ?? f.month}`}>
            <button
              type="button"
              onClick={() => onFly(f.site.id)}
              aria-label={`Fly to ${f.site.name}: ${reasonLabel(f.reasons, month)}, ${daysText(f.days)} usable days of ${campaignDays}, ${whenText(f)}`}
              className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-sky-3/70"
            >
              <span className="min-w-0">
                <span className="block font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                  {reasonLabel(f.reasons, month)}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-medium text-ink transition-colors group-hover:text-sun-pale">
                  {shortName(f.site.name)}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-ink-2">
                  {whenText(f)} · {kmText(f.km)}
                </span>
              </span>
              <span className="self-center text-right">
                <b className="block font-display text-[30px] leading-none font-normal text-sun tabular-nums">
                  {daysText(f.days)}
                </b>
                <span className="font-mono text-[10px] text-ink-3">days of {campaignDays}</span>
              </span>
              <Cost f={f} className="col-span-2 mt-1.5" />
            </button>
          </li>
        ))}
      </ul>
      <Notes result={result} month={month} className="mt-1.5" />
    </section>
  );
}

/* ---------- site page: three cards that link to each site ---------- */

interface GapGridProps {
  result: GapResult;
  campaignDays: number;
  month: number;
  className?: string;
}

export function GapGrid({ result, campaignDays, month, className }: GapGridProps) {
  if (!result.fillers.length) return null;
  return (
    <div className={className}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.fillers.map((f, i) => (
          <li key={`${f.site.id}/${f.window?.start ?? f.month}`} className="flex">
            <Link
              href={`/sites/${f.site.id}/`}
              className={cn(
                "group flex w-full flex-col rounded-panel border px-5 pt-4.5 pb-4 no-underline transition-[border-color,translate] duration-200 ease-soft hover:-translate-y-px",
                i === 0
                  ? "border-sun/45 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(246_182_90/0.12),transparent_55%),linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))] hover:border-sun"
                  : "border-line bg-[linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))] hover:border-line-2",
              )}
            >
              <span className="eyebrow">
                <b className={cn("font-medium", i === 0 ? "text-sun" : "text-ink-2")}>{reasonLabel(f.reasons, month)}</b>
              </span>
              <span className="mt-2.5 font-display text-[26px] leading-[1.05] text-ink">{shortName(f.site.name)}</span>
              <span className="mt-1 font-mono text-[12px] text-ink-2">
                {whenText(f)} · {kmText(f.km)}
              </span>
              <span className="mt-4 flex items-baseline gap-2 border-t border-line pt-3.5">
                <b className="font-display text-[44px] leading-[0.9] font-normal text-sun tabular-nums">
                  {daysText(f.days)}
                </b>
                <span className="text-[12px] leading-snug text-ink-3">
                  usable days of {campaignDays},
                  <br />
                  expected
                </span>
              </span>
              <Cost f={f} className="mt-3.5 text-[12px]" />
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12.5px] text-ink-2 transition-colors group-hover:text-sun">
                Open site analysis <Arrow />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Notes result={result} month={month} className="mt-3.5" />
    </div>
  );
}
