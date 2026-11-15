"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { OddsChart } from "@/components/charts/OddsChart";
import { SunChart } from "@/components/charts/SunChart";
import { YearDots } from "@/components/charts/YearDots";
import { Callout } from "@/components/ui/Callout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { GapGrid } from "@/components/planner/GapFillers";
import { Tag } from "@/components/ui/Tag";
import { presetId, type ChillChoice, type CloudChoice } from "@/lib/data";
import { lightingGapFillers } from "@/lib/gap-fillers";
import {
  formatDate,
  formatDuration,
  formatLatLon,
  formatNumber,
  formatPercent,
  humanize,
  MONTHS,
  MONTHS_LONG,
} from "@/lib/format";
import { COLORS, rampColor } from "@/lib/palette";
import {
  calendarRows,
  emptyDayReason,
  fidelityLines,
  select,
  shortSite,
  shortTarget,
  sunWindows,
  windowClock,
  type SiteViewData,
} from "@/lib/site-view";

import { BestWindowPanel } from "./BestWindowPanel";
import { FidelityCard } from "./FidelityCard";
import { MonthTabs } from "./MonthTabs";
import { SeasonCalendar } from "./SeasonCalendar";
import { SiteControls } from "./SiteControls";

interface SiteViewProps {
  view: SiteViewData;
  initial: { target: string; cloud: CloudChoice; chill: ChillChoice; month: number };
}

