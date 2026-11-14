"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Arrow, buttonClass } from "@/components/ui/Button";
import { LEVEL_LABELS, LevelGlyph } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/cn";
import type { SiteMeta, SiteScores, Target } from "@/lib/data";
import {
  formatDayRange,
  formatDegrees,
  formatDuration,
  formatLatLon,
  formatNumber,
  formatPercent,
  formatRange,
  humanize,
  MONTHS,
  MONTHS_LONG,
  shortName,
} from "@/lib/format";
import type { MoonFeature } from "@/lib/moon-features";
import type { MoonLight } from "@/lib/moon-sun";
import type { Nearest, PlannerData, PointLight } from "@/lib/planner";

import { MonthStrip } from "./MonthStrip";

/* ---------- shell ---------- */

function CardShell({ eyebrow, title, coords, onClose, children }: {
  eyebrow: ReactNode;
  title: string;
  coords: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <article aria-label={title} className="relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close card"
        className="absolute -top-1 -right-1 grid size-8 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:bg-sky-3 hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
      <div className="eyebrow pr-8">{eyebrow}</div>
      <h2 className="mt-2 mr-8 font-display text-[28px] leading-[1.05]">{title}</h2>
      <div className="mt-1 font-mono text-[11.5px] text-ink-3">{coords}</div>
      {children}
    </article>
  );
}

function Headline({ value, zero, children }: { value: string; zero?: boolean; children: ReactNode }) {
  return (
    <div className="mt-3.5 flex items-baseline gap-2.5">
      <b className={cn("font-display text-[56px] leading-[0.85] font-normal tabular-nums", zero ? "text-ink-3" : "text-sun")}>{value}</b>
      <span className="text-[13px] leading-snug text-ink-2">{children}</span>
    </div>
  );
}

