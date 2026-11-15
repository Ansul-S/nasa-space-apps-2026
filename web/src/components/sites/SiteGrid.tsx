import Link from "next/link";
import type { CSSProperties } from "react";

import { MonthStrip } from "@/components/planner/MonthStrip";
import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { AnalogIndex } from "@/lib/data";
import {
  formatDayRange,
  formatDegrees,
  formatLatLon,
  formatNumber,
  formatPercent,
  MONTHS_LONG,
  shortName,
} from "@/lib/format";
import { rampGradient } from "@/lib/palette";
import type { SiteCard, SiteList } from "@/lib/site-list";

/** Page header: what the ranking uses and how to change it. */
export function SitesHero({ list }: { list: SiteList }) {
  const { target, preset, counts } = list;
  return (
    <section aria-labelledby="sites-title" className="relative isolate overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-380px] left-[-240px] -z-10 h-[640px] w-[1100px] bg-[radial-gradient(closest-side,rgb(255_138_61/0.14),rgb(246_182_90/0.05)_55%,transparent_75%)]"
      />
      <div className="wrap grid items-end gap-x-12 gap-y-8 pt-[clamp(56px,10vh,104px)] pb-[clamp(40px,7vh,72px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <Eyebrow accent="Sites">{list.cards.length} places on Earth</Eyebrow>
          <h1
            id="sites-title"
            className="mt-5 max-w-[16ch] animate-rise font-display text-[clamp(44px,6vw,84px)] leading-[0.98] tracking-[-0.015em]"
          >
            Every site, ranked by its <em className="text-sun-pale">best low-sun weeks</em>.
          </h1>
        </div>
        <div className="flex animate-rise flex-col gap-5 [animation-delay:120ms]">
          <p className="text-[15px] text-ink-2">
            {counts.validation} validation sites are analogs already in use; {counts.candidate} are candidates, and{" "}
            {counts.newSites} of all sites are new to analog work. Ranked for {shortName(target.name)} (Sun 0–
            {formatDegrees(target.band_max_deg)}) by the expected usable days of the best {list.campaignDays}-day
            window, held out. {preset.label}.
          </p>
          <ButtonLink href="/planner/" size="sm" className="self-start">
            Change target or limits in the planner <Arrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function Card({ card, list, cellNote, i }: { card: SiteCard; list: SiteList; cellNote: string; i: number }) {
  const { site, best, score, rank, bestMonth } = card;
  const days = best?.held_out_mean ?? 0;
  const none = !best || days === 0;
  return (
    <li className="reveal" style={{ "--i": i % 3 } as CSSProperties}>
      <Link
        href={`/sites/${site.id}/`}
        className={cn(
          "group flex h-full flex-col gap-4 rounded-panel border p-5 no-underline transition-[border-color,translate,background-color] duration-200 ease-soft hover:-translate-y-0.5 sm:p-6",
          rank === 1
            ? "border-sun/45 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(246_182_90/0.14),transparent_55%),linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))] hover:border-sun/70"
            : "border-line bg-[linear-gradient(180deg,var(--color-sky-1),rgb(10_14_20/0.6))] hover:border-line-2",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-xs text-ink-3">{rank ? String(rank).padStart(2, "0") : "—"}</span>
          <span className="flex flex-wrap justify-end gap-1.5">
            {site.role === "validation" && <Tag tone="validation">Validation</Tag>}
            {!site.known_analog && <Tag tone="new">New site</Tag>}
            {site.weather_cell_class === "not_representative" && (
              <Tag tone="warn" title={cellNote}>
                Cold-biased cell
              </Tag>
            )}
          </span>
        </div>

        <div>
          <h2 className="font-display text-[28px] leading-[1.05] text-ink">{shortName(site.name)}</h2>
          <p className="mt-1.5 text-[13px] text-ink-3">
            {site.region} · <span className="font-mono text-[12px]">{formatLatLon(site.lat, site.lon, 1)}</span>
          </p>
        </div>

        <div className="flex items-end gap-3">
          <p
            className={cn(
              "font-display text-[56px] leading-[0.85] tracking-[-0.02em] tabular-nums",
              none ? "text-ink-3" : rank === 1 ? "text-sun" : "text-ink",
            )}
          >
            {formatNumber(days)}
          </p>
          <p className="pb-0.5 text-[12.5px] leading-snug text-ink-2">
            {best && days > 0 ? (
              <>
                usable days of {list.campaignDays}
                <br />
                <span className="text-ink-3">{formatDayRange(best.start, best.end)}, held out</span>
              </>
            ) : best ? (
              <>
                usable days of {list.campaignDays}
                <br />
                <span className="text-ink-3">even in its best weeks</span>
              </>
            ) : (
              <>
                no usable low sun
                <br />
                <span className="text-ink-3">in any month</span>
              </>
            )}
          </p>
        </div>

        <div className="mt-auto">
          <MonthStrip
            values={score.map((v) => (v > 0 ? v / list.maxScore : 0))}
            titles={score.map((v) => `${formatPercent(v)} of days usable`)}
            month={bestMonth}
            labels
            cellClassName="h-2"
            decorative
          />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12.5px]">
            <span className="text-ink-3">
              {bestMonth != null ? <>Best month {MONTHS_LONG[bestMonth]}</> : "Lamps needed all year"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-2 transition-colors group-hover:text-sun">
              Open site <Arrow />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Every site as a card, best window first. */
export function SiteGrid({ list, index }: { list: SiteList; index: AnalogIndex }) {
  return (
    <section aria-label="Sites" className="py-[clamp(48px,8vh,88px)]">
      <div className="wrap">
        <p className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="block h-2 w-10 rounded-[2px]" style={{ background: rampGradient() }} />
            Share of usable days, by month
          </span>
          <span className="inline-flex items-center gap-2">
            <i aria-hidden="true" className="block h-2 w-3 rounded-[2px] outline outline-1 outline-offset-1 outline-ink" />
            Best month
          </span>
        </p>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.cards.map((card, i) => (
            <Card key={card.site.id} card={card} list={list} cellNote={index.weather_cell_classes.not_representative} i={i} />
          ))}
        </ul>
        <p className="mt-8 max-w-[90ch] text-[13px] text-ink-3">
          Held out: each year is scored on a window chosen from the other years, so hindsight does not flatter the
          figure. A cold-biased cell means the weather data describes the ice sheet next to the site, so its usable days
          are too pessimistic.{" "}
          <Link
            href="/methods/#checks"
            className="text-ink-2 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink-3"
          >
            How these numbers are checked
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
