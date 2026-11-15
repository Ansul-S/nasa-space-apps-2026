"use client";

import { Fragment, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { BrandMark } from "@/components/shell/BrandMark";
import { LevelGlyph } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/cn";
import type { Level } from "@/lib/data";
import { snowClassOf, SNOW_LEVEL, type GapFiller, type GapResult } from "@/lib/gap-fillers";
import {
  formatDate,
  formatDayRange,
  formatLatLon,
  formatNumber,
  formatPercent,
  formatRange,
  formatTemp,
  humanize,
  MONTHS,
  MONTHS_LONG,
  shortName,
} from "@/lib/format";
import { onPaperRamp, paperRampColor } from "@/lib/palette";
import {
  FIDELITY_GROUPS,
  levelCounts,
  shortSite,
  shortTarget,
  windowMonths,
  windowWhy,
  type CalendarCell,
  type CalendarRow,
  type FidelityLine,
  type Selection,
  type SiteViewData,
  type WindowWhy,
} from "@/lib/site-view";

interface PrintCardProps {
  view: SiteViewData;
  sel: Selection;
  /** Month (0-based) of the fidelity table and the outlined calendar column, as on screen. */
  month: number;
  rows: CalendarRow[];
  lines: FidelityLine[];
  /** Gap-fillers, shown when the site has no usable window. */
  gap: GapResult | null;
}

const noSubscribe = () => () => {};

/**
 * The one-page printed card for the site page. It mounts in the browser as a
 * direct child of <body>, where the print rules in globals.css put it on
 * paper in place of the page. It is hidden on screen.
 */
export function PrintCard(props: PrintCardProps) {
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!client) return null;
  return createPortal(<Card {...props} url={window.location.origin + window.location.pathname} />, document.body);
}

const LEVEL_TEXT: Record<Level, string> = {
  match: "Match",
  partial: "Partial",
  breaks_down: "Breaks down",
  impossible: "Impossible",
  not_calculated: "Not calculated",
};

const SNOW_TEXT = { snow_free: "snow-free", patchy: "patchy snow", snow_covered: "snow-covered" } as const;

/** Short source names for the fidelity table; the footer lists each in full. */
const SOURCE_SHORT: Record<string, string> = {
  sun: "Sun position",
  modis_snow: "MODIS snow",
  copernicus_dem: "Copernicus DEM",
  lola_dem: "LOLA",
  ceres_cloud: "CERES cloud",
  merra2_slv: "MERRA-2",
  merra2_precip: "MERRA-2",
  merra2_const: "MERRA-2",
};

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * Height the card may take, mm: US Letter (279.4 mm) less the 10 mm print
 * margins, with 2 mm to spare. A4 is taller, and the card is laid out at the
 * narrower A4 width, so this fits both.
 */
const PAGE_MM = 257;
const MM_PER_PX = 25.4 / 96;

/**
 * Keeps the card on one page: it is laid out off screen at the print width,
 * and when a long case runs past the page, --print-fit scales it down to fit.
 */
