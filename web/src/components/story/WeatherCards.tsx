import type { ReactNode } from "react";

import { Callout } from "@/components/ui/Callout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LEVEL_LABELS, LevelBadge } from "@/components/ui/LevelBadge";
import { Panel } from "@/components/ui/Panel";
import type { Level } from "@/lib/data";
import { cn } from "@/lib/cn";
import {
  formatDayRange,
  formatNumber,
  formatPercent,
  formatTemp,
  MONTHS_LONG,
  shortName,
} from "@/lib/format";
import type { StoryData } from "@/lib/story";

import { SectionHead } from "./SectionHead";

interface Card {
  key: string;
  label: string;
  value: number;
  title: string;
  text: ReactNode;
  levels: [string, Level][];
  best?: boolean;
}

const levelText = (name: string, level: Level) => `${name} · ${LEVEL_LABELS[level].toLowerCase()}`;

/** Low sun is not enough: three cases where the weather sets the count of usable days. */
export function WeatherCards({ story }: { story: StoryData }) {
  const { preset, campaignDays, svalbardAugust: sv, ellesmereApril: apr, ellesmereBest: bw } = story;
  const ellesmere = shortName(story.sites.ellesmere.name);
  const cloud = `${formatNumber(preset.cloud_max_pct, 0)}%`;
  const chill = formatTemp(preset.wind_chill_min_c, 0);

  const cards: Card[] = [
    {
      key: "svalbard",
      label: "Expected usable days",
      value: sv.expected,
      title: `${shortName(story.sites.svalbard.name)}, ${MONTHS_LONG[7]}`,
      text: (
        <>
          The Sun is in the band {formatNumber(sv.bandHours)} h a day, but only {formatPercent(sv.clearShare)} of hours
          have cloud at {cloud} or less.
        </>
      ),
      levels: [["Clear sky", sv.clearSky]],
    },
    {
      key: "ellesmere-april",
      label: "Expected usable days",
      value: apr.expected,
      title: `${ellesmere}, ${MONTHS_LONG[3]}`,
      text: (
        <>
          Long low sun, {formatNumber(apr.bandHours)} h a day, but the median wind chill is{" "}
          <span className="whitespace-nowrap">{formatTemp(apr.windChillMedian)}</span>. Only{" "}
          {formatPercent(apr.windChillOkShare)} of hours are at <span className="whitespace-nowrap">{chill}</span> or
          warmer.
        </>
      ),
      levels: [["Wind chill", apr.windChill]],
    },
    {
      key: "ellesmere-best",
      label: "Best window",
      value: bw.held_out_mean,
      title: `${ellesmere}, ${formatDayRange(bw.start, bw.end)}`,
      text: (
        <>
          The best weeks of the year. Bad year {formatNumber(bw.p10, 0)}, good year {formatNumber(bw.p90, 0)} days,
          and a {formatPercent(bw.p_at_least)} chance of at least {story.minUsableDays}.
        </>
      ),
      levels: [
        ["Sun band", story.ellesmereBestLevels.sunBand],
        ["Wind chill", story.ellesmereBestLevels.windChill],
        ["Clear sky", story.ellesmereBestLevels.clearSky],
      ],
      best: true,
    },
  ];

  return (
    <section aria-labelledby="weather-title" className="pt-4 pb-[clamp(88px,14vh,140px)]">
      <div className="wrap">
        <SectionHead
          id="weather-title"
          eyebrow={`Usable days of ${campaignDays} · cloud ≤ ${cloud} · wind chill ≥ ${chill}`}
          title="Low sun is not enough. The weather decides."
        >
          A usable day needs {formatNumber(story.windowMinHours)} unbroken hours with the Sun in the band, and in every
          one of those hours a clear sky, a safe wind chill, moderate wind and no precipitation. Ten years of hourly
          NASA data, {story.years[0]}–{story.years[1]}.
        </SectionHead>

        <ul className="grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.key}>
              <Panel as="article" tone={c.best ? "sun" : "default"} className="flex h-full flex-col gap-2.5 p-6">
                <Eyebrow accent={c.best ? c.label : undefined}>{c.best ? undefined : c.label}</Eyebrow>
                <p
                  className={cn(
                    "font-display text-[84px] leading-[0.9] tracking-[-0.02em] tabular-nums",
                    c.best ? "text-sun" : c.value < 0.05 && "text-ink-3",
                  )}
                >
                  {formatNumber(c.value)}
                  <small className="ml-1.5 font-sans text-sm tracking-normal text-ink-2">
                    of {campaignDays} days{c.best ? ", held out" : ""}
                  </small>
                </p>
                <h3 className="mt-1 text-[15px] font-medium">{c.title}</h3>
                <p className="text-sm text-ink-2">{c.text}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3.5 text-ink-2">
                  {c.levels.map(([name, level]) => (
                    <LevelBadge key={name} level={level} label={levelText(name, level)} />
                  ))}
                </div>
              </Panel>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-[90ch] text-[13px] text-ink-3">
          Expected days for a month are its share of usable days over {story.years[0]}–{story.years[1]}, times{" "}
          {campaignDays}. The best window’s figure is held out: each year is scored on a window chosen from the other
          years, so hindsight does not flatter it. Snow is reported separately and does not lower the count.
        </p>
        {story.ellesmereCell.class !== "representative" && (
          <Callout title={`${ellesmere} weather cell.`} className="mt-5 max-w-[90ch]">
            {story.ellesmereCell.note}
          </Callout>
        )}
      </div>
    </section>
  );
}