function Facts({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t border-line pt-3.5 text-[13px]">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-ink-2">{k}</dt>
          <dd className="text-right font-mono whitespace-nowrap">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 text-[12px] leading-normal text-ink-2">{children}</p>
);

/* ---------- calculated site ---------- */

interface SiteCardProps {
  site: SiteMeta;
  scores: SiteScores;
  bandHours: number[];
  data: PlannerData;
  target: Target;
  month: number;
  /** Top-ranked site this month, offered when this one has no usable days. */
  topSite: SiteMeta | null;
  onFly: (id: string) => void;
  onClose: () => void;
}

export function SiteCard({ site, scores, bandHours, data, target, month, topSite, onFly, onClose }: SiteCardProps) {
  const expected = (scores.score[month] ?? 0) * data.campaignDays;
  const bw = scores.best_window;
  const zero = expected <= 0;
  const cell = site.weather_cell_class;
  return (
    <CardShell
      eyebrow={
        <>
          {site.role === "validation" ? "Validation site" : "Candidate site"} ·{" "}
          {site.known_analog ? "known analog" : <b className="font-medium text-sun">new site</b>}
        </>
      }
      title={site.name}
      coords={`${formatLatLon(site.lat, site.lon)} · ${site.region}`}
      onClose={onClose}
    >
      <Headline value={expected > 0 && expected < 0.05 ? "<0.1" : formatNumber(expected, 1)} zero={zero}>
        usable days per {data.campaignDays}
        <br />
        in {MONTHS_LONG[month]}, {data.years[0]}–{data.years[1]} average
      </Headline>
      <Facts
        rows={[
          [`Median, campaigns from ${MONTHS[month]}`, `${formatNumber(scores.median[month], 0)} days`],
          ["Bad year to good year", `${formatRange(scores.p10[month], scores.p90[month])} days`],
          [`Chance of ${data.minUsableDays} or more`, formatPercent(scores.p_at_least[month])],
          [`Sun in the 0–${formatNumber(target.band_max_deg)}° band`, `${formatNumber(bandHours[month])} h/day`],
          ["Best window", bw && bw.held_out_mean > 0 ? `${formatDayRange(bw.start, bw.end)} · ${formatNumber(bw.held_out_mean)} d` : "none"],
        ]}
      />
      <MonthStrip
        className="mt-3.5"
        cellClassName="h-[22px] rounded-[3px]"
        values={scores.score.map((v) => (v > 0 ? v / data.maxScore : 0))}
        titles={scores.score.map((v) => `${formatPercent(v)} of days usable`)}
        month={month}
        labels
      />
      {cell !== "representative" && (
        <Note>
          <b className={cn("font-medium", cell === "not_representative" ? "text-rose" : "text-ice")}>
            Weather cell {humanize(cell)}.
          </b>{" "}
          {data.cellNotes[cell]}
        </Note>
      )}
      <div className="mt-3.5 flex flex-col gap-2">
        <Link href={`/sites/${site.id}/`} className={buttonClass({ variant: "primary", size: "sm" }, "w-full")}>
          Open site analysis <Arrow />
        </Link>
        {zero && topSite && topSite.id !== site.id && (
          <button type="button" onClick={() => onFly(topSite.id)} className={buttonClass({ size: "sm" }, "w-full cursor-pointer")}>
            Fly to the top site for {MONTHS[month]}: {shortName(topSite.name)}
          </button>
        )}
      </div>
    </CardShell>
  );
}

/* ---------- searched or clicked point on Earth ---------- */

/** Hours a day in the band at the top of the colour ramp; the best calculated site reaches 8.9. */
const BAND_HOURS_TOP = 10;

interface PlaceCardProps {
  name: string;
  detail?: string;
  lat: number;
  lon: number;
  light: PointLight;
  target: Target;
  month: number;
  sunNow: number;
  nearest: Nearest;
  siteCount: number;
  onFly: (id: string) => void;
  onClose: () => void;
}

export function PlaceCard({
  name,
  detail,
  lat,
  lon,
  light,
  target,
  month,
  sunNow,
  nearest,
  siteCount,
  onFly,
  onClose,
}: PlaceCardProps) {
  const level = light.longestHours >= 2 ? "match" : light.hours > 0 ? "partial" : "breaks_down";
  return (
    <CardShell
      eyebrow="Searched place · sun calculated in your browser"
      title={name}
      coords={detail ? `${formatLatLon(lat, lon)} · ${detail}` : formatLatLon(lat, lon)}
      onClose={onClose}
    >
      <Headline value={formatNumber(light.hours, 1)} zero={light.hours <= 0}>
        hours with the Sun in the
        <br />
        0–{formatNumber(target.band_max_deg)}° band on 15 {MONTHS[month]}
      </Headline>
      <Facts
        rows={[
          ["Longest unbroken stretch", light.longestHours ? formatDuration(light.longestHours) : "—"],
          [
            "2-hour test window",
            <span key="l" className="inline-flex items-center gap-1.5 font-sans">
              <LevelGlyph level={level} /> {LEVEL_LABELS[level]}
            </span>,
          ],
          ["Sun at the clock time", formatDegrees(sunNow)],
        ]}
      />
      <MonthStrip
        className="mt-3.5"
        cellClassName="h-[22px] rounded-[3px]"
        values={light.year.map((h) => (h > 0 ? h / BAND_HOURS_TOP : 0))}
        titles={light.year.map((h) => `${formatNumber(h)} h a day in the band`)}
        month={month}
        labels
      />
      <Note>
        Usable-day odds need ten years of hourly weather, calculated for the {siteCount} sites. Nearest: <b className="font-medium text-ink">{nearest.site.name}</b>,{" "}
        {Math.round(nearest.km).toLocaleString("en")} km away.
      </Note>
      <button
        type="button"
        onClick={() => onFly(nearest.site.id)}
        className={buttonClass({ size: "sm" }, "mt-3.5 w-full cursor-pointer")}
      >
        Fly to {shortName(nearest.site.name)}
      </button>
    </CardShell>
  );
}

/* ---------- Moon ---------- */

interface MoonCardProps {
  name: string;
  feature: MoonFeature | null;
  lat: number;
  lon: number;
  light: MoonLight;
  sunNow: number;
  target: Target;
  periodLabel: string;
  compareWith: string;
  onCompare: () => void;
  onClose: () => void;
}

export function MoonCard({ name, feature, lat, lon, light, sunNow, target, periodLabel, compareWith, onCompare, onClose }: MoonCardProps) {
  const isTarget = feature?.kind === "target";
  return (
    <CardShell
      eyebrow={
        isTarget ? (
          <>
            <b className="font-medium text-sun">Lunar target</b> · {feature.note}
          </>
        ) : feature ? (
          <>Moon · {feature.note}</>
        ) : (
          "Moon · picked point"
        )
      }
      title={name}
      coords={`${formatLatLon(lat, lon)} · Moon`}
      onClose={onClose}
    >
      <Headline value={formatPercent(light.bandShare)} zero={light.bandShare <= 0}>
        of the lunar day with the Sun
        <br />
        in the 0–{formatNumber(target.band_max_deg)}° band
      </Headline>
      <Facts
        rows={[
          ["Sun at the clock time", formatDegrees(sunNow)],
          ["Sun above the horizon", `${formatPercent(light.upShare)} of the time`],
          ["Highest Sun that lunar day", formatDegrees(light.maxElevation)],
          ...(isTarget ? ([["Sun speed across the sky", `${formatNumber(target.sun_rate_deg_per_h, 2)}°/h`]] as [string, string][]) : []),
        ]}
      />
      <Note>
        {isTarget
          ? "Every Earth site in the list is ranked against this light. Here the Sun stays this low whenever it is up, and crawls about 30 times slower than on Earth."
          : "No weather here: only the sun band and the terrain decide."}{" "}
        <span className="text-ink-3">
          {periodLabel}. Sun from the astronomy-engine ephemeris
          {feature ? <>; position from the IAU gazetteer (feature {feature.gazetteer})</> : null}.
        </span>
      </Note>
      <button type="button" onClick={onCompare} className={buttonClass({ variant: "primary", size: "sm" }, "mt-3.5 w-full cursor-pointer")}>
        Compare with {compareWith} <Arrow />
      </button>
    </CardShell>
  );
}