function useFitToPage() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const mm = el.scrollHeight * MM_PER_PX;
      el.style.setProperty("--print-fit", mm > PAGE_MM ? (PAGE_MM / mm).toFixed(4) : "1");
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Card({ view, sel, month, rows, lines, gap, url }: PrintCardProps & { url: string }) {
  const { site, campaignDays: days, minUsableDays: n } = view;
  const { target, preset, best, useful } = sel;
  const why = windowWhy(view, sel);
  const windowSet = new Set(useful && best ? windowMonths(best.start, days).map((p) => p.month) : []);
  // "San Francisco Volcanic Field, Arizona" → title "San Francisco Volcanic Field", place "Arizona";
  // "Peary Land (Jørgen Brønlund Fjord)" → title "Peary Land", place "Jørgen Brønlund Fjord".
  const [title, ...rest] = shortSite(site).split(", ");
  const paren = site.name.match(/\((.*)\)$/)?.[1];
  const place = [rest.join(", "), paren].filter(Boolean).join(", ");
  const ref = useFitToPage();

  return (
    <div className="print-card" ref={ref}>
      <article className="bg-paper font-sans text-[7.8pt] leading-[1.38] text-paper-ink">
        {/* ---------- masthead ---------- */}
        <header className="flex items-center justify-between gap-[6mm] border-b-[0.3mm] border-paper-ink pb-[1.8mm]">
          <div className="flex items-center gap-[2mm]">
            <BrandMark size={17} tone="paper" />
            <span className="font-mono text-[6.6pt] tracking-[0.16em] uppercase">Wayfinders Frontier</span>
            <span className="text-[6.6pt] text-paper-ink-3">Seasonal analog planner · NASA Space Apps Challenge 2026</span>
          </div>
          <div className="text-right font-mono text-[6pt] leading-[1.4] text-paper-ink-3">
            <div>Data built {formatDate(view.generated)}</div>
            <div>{bare(url)}</div>
          </div>
        </header>

        {/* ---------- site ---------- */}
        <section className="mt-[3.6mm] flex items-end justify-between gap-[8mm]">
          <div className="min-w-0">
            <div className="eyebrow-paper">
              <b className="font-medium text-paper-sun">Site card</b> · Earth analog for {shortTarget(target)}
            </div>
            <h1 className="mt-[1mm] font-display text-[27pt] leading-none">{title}</h1>
            <p className="mt-[1.4mm] font-mono text-[6.8pt] text-paper-ink-2">
              {[
                place,
                site.region,
                formatLatLon(site.lat, site.lon),
                site.role === "validation" ? "Validation site" : "Candidate site",
                site.known_analog ? "Known analog" : "New site",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <dl className="grid flex-none grid-cols-[auto_auto] items-baseline gap-x-[3mm] gap-y-[0.5mm] text-[7.2pt]">
            <dt className="eyebrow-paper">Target</dt>
            <dd>
              {target.name}, Sun 0–{formatNumber(target.band_max_deg)}° up
            </dd>
            <dt className="eyebrow-paper">Limits</dt>
            <dd>{preset.label}</dd>
            <dt className="eyebrow-paper">Campaign</dt>
            <dd>{days} days, record {view.period.years[0]}–{view.period.years[view.period.years.length - 1]}</dd>
          </dl>
        </section>

        {/* ---------- the answer ---------- */}
        <section className="mt-[3.2mm] grid grid-cols-[63mm_minmax(0,1fr)] border-y-[0.3mm] border-paper-ink">
          <div className="border-r border-paper-line py-[2.8mm] pr-[5mm]">
            <div className="eyebrow-paper">
              <b className={cn("font-medium", useful && "text-paper-sun")}>Best window</b> · {shortTarget(target)}
            </div>
            {best ? (
              <>
                <div
                  className={cn(
                    "mt-[1.2mm] font-display text-[23pt] leading-none",
                    useful ? "text-paper-ink" : "text-paper-ink-3",
                  )}
                >
                  {formatDayRange(best.start, best.end)}
                </div>
                <dl className="mt-[2.4mm] grid grid-cols-3 gap-x-[2.5mm]">
                  <Stat value={formatNumber(best.held_out_mean)} label={`usable days of ${days}, expected`} strong={useful} />
                  <Stat value={formatRange(best.p10, best.p90)} label="bad year – good year" />
                  <Stat value={formatPercent(best.p_at_least)} label={`chance of ${n} or more`} />
                </dl>
                {!useful && why && <WhyNot why={why} className="mt-[2.2mm]" />}
              </>
            ) : (
              <>
                <div className="mt-[1.2mm] font-display text-[23pt] leading-none text-paper-ink-3">No usable window</div>
                <p className="mt-[2.2mm] text-[7.2pt] text-paper-ink-2">
                  The Sun never stays in the 0–{formatNumber(target.band_max_deg)}° band for an unbroken 2 hours, in any
                  month. This is why tests here use lamps at night.
                </p>
              </>
            )}
          </div>
          <div className="py-[2.8mm] pl-[5mm]">
            {useful && why ? (
              <Why why={why} view={view} />
            ) : (
              <Gap gap={gap} days={days} month={month} targetName={shortTarget(target)} />
            )}
          </div>
        </section>

        {/* ---------- 01 calendar ---------- */}
        <section className="mt-[3.6mm]">
          <BlockHead
            index="01"
            eyebrow="Seasonal calendar"
            title="Every condition, month by month"
            aside={`${shortTarget(target)} · ${preset.label}`}
          />
          <Calendar rows={rows} month={month} windowSet={windowSet} />
          <CalendarLegend month={month} hasWindow={windowSet.size > 0} />
        </section>

        {/* ---------- 02 fidelity ---------- */}
        <section className="mt-[3.6mm]">
          <BlockHead
            index="02"
            eyebrow={`Fidelity card · ${MONTHS_LONG[month]}`}
            title="Where the analog holds, and where it breaks"
            aside={levelCounts(lines)
              .map(([level, k]) => `${k} ${LEVEL_TEXT[level].toLowerCase()}`)
              .join(" · ")}
          />
          <Fidelity lines={lines} targetName={shortTarget(target)} siteColumn={`This site, ${MONTHS[month]}`} />
        </section>

        {/* ---------- method and sources ---------- */}
        <Footer view={view} sel={sel} />
      </article>
    </div>
  );
}

/* ---------- pieces ---------- */

function Stat({ value, label, strong = false }: { value: string; label: string; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <dd className={cn("font-display text-[17pt] leading-none tabular-nums", strong ? "text-paper-sun" : "text-paper-ink")}>
        {value}
      </dd>
      <dt className="order-last mt-[0.8mm] text-[6.2pt] leading-[1.25] text-paper-ink-3">{label}</dt>
    </div>
  );
}

function BlockHead({ index, eyebrow, title, aside }: { index: string; eyebrow: string; title: string; aside: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[4mm] border-b border-paper-line pb-[1.1mm]">
      <h2 className="flex flex-none items-baseline gap-[2.4mm] whitespace-nowrap">
        <span className="eyebrow-paper">
          <b className="font-medium text-paper-sun">{index}</b> · {eyebrow}
        </span>
        <span className="font-display text-[13pt] leading-none">{title}</span>
      </h2>
      <span className="min-w-0 text-right text-[6.4pt] leading-[1.3] text-paper-ink-3">{aside}</span>
    </div>
  );
}

/** The weakest condition, as words that follow "Weakest:" mid-sentence. "Sun" keeps its capital. */
const weakestText = (why: WindowWhy) => {
  const r = why.reasons.find((x) => x.id === why.weakest)!;
  const label = r.label.startsWith("Sun") ? r.label : r.label[0].toLowerCase() + r.label.slice(1);
  return { label, share: `${formatPercent(r.share)} ${r.per}` };
};

/** The conditions behind a useful window, each as a share with a bar. */
function Why({ why, view }: { why: WindowWhy; view: SiteViewData }) {
  const weak = weakestText(why);
  const snowClass = snowClassOf(why.snowPct, view.gap.snowLimits);
  return (
    <>
      <div className="eyebrow-paper">
        <b className="font-medium text-paper-sun">Why this window</b> · {why.months}, monthly means weighted by its days
      </div>
      <ul className="mt-[1.6mm] flex flex-col gap-[1mm]">
        {why.reasons.map((r) => {
          const weakest = r.id === why.weakest;
          return (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_24mm_21mm] items-center gap-x-[2.5mm]">
              <span>
                {r.label}
                {r.detail && <span className="text-paper-ink-3"> · {r.detail}</span>}
              </span>
              <span className="relative h-[1.5mm] overflow-hidden rounded-full bg-paper-line">
                <span
                  className={cn("absolute inset-y-0 left-0 rounded-full", weakest ? "bg-paper-rose" : "bg-paper-sun-fill")}
                  style={{ width: `${Math.round(r.share * 100)}%` }}
                />
              </span>
              <span className="text-right font-mono text-[7pt] whitespace-nowrap tabular-nums">
                <b className={cn("font-medium", weakest && "text-paper-rose")}>{formatPercent(r.share)}</b>{" "}
                <span className="text-paper-ink-3">{r.per}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-[2mm] text-[6.8pt] leading-[1.4] text-paper-ink-2">
        <b className="font-medium text-paper-ink">Weakest: {weak.label}</b>, in{" "}
        {weak.share}. A usable day needs all four in the same 2-hour stretch, so it is rarer than any one share. Ground:{" "}
        {snowClass ? `${SNOW_TEXT[snowClass]}, ${Math.round(why.snowPct ?? 0)}% snow cover` : "snow cover not measured here"}
        ; mean wind {formatNumber(why.windMeanMs)} m/s.
      </p>
    </>
  );
}

/** One line on why a window gives no usable days. */
function WhyNot({ why, className }: { why: WindowWhy; className?: string }) {
  const weak = weakestText(why);
  return (
    <p className={cn("text-[6.8pt] leading-[1.4] text-paper-ink-2", className)}>
      No usable days on average. Weakest over {why.months}: {weak.label}, in{" "}
      {weak.share}.
    </p>
  );
}

const gapReason = (f: GapFiller, month: number) =>
  f.reasons
    .map((r) => ({ most: "Most usable days", closest: "Closest", month: `Top in ${MONTHS_LONG[month]}` })[r])
    .join(" · ");

/** Where to get the light this site lacks. */
function Gap({ gap, days, month, targetName }: { gap: GapResult | null; days: number; month: number; targetName: string }) {
  return (
    <>
      <div className="eyebrow-paper">
        <b className="font-medium text-paper-sun">Gap-filler</b> · where to find the light this site lacks
      </div>
      {gap && gap.fillers.length ? (
        <ul className="mt-[1.2mm] flex flex-col">
          {gap.fillers.map((f) => (
            <li
              key={`${f.site.id}/${f.window?.start ?? f.month}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[3mm] border-b border-paper-line py-[1mm] last:border-0"
            >
              <span className="min-w-0">
                <span className="block">
                  <span className="font-medium">{shortName(f.site.name)}</span>
                  <span className="font-mono text-[5.8pt] tracking-[0.1em] text-paper-ink-3 uppercase">
                    {" "}
                    · {gapReason(f, month)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-[1.2mm] text-[6.4pt] text-paper-ink-2">
                  <span className="font-mono">
                    {f.window ? formatDayRange(f.window.start, f.window.end) : `Campaigns in ${MONTHS[f.month]}`} ·{" "}
                    {Math.round(f.km).toLocaleString("en")} km ·
                  </span>
                  <LevelGlyph level={SNOW_LEVEL[f.snowClass ?? "none"]} size={8} tone="paper" />
                  <span>
                    {f.snowClass ? `${SNOW_TEXT[f.snowClass]} (${Math.round(f.snowPct ?? 0)}%)` : "snow not measured"},
                    wind chill {formatTemp(f.windChillC)}
                  </span>
                </span>
              </span>
              <span className="self-center text-right">
                <b className="block font-display text-[14pt] leading-none font-normal text-paper-sun tabular-nums">
                  {formatNumber(f.days, 1)}
                </b>
                <span className="font-mono text-[5.6pt] text-paper-ink-3">days of {days}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-[1.8mm] text-[7.2pt] text-paper-ink-2">
          No calculated site has a usable {days}-day window for {targetName} under these limits.
        </p>
      )}
    </>
  );
}

/* ---------- calendar ---------- */

const NIGHT = "repeating-linear-gradient(135deg, #e4dfd5 0 0.9mm, #f3f0e9 0.9mm 1.8mm)";
const NOT_MEASURED = "repeating-linear-gradient(135deg, #ffffff 0 1.1mm, #ece8e0 1.1mm 1.4mm)";

function cellStyle(c: CalendarCell) {
  if (c.kind === "night") return { background: NIGHT };
  if (c.kind === "not_measured") return { background: NOT_MEASURED };
  if (c.kind === "zero") return { background: "#ffffff" };
  return { background: paperRampColor(c.t), color: onPaperRamp(c.t) };
}

const paperGradient = `linear-gradient(90deg, ${[0, 0.2, 0.4, 0.6, 0.8, 1].map(paperRampColor).join(", ")})`;

function Calendar({ rows, month, windowSet }: { rows: CalendarRow[]; month: number; windowSet: Set<number> }) {
  const row = (r: CalendarRow) => (
    <tr key={r.id}>
      <th scope="row" className="pr-[2mm] text-left align-middle text-[7.2pt] leading-[1.15] font-normal">
        <span className={r.total ? "font-medium" : undefined}>{r.label}</span>
        <small className="block text-[5.8pt] text-paper-ink-3">{r.sub}</small>
      </th>
      {r.cells.map((c, i) => (
        <td key={i} className="p-0">
          <div
            style={cellStyle(c)}
            className={cn(
              "relative grid h-[4.9mm] place-items-center rounded-[0.7mm] font-mono text-[6.6pt] tabular-nums",
              c.kind !== "value" && "text-paper-ink-3 shadow-[inset_0_0_0_0.25mm_var(--color-paper-line)]",
              i === month && "outline-[0.35mm] outline-offset-[0.3mm] outline-paper-ink outline-solid",
            )}
          >
            {c.text}
            {c.cold && (
              <span className="absolute top-[0.3mm] right-[0.6mm] text-[4.4pt] leading-none text-paper-rose">−40</span>
            )}
          </div>
        </td>
      ))}
    </tr>
  );
  return (
    <table className="mt-[1.4mm] w-full table-fixed border-separate border-spacing-[0.6mm]">
      <colgroup>
        <col className="w-[36mm]" />
        {MONTHS.map((m) => (
          <col key={m} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <td />
          {MONTHS.map((m, i) => (
            <th
              key={m}
              scope="col"
              className={cn(
                "p-0 font-mono text-[6.6pt] font-normal",
                i === month ? "font-medium text-paper-ink" : "text-paper-ink-3",
              )}
            >
              <span
                className={cn(
                  "block border-b-[0.7mm] pb-[0.4mm]",
                  windowSet.has(i) ? "border-paper-sun-fill" : "border-transparent",
                )}
              >
                {m}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.filter((r) => !r.total).map(row)}</tbody>
      <tfoot>
        <tr>
          <td colSpan={13} className="h-[0.6mm] p-0" />
        </tr>
        {rows.filter((r) => r.total).map(row)}
      </tfoot>
    </table>
  );
}

function CalendarLegend({ month, hasWindow }: { month: number; hasWindow: boolean }) {
  const items: ReactNode[] = [
    <>
      Less Moon-like
      <i className="inline-block h-[1.6mm] w-[16mm] rounded-full" style={{ background: paperGradient }} />
      More Moon-like
    </>,
    <>
      <i className="inline-block size-[2.4mm] rounded-[0.5mm] shadow-[inset_0_0_0_0.25mm_var(--color-paper-line)]" style={{ background: NIGHT }} />
      Polar night
    </>,
    <>
      <i
        className="inline-block size-[2.4mm] rounded-[0.5mm] shadow-[inset_0_0_0_0.25mm_var(--color-paper-line)]"
        style={{ background: NOT_MEASURED }}
      />
      Not measured
    </>,
    <>
      <b className="font-mono text-[5pt] font-normal text-paper-rose">−40</b>
      Wind chill median below −40&nbsp;°C
    </>,
    <>
      <i className="inline-block size-[2.4mm] rounded-[0.5mm] outline-[0.35mm] outline-paper-ink outline-solid" />
      {MONTHS[month]}: month of the fidelity card
    </>,
  ];
  if (hasWindow)
    items.push(
      <>
        <i className="inline-block h-[0.7mm] w-[4mm] bg-paper-sun-fill" />
        Best window
      </>,
    );
  return (
    <div className="mt-[1mm] flex flex-wrap gap-x-[3.6mm] gap-y-[0.8mm] text-[6pt] text-paper-ink-3">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-[1.4mm]">
          {item}
        </span>
      ))}
    </div>
  );
}

/* ---------- fidelity ---------- */

const IMPOSSIBLE = "Impossible on Earth";
const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

function Fidelity({ lines, targetName, siteColumn }: { lines: FidelityLine[]; targetName: string; siteColumn: string }) {
  const head = "eyebrow-paper py-[1.1mm] pr-[2mm] text-left font-normal";
  const impossible = lines.filter((l) => l.group === IMPOSSIBLE);
  return (
    <>
      <table className="w-full table-fixed border-collapse text-[7.2pt] leading-[1.3]">
        <colgroup>
          <col className="w-[46mm]" />
          <col className="w-[38mm]" />
          <col className="w-[56mm]" />
          <col className="w-[24mm]" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b-[0.3mm] border-paper-ink">
            <th scope="col" className={head}>
              Condition
            </th>
            <th scope="col" className={head}>
              {targetName}
            </th>
            <th scope="col" className={head}>
              {siteColumn}
            </th>
            <th scope="col" className={head}>
              Match
            </th>
            <th scope="col" className={cn(head, "pr-0")}>
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {FIDELITY_GROUPS.filter((g) => g !== IMPOSSIBLE).map((group) => {
            const rows = lines.filter((l) => l.group === group);
            if (!rows.length) return null;
            return (
              <Fragment key={group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={5}
                    className="eyebrow-paper pt-[1.4mm] pb-[0.3mm] text-left font-normal text-paper-sun"
                  >
                    {group}
                  </th>
                </tr>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-paper-line align-top">
                    <th scope="row" className="py-[0.75mm] pr-[2mm] text-left font-medium">
                      {l.label}
                    </th>
                    <td className="py-[0.75mm] pr-[2mm] text-paper-ink-2">{l.moon}</td>
                    <td className="py-[0.75mm] pr-[2mm]">{l.site}</td>
                    <td className="py-[0.75mm] pr-[2mm]">
                      <span className="inline-flex items-center gap-[1.2mm] whitespace-nowrap">
                        <LevelGlyph level={l.level} size={9} tone="paper" />
                        {LEVEL_TEXT[l.level]}
                      </span>
                    </td>
                    <td className="py-[0.75mm] text-[6.4pt] whitespace-nowrap text-paper-ink-3">
                      {SOURCE_SHORT[l.sourceId] ?? (l.source || "—")}
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {impossible.length > 0 && (
        <p className="mt-[1.4mm] flex items-start gap-[1.4mm] text-[6.8pt] leading-[1.4] text-paper-ink-2">
          <span className="mt-[0.5mm]">
            <LevelGlyph level="impossible" size={9} tone="paper" />
          </span>
          <span>
            <b className="eyebrow-paper font-normal text-paper-sun">{IMPOSSIBLE}</b>{" "}
            {impossible.map((l, i) => (
              <Fragment key={l.id}>
                {i > 0 && " · "}
                <b className="font-medium text-paper-ink">{l.label}:</b> {lowerFirst(l.moon)} on the Moon,{" "}
                {lowerFirst(l.site)} here
              </Fragment>
            ))}
          </span>
        </p>
      )}
    </>
  );
}

/* ---------- footer ---------- */

function Footer({ view, sel }: { view: SiteViewData; sel: Selection }) {
  const { grid, campaignDays: days } = view;
  const cell = grid.cell;
  const first = view.period.years[0];
  const last = view.period.years[view.period.years.length - 1];
  const notes: ReactNode[] = [
    <>
      A usable day: the Sun stays in the band for an unbroken 2 hours while the cloud, wind, rain and wind-chill limits
      hold. Odds cover every {days}-day campaign starting each day from {first} to {last}; the best window&apos;s expected
      days score each year on a window chosen without it. A planning aid from past data, not a forecast.
    </>,
    <>
      Weather grid {grid.merra2Deg.join("° × ")}°, cloud {grid.ceresDeg}°, snow {grid.modisKm} km window
      {view.terrain ? `, terrain ${view.terrain.grid_m} m grid in a ${view.terrain.box_km} km box` : ""}. Weather cell{" "}
      {humanize(cell.class)}: {formatPercent(cell.land)} bare land, {formatPercent(cell.land_ice)} ice,{" "}
      {formatPercent(cell.ocean)} ocean.{cell.class !== "representative" ? ` ${cell.note}` : ""}
    </>,
  ];
  if (view.snowNote) notes.push(view.snowNote);
  if (sel.preset.warning) notes.push(<b className="font-medium text-paper-rose">{sel.preset.warning}</b>);

  return (
    <footer className="mt-[3.6mm] border-t-[0.3mm] border-paper-ink pt-[2mm] text-[6pt] leading-[1.38] text-paper-ink-2">
      <div className="eyebrow-paper">Method and notes</div>
      <div className="mt-[0.8mm] flex flex-col gap-[0.6mm]">
        {notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))}
      </div>
      <div className="eyebrow-paper mt-[2mm]">Sources</div>
      <p className="mt-[0.8mm]">
        {view.sources.map((src, i) => (
          <Fragment key={src.id}>
            {i > 0 && <span className="text-paper-line-2"> · </span>}
            <span className="text-paper-ink">{src.name}</span>{" "}
            <span className="font-mono text-[5.3pt] break-all text-paper-ink-3">{bare(src.url)}</span>
          </Fragment>
        ))}
      </p>
    </footer>
  );
}