/** The site page: one target, one set of limits and one month, followed through every chart. */
export function SiteView({ view, initial }: SiteViewProps) {
  const [targetId, setTarget] = useState(initial.target);
  const [cloud, setCloud] = useState<CloudChoice>(initial.cloud);
  const [chill, setChill] = useState<ChillChoice>(initial.chill);
  const [month, setMonth] = useState(initial.month);

  const sel = useMemo(() => select(view, targetId, presetId(cloud, chill)), [view, targetId, cloud, chill]);
  const rows = useMemo(() => calendarRows(view, sel, MONTHS), [view, sel]);
  const lines = useMemo(() => fidelityLines(view, sel, month), [view, sel, month]);
  const gap = useMemo(
    () =>
      sel.useful
        ? null
        : lightingGapFillers(view.gap, {
            targetId: sel.target.id,
            presetId: sel.preset.id,
            lat: view.site.lat,
            lon: view.site.lon,
            month,
            excludeId: view.site.id,
          }),
    [view, sel, month],
  );

  const { site, grid } = view;
  const { target, preset } = sel;
  const sample = view.sun.months[month];
  const windows = useMemo(() => sunWindows(sample.windows[target.id] ?? []), [sample, target.id]);
  const tm = sel.targetMonths[month];
  const odds = sel.presetMonths[month].odds;
  const zeroYears = odds.years.filter((v) => v === 0).length;
  const firstYear = view.period.years[0];
  const lastYear = view.period.years[view.period.years.length - 1];
  const cell = grid.cell;

  return (
    <>
      <div className="wrap">
        {/* ---------- header ---------- */}
        <header className="grid items-end gap-x-10 gap-y-8 pt-11 pb-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
              <Link href="/planner/" className="text-ink-2 no-underline transition-colors hover:text-sun">
                Planner
              </Link>
              <span aria-hidden="true">/</span>
              <span>{site.region}</span>
            </nav>
            <h1 className="mt-4 font-display text-[clamp(44px,5.6vw,80px)] leading-[0.98]">{site.name}</h1>
            <div className="mt-3.5 flex flex-wrap items-center gap-3.5 font-mono text-[13px] text-ink-2">
              <span>{formatLatLon(site.lat, site.lon)}</span>
              {site.role === "validation" ? <Tag tone="validation">Validation site</Tag> : <Tag>Candidate</Tag>}
              {site.known_analog ? <Tag>Known analog</Tag> : <Tag tone="new">New site</Tag>}
            </div>
          </div>
          <BestWindowPanel sel={sel} campaignDays={view.campaignDays} minUsableDays={view.minUsableDays} />
        </header>

        {(cell.class !== "representative" || view.snowNote) && (
          <div className="flex flex-col gap-3 pb-6">
            {cell.class !== "representative" && (
              <Callout
                tone={cell.class === "not_representative" ? "warn" : "info"}
                title={`Weather grid cell ${humanize(cell.class)}: ${formatPercent(cell.land)} bare land, ${formatPercent(cell.land_ice)} ice, ${formatPercent(cell.ocean)} ocean.`}
              >
                {cell.note}
              </Callout>
            )}
            {view.snowNote && <Callout title="Snow cover.">{view.snowNote}</Callout>}
          </div>
        )}

      </div>

      <SiteControls
        targets={view.targets}
        target={target.id}
        onTarget={setTarget}
        cloud={cloud}
        onCloud={setCloud}
        chill={chill}
        onChill={setChill}
        month={month}
        onMonth={setMonth}
      />

      <div className="wrap">
        <AnimatePresence initial={false}>
          {preset.warning && (
            <motion.div
              key="chill-warning"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 0.8, 0.24, 1] }}
              className="overflow-hidden"
            >
              <Callout tone="warn" title={`${formatNumber(preset.wind_chill_min_c, 0)}\u00a0°C limit.`} className="mt-4">
                {preset.warning}
              </Callout>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-14 pt-9 pb-24 sm:gap-16">
          {/* ---------- gap-filler: only where the site lacks the light ---------- */}
          <AnimatePresence initial={false}>
            {gap && gap.fillers.length > 0 && (
              <motion.div
                key="gap"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 0.8, 0.24, 1] }}
                // The negative bottom margin cancels the column gap, so the block collapses to nothing.
                // The side margin leaves room for the cards' focus ring inside the clipped box.
                className="-mx-2 -mb-14 overflow-hidden sm:-mb-16"
              >
                <div className="px-2 pb-14 sm:pb-16">
                  <Block
                    index="gap"
                    accent="Gap-filler"
                    eyebrow="Lighting"
                    title="Where to find the light this site lacks"
                    aside={
                      <>
                        Calculated sites with a usable {view.campaignDays}-day window for {shortTarget(target)} under
                        these limits, and what each costs in snow and cold. Open one to see its full analysis.
                      </>
                    }
                  >
                    <GapGrid result={gap} campaignDays={view.campaignDays} month={month} />
                  </Block>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------- 01 daily sun path ---------- */}
          <Block
            index="01"
            eyebrow={`Daily sun path · ${formatDate(sample.date)}`}
            title="When the Sun sits in the band"
            aside={
              <>
                Sun elevation over a flat horizon, local solar time. Gold marks the {shortTarget(target)} band, 0–
                {formatNumber(target.band_max_deg)}°. Hover the chart or use the arrow keys to read it.
              </>
            }
          >
            <Panel className="px-3 pt-4 pb-3 sm:px-5.5 sm:pt-5.5">
              <MonthTabs month={month} onMonth={setMonth} />
              <SunChart
                className="mt-3 h-60 sm:h-[340px]"
                elevation={sample.elevation}
                stepMin={view.sun.stepMin}
                bandMax={target.band_max_deg}
                bandMin={target.band_min_deg}
                windows={windows}
                emptyReason={windows.length ? null : emptyDayReason(sample.elevation, target.band_max_deg)}
              />
              <p className="mt-2 px-1 font-mono text-[11.5px] text-ink-3">
                {windows.length ? (
                  <>
                    In the band on {formatDate(sample.date)}:{" "}
                    <span className="text-sun-pale">
                      {windows
                        .filter((w) => !w.continuation)
                        .map((w) => windowClock(w, windows))
                        .join(" · ")}
                    </span>{" "}
                    local solar time
                  </>
                ) : (
                  <>No time in the band on {formatDate(sample.date)}.</>
                )}
              </p>
              <dl className="mt-3 grid grid-cols-2 border-t border-line sm:grid-cols-4">
                <Fact value={`${formatNumber(tm.band_hours)} h`} label="a day in the band, month mean" />
                <Fact
                  value={tm.longest_window_hours ? formatDuration(tm.longest_window_hours) : "—"}
                  label="longest unbroken stretch"
                />
                <Fact value={formatPercent(tm.window_days_share)} label="of days with a 2-hour stretch" />
                <Fact
                  value={tm.sun_rate_deg_per_h == null ? "—" : `${formatNumber(tm.sun_rate_deg_per_h)}°/h`}
                  label={`Sun speed across the sky (Moon ${formatNumber(target.sun_rate_deg_per_h)}°/h)`}
                />
              </dl>
            </Panel>
          </Block>

          {/* ---------- 02 seasonal calendar ---------- */}
          <Block
            index="02"
            eyebrow="Seasonal calendar"
            title="Every condition, month by month"
            aside="Brighter is more Moon-like for this test. Pick a month to follow it down the page."
          >
            <Panel className="px-5 py-5 sm:px-5.5">
              <SeasonCalendar rows={rows} month={month} onMonth={setMonth} />
            </Panel>
          </Block>

          {/* ---------- 03 campaign odds ---------- */}
          <Block
            index="03"
            eyebrow={`Campaign odds · ${view.campaignDays}-day campaign`}
            title="How many usable test days to expect"
            aside={
              <>
                A day is usable when the Sun stays in the band for an unbroken 2 hours and the cloud, wind, rain and
                wind-chill limits all hold during that stretch. Every day from {firstYear} to {lastYear} starts one
                campaign.
              </>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
              <Panel className="px-3 pt-4 pb-3 sm:px-5.5 sm:pt-5">
                <OddsChart
                  months={sel.presetMonths}
                  month={month}
                  onMonth={setMonth}
                  campaignDays={view.campaignDays}
                  minUsableDays={view.minUsableDays}
                  maxScore={view.maxScore}
                />
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 px-1 text-[11.5px] text-ink-3">
                  <span className="inline-flex items-center gap-2">
                    <i className="inline-block h-2.5 w-3.5 rounded-[2px]" style={{ background: rampColor(0.7) }} />
                    Median usable days
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
                      <path d="M5 1v12M2 1h6" stroke={COLORS.ink2} strokeWidth="1.5" fill="none" />
                    </svg>
                    Bad year to good year (10th–90th percentile)
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <b className="font-mono text-[11px] font-normal text-sun">%</b>
                    Chance of {view.minUsableDays} or more, gold from 50%
                  </span>
                </div>
              </Panel>
              <Panel className="flex flex-col px-5 pt-5 pb-4">
                <Eyebrow>
                  Each season · starting in <b className="font-medium text-ink">{MONTHS_LONG[month]}</b>
                </Eyebrow>
                <YearDots
                  className="mt-3 min-h-[180px] flex-1"
                  values={odds.years}
                  years={view.period.years}
                  campaignDays={view.campaignDays}
                />
                <p className="mt-2 text-[12px] leading-normal text-ink-2">
                  Median usable days per year, {firstYear}–{lastYear}.{" "}
                  {zeroYears === odds.years.length
                    ? "No year gave any."
                    : zeroYears
                      ? `${zeroYears} of ${odds.years.length} years gave none.`
                      : "Every year gave at least one."}{" "}
                  <span className="text-ink-3">Ten seasons make the bad-year and good-year values uncertain.</span>
                </p>
              </Panel>
            </div>
          </Block>

          {/* ---------- 04 fidelity ---------- */}
          <Block
            index="04"
            eyebrow="Fidelity card"
            title="Where the analog holds, and where it breaks"
            aside="Each condition at the target and at this site in the chosen month. Hover a match level for its rule."
          >
            <FidelityCard
              title={`${shortSite(site)} as an analog for ${shortTarget(target)}`}
              subtitle={`${MONTHS_LONG[month]} · ${preset.label}`}
              targetName={shortTarget(target)}
              siteColumn={`${shortSite(site)}, ${MONTHS[month]}`}
              siteColumnShort={`This site, ${MONTHS[month]}`}
              lines={lines}
              levels={view.levels}
              footer={[
                `Weather grid ${grid.merra2Deg.join("° × ")}°, cloud ${grid.ceresDeg}°, snow ${grid.modisKm} km window`,
                `Weather cell ${humanize(cell.class)}`,
                ...(view.terrain ? [`Terrain ${view.terrain.grid_m} m grid, ${view.terrain.box_km} km box`] : []),
                `Record ${formatDate(view.period.start)} to ${formatDate(view.period.end)}`,
              ]}
            />
          </Block>
        </div>
      </div>
    </>
  );
}

function Block({
  index,
  accent = index,
  eyebrow,
  title,
  aside,
  children,
}: {
  index: string;
  /** Gold lead of the eyebrow; the block number unless set. */
  accent?: string;
  eyebrow: string;
  title: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`block-${index}`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-2.5">
        <div>
          <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
          <h2 id={`block-${index}`} className="mt-2 font-display text-[clamp(28px,3vw,34px)] leading-[1.05]">
            {title}
          </h2>
        </div>
        <p className="max-w-[56ch] text-[12.5px] leading-relaxed text-ink-3">{aside}</p>
      </div>
      {children}
    </section>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 pr-4">
      <dt className="order-last text-[12px] text-ink-3">{label}</dt>
      <dd className="font-display text-[30px] leading-[1.05] tabular-nums">{value}</dd>
    </div>
  );
}
