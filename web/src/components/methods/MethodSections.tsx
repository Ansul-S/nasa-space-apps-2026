import type { CSSProperties, ReactNode } from "react";

import { SectionHead } from "@/components/story/SectionHead";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LEVEL_LABELS, LevelGlyph } from "@/components/ui/LevelBadge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import type { AnalogIndex, Level, WeatherCellClass } from "@/lib/data";
import { formatDayRange, formatDegrees, formatNumber, formatTemp, humanize, shortName } from "@/lib/format";
import { repoFile, type MethodsData } from "@/lib/methods";

import { CHECK_COUNTS } from "./Checks";

export const SECTIONS = [
  ["checks", "Validation"],
  ["rule", "The usable-day rule"],
  ["odds", "Campaign odds"],
  ["levels", "Match levels"],
  ["data", "Data"],
  ["limits", "Limits"],
  ["next", "Next steps"],
] as const;

const linkClass =
  "text-ink-2 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink-3";

/** Page header: what the page answers, the headline counts and the contents. */
export function MethodsHero({ data }: { data: MethodsData }) {
  const checks = CHECK_COUNTS.automated + CHECK_COUNTS.once + CHECK_COUNTS.not_run;
  const stats: [ReactNode, string][] = [
    [data.siteCount, "Earth sites"],
    [data.years[1] - data.years[0] + 1, `years of hourly data, ${data.years[0]}–${data.years[1]}`],
    [data.sourceCount, "NASA and partner data products"],
    [checks, `checks, ${CHECK_COUNTS.automated} automated`],
  ];
  return (
    <section aria-labelledby="methods-title" className="relative isolate overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-380px] right-[-200px] -z-10 h-[640px] w-[1100px] bg-[radial-gradient(closest-side,rgb(255_138_61/0.16),rgb(246_182_90/0.05)_55%,transparent_75%)]"
      />
      <div className="wrap pt-[clamp(56px,10vh,112px)] pb-[clamp(48px,8vh,88px)]">
        <Eyebrow accent="Methods and limits">How the planner works</Eyebrow>
        <h1
          id="methods-title"
          className="mt-5 max-w-[18ch] animate-rise font-display text-[clamp(44px,6.4vw,92px)] leading-[0.98] tracking-[-0.015em]"
        >
          How every number is made, and <em className="text-sun-pale">where it stops</em>.
        </h1>
        <p className="mt-6 max-w-[64ch] animate-rise text-[17px] text-ink-2 [animation-delay:120ms]">
          The planner counts usable low-sun test days from {data.years[1] - data.years[0] + 1} years of hourly NASA
          data. This page shows the checks that number has passed, the rule behind it, and the limits we know about,
          so a field-test lead can judge how far to trust it.
        </p>
        <dl className="mt-10 grid max-w-[900px] grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="border-l border-line-2 pl-4">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-[44px] leading-none tabular-nums">{value}</dd>
              <dd className="mt-1.5 text-[12px] leading-snug text-ink-3">{label}</dd>
            </div>
          ))}
        </dl>
        <nav aria-label="On this page" className="mt-12">
          <ol className="flex flex-wrap gap-2">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line-2 px-3.5 py-1.5 text-[13px] text-ink-2 no-underline transition-colors hover:border-ink-3 hover:text-ink"
                >
                  <span className="font-mono text-[10.5px] text-sun">{String(i + 1).padStart(2, "0")}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}

function Section({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("border-t border-line py-[clamp(72px,11vh,120px)]", className)}>
      <div className="wrap">{children}</div>
    </section>
  );
}

const sectionNumber = (id: (typeof SECTIONS)[number][0]) =>
  String(SECTIONS.findIndex(([s]) => s === id) + 1).padStart(2, "0");

/* ---------- 02 the rule ---------- */

type Cell = "pass" | "fail" | "out";

interface Example {
  title: string;
  verdict: string;
  usable: boolean;
  band: boolean[];
  rows: [label: string, cells: Cell[]][];
  stretches: { from: number; to: number; ok: boolean; label: string }[];
}

/** Five hours of one day, of which the middle three have the Sun in the band. */
function RuleExample({ ex }: { ex: Example }) {
  const cols = "grid grid-cols-[92px_repeat(5,minmax(0,1fr))] gap-[3px] sm:grid-cols-[132px_repeat(5,minmax(0,1fr))]";
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="text-[14px] font-medium">{ex.title}</h4>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase",
            ex.usable ? "border-sun/45 text-sun" : "border-rose/45 text-rose",
          )}
        >
          {ex.verdict}
        </span>
      </div>
      <div className={cn(cols, "font-mono text-[10px] text-ink-3")} aria-hidden="true">
        <span />
        {[1, 2, 3, 4, 5].map((h) => (
          <span key={h} className="text-center">
            h{h}
          </span>
        ))}
      </div>
      <div className={cols}>
        <span className="self-center text-[12px] text-ink-2">Sun in the band</span>
        {ex.band.map((on, i) => (
          <span
            key={i}
            className={cn("h-6 rounded-[3px]", on ? "bg-[linear-gradient(90deg,var(--color-sun),var(--color-sun-hot))]" : "bg-sky-3")}
          />
        ))}
      </div>
      {ex.rows.map(([label, cells]) => (
        <div key={label} className={cols}>
          <span className="self-center text-[12px] text-ink-2">{label}</span>
          {cells.map((c, i) => (
            <span
              key={i}
              className={cn(
                "grid h-6 place-items-center rounded-[3px] border text-[11px]",
                c === "pass" && "border-sun/30 text-sun",
                c === "fail" && "border-rose/60 bg-rose/10 text-rose",
                c === "out" && "border-line text-ink-3/60",
              )}
            >
              {c === "pass" ? "✓" : c === "fail" ? "✕" : "·"}
            </span>
          ))}
        </div>
      ))}
      <div className={cn(cols, "mt-2")}>
        <span className="self-center text-[12px] text-ink-2">Unbroken stretch</span>
        {ex.stretches.map((s) => (
          <span
            key={s.from}
            style={{ gridColumn: `${s.from + 2} / ${s.to + 2}` }}
            className={cn(
              "grid h-6 place-items-center rounded-full border font-mono text-[10.5px]",
              s.ok ? "border-sun bg-sun/15 text-sun" : "border-rose/50 text-rose",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RuleSection({ index }: { index: AnalogIndex }) {
  const r = index.rule;
  const minH = Number(r.window_min_h);
  const presets = index.presets;
  const strict = presets.find((p) => p.default) ?? presets[0];
  const cloud = `${formatNumber(strict.cloud_max_pct, 0)}%`;
  const cloudLimits = [...new Set(presets.map((p) => p.cloud_max_pct))].map((v) => `${formatNumber(v, 0)}%`);
  const chillLimits = [...new Set(presets.map((p) => p.wind_chill_min_c))].map((v) => formatTemp(v, 0));

  const ok: Cell[] = ["out", "pass", "pass", "pass", "out"];
  const examples: Example[] = [
    {
      title: "A usable day",
      verdict: "Usable",
      usable: true,
      band: [false, true, true, true, false],
      rows: [
        [`Cloud ≤ ${cloud}`, ok],
        ["Wind", ok],
        [`Wind chill ≥ ${formatTemp(strict.wind_chill_min_c, 0)}`, ok],
      ],
      stretches: [{ from: 1, to: 4, ok: true, label: `3 h ≥ ${formatNumber(minH)} h` }],
    },
    {
      title: "Cloud in the middle hour",
      verdict: "Not usable",
      usable: false,
      band: [false, true, true, true, false],
      rows: [
        [`Cloud ≤ ${cloud}`, ["out", "pass", "fail", "pass", "out"]],
        ["Wind", ok],
        [`Wind chill ≥ ${formatTemp(strict.wind_chill_min_c, 0)}`, ok],
      ],
      stretches: [
        { from: 1, to: 2, ok: false, label: "1 h" },
        { from: 3, to: 4, ok: false, label: "1 h" },
      ],
    },
  ];

  const rule: [string, ReactNode][] = [
    [
      "Low sun",
      <>
        The Sun&apos;s apparent elevation is in the target&apos;s band: from the horizon up to the highest it climbs at
        the target, (90° − |latitude|) + 1.5° for the Moon&apos;s tilt.{" "}
        {index.targets.map((t, i) => (
          <span key={t.id}>
            {i > 0 && ", "}
            {shortName(t.name)} 0–{formatDegrees(t.band_max_deg)}
          </span>
        ))}
        . Flat horizon, refraction included.
      </>,
    ],
    [
      "For long enough",
      <>
        One unbroken stretch of at least {formatNumber(minH)} hours, checked at {formatNumber(Number(r.step_min), 0)}
        -minute steps.
      </>,
    ],
    ["Clear sky", <>Cloud amount at or below the preset limit ({cloudLimits.join(" or ")}) in every hour of the stretch.</>],
    [
      "Workable wind",
      <>
        At most {formatNumber(Number(r.wind_max_snow_ms))} m/s over snow and {formatNumber(Number(r.wind_max_bare_ms), 0)} m/s
        over bare ground, every hour. Snow cover of {formatNumber(Number(r.snow_covered_pct), 0)}% or more counts as
        snow, and so does unknown snow.
      </>,
    ],
    [
      "Safe wind chill",
      <>
        At or above the preset limit ({chillLimits.join(" or ")}) every hour, with the Environment Canada and US
        National Weather Service formula.
      </>,
    ],
    ["Dry", <>Less than {formatNumber(Number(r.precip_max_mm_per_day))} mm of precipitation that day.</>],
  ];

  return (
    <Section id="rule">
      <SectionHead id="rule-title" eyebrow={`${sectionNumber("rule")} · The usable-day rule`} title="A day counts only when the low Sun and the weather hold together">
        Each day is a local solar day, so a window around local midnight stays in one day. The rule runs on every day of
        the record, for every site, target and preset.
      </SectionHead>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <ol className="flex flex-col">
          {rule.map(([title, text], i) => (
            <li
              key={title}
              className="reveal grid grid-cols-[34px_1fr] gap-x-3 border-b border-line py-4 first:pt-0 last:border-0"
              style={{ "--i": i } as CSSProperties}
            >
              <span className="font-mono text-[11px] text-sun">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[15px] font-medium">{title}</h3>
                <p className="mt-1 text-sm text-ink-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-4">
          <Panel className="reveal flex flex-col gap-8 p-5 sm:p-6">
            <div>
              <Eyebrow>Two days, read by the rule</Eyebrow>
              <p className="mt-2 text-[13px] text-ink-3">
                A schematic, not data: five hours of one day with the Sun in the band for three of them. A single
                cloudy hour splits the stretch in two.
              </p>
            </div>
            {examples.map((ex) => (
              <RuleExample key={ex.title} ex={ex} />
            ))}
          </Panel>

          <Panel className="reveal overflow-hidden">
            <h3 className="eyebrow px-5 pt-5 pb-2 sm:px-6">The four weather presets</h3>
            <ul>
              {presets.map((p) => (
                <li key={p.id} className="border-t border-line px-5 py-3 first:border-0 sm:px-6">
                  <span className="text-[13.5px] text-ink">{p.label}</span>
                  {p.default && (
                    <span className="ml-2 font-mono text-[10px] tracking-[0.1em] text-sun uppercase">default</span>
                  )}
                  {p.warning && <span className="mt-0.5 block text-[12px] leading-snug text-rose">{p.warning}</span>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 03 odds ---------- */

export function OddsSection({ data }: { data: MethodsData }) {
  const ex = data.heldOut.example;
  const years = data.years[1] - data.years[0] + 1;
  const usable = [2, 5, 6, 11];
  return (
    <Section id="odds">
      <SectionHead
        id="odds-title"
        eyebrow={`${sectionNumber("odds")} · Campaign odds`}
        title={`From usable days to the odds of a ${data.campaignDays}-day campaign`}
      >
        Every day of the record starts one {data.campaignDays}-day campaign. Counting the usable days in each gives a
        spread, not a single promise.
      </SectionHead>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="reveal flex flex-col gap-4 p-5 sm:p-6">
          <Eyebrow accent="01">One campaign</Eyebrow>
          <div className="grid grid-cols-7 gap-[3px]" role="img" aria-label={`A schematic campaign of ${data.campaignDays} days with ${usable.length} usable`}>
            {Array.from({ length: data.campaignDays }, (_, d) => (
              <span
                key={d}
                className={cn("h-7 rounded-[3px]", usable.includes(d) ? "bg-sun" : "border border-line bg-sky-2")}
              />
            ))}
          </div>
          <p className="text-sm text-ink-2">
            The rule marks each of the {data.campaignDays} days usable or not. This schematic campaign has{" "}
            {usable.length}, so it counts towards the chance of at least {data.minUsableDays} usable days.
          </p>
        </Panel>
        <Panel className="reveal flex flex-col gap-4 p-5 sm:p-6" style={{ "--i": 1 } as CSSProperties}>
          <Eyebrow accent="02">Grouped by start month</Eyebrow>
          <p className="text-sm text-ink-2">
            About 300 campaigns start in each calendar month over {years} years. The planner shows their mean, median,
            a bad year (10th percentile), a good year (90th) and the chance of at least {data.minUsableDays} usable
            days, plus the median for each year. Neighbouring days are not assumed to be independent: each campaign is
            counted from the real sequence of days.
          </p>
        </Panel>
        <Panel tone="sun" className="reveal flex flex-col gap-4 p-5 sm:p-6" style={{ "--i": 2 } as CSSProperties}>
          <Eyebrow accent="03">The best window, held out</Eyebrow>
          <div className="flex items-end gap-6">
            <div>
              <p className="font-display text-[44px] leading-none text-ink-3 tabular-nums line-through decoration-1">
                {formatNumber(ex.mean)}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-3">in sample</p>
            </div>
            <div>
              <p className="font-display text-[56px] leading-none text-sun tabular-nums">{formatNumber(ex.held_out_mean)}</p>
              <p className="mt-1 text-[11.5px] text-ink-3">held out, quoted</p>
            </div>
          </div>
          <p className="text-sm text-ink-2">
            The best start day has the highest 7-day running mean; its figures use the {ex.n} campaigns starting within 3
            days of it. Because the best of 365 days looks better than it is, each year is scored on a window chosen
            without it. {shortName(data.sites.ellesmere.name)}, {formatDayRange(ex.start, ex.end)}.
          </p>
        </Panel>
      </div>
    </Section>
  );
}

/* ---------- 04 match levels ---------- */

const LEVEL_ORDER: Level[] = ["match", "partial", "breaks_down", "impossible", "not_calculated"];

export function LevelsSection({ index }: { index: AnalogIndex }) {
  const fixed = index.fidelity_rows.filter((r) => r.level);
  const t = index.thresholds;
  return (
    <Section id="levels">
      <SectionHead
        id="levels-title"
        eyebrow={`${sectionNumber("levels")} · Match levels`}
        title="Where the analog holds, and where it breaks"
      >
        The fidelity card rates each condition at the target against the site in the chosen month. The{" "}
        {formatNumber(t.match_share * 100, 0)}% and {formatNumber(t.partial_share * 100, 0)}% lines are our design
        choice, not a published standard.
      </SectionHead>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ul className="flex flex-col">
          {LEVEL_ORDER.map((level, i) => (
            <li
              key={level}
              className="reveal grid grid-cols-[22px_1fr] gap-x-3 border-b border-line py-4 first:pt-0 last:border-0"
              style={{ "--i": i } as CSSProperties}
            >
              <span className="pt-0.5">
                <LevelGlyph level={level} size={16} />
              </span>
              <div>
                <h3 className="text-[15px] font-medium">{LEVEL_LABELS[level]}</h3>
                <p className="mt-1 text-sm text-ink-2">{index.levels[level]}.</p>
              </div>
            </li>
          ))}
          <li className="pt-4 text-[13px] text-ink-3">
            Ground: under {formatNumber(t.snow_free_pct, 0)}% snow is a match, {formatNumber(t.snow_free_pct, 0)}–
            {formatNumber(t.snow_covered_pct, 0)}% partial, more breaks down. Terrain: slope distance up to{" "}
            {formatNumber(t.terrain_match_ks)} is a match, up to {formatNumber(t.terrain_partial_ks)} partial.
          </li>
        </ul>

        <Panel className="reveal self-start overflow-hidden">
          <div className="eyebrow px-5 pt-5 pb-2 sm:px-6">Rows with a fixed level, at every site</div>
          <ul>
            {fixed.map((row) => (
              <li key={row.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line px-5 py-3.5 first:border-0 sm:px-6">
                <span className="text-[14px] text-ink">{row.label}</span>
                <span className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap text-ink-2">
                  <LevelGlyph level={row.level as Level} size={12} />
                  {LEVEL_LABELS[row.level as Level]}
                </span>
                {row.note && <span className="col-span-2 text-[12.5px] leading-snug text-ink-3">{row.note}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Section>
  );
}

/* ---------- 05 data ---------- */

const CELL_ORDER: WeatherCellClass[] = ["representative", "mixed", "not_representative"];
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function DataSection({ index, data }: { index: AnalogIndex; data: MethodsData }) {
  return (
    <Section id="data">
      <SectionHead id="data-title" eyebrow={`${sectionNumber("data")} · Data`} title="Open NASA and partner data, calculated in advance">
        A Python pipeline reads each dataset, applies the rule and writes small JSON files. The website reads only
        those files, so nothing is computed on a server. Method details are in the{" "}
        <a href={repoFile("pipeline/README.md")} target="_blank" rel="noreferrer" className={linkClass}>
          pipeline README
        </a>
        .
      </SectionHead>

      <Panel className="reveal overflow-hidden">
        <div
          aria-hidden="true"
          className="hidden border-b border-line-2 px-6 py-3 font-mono text-[10.5px] tracking-[0.12em] text-ink-3 uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-x-6"
        >
          <span>Dataset</span>
          <span>Grid and use</span>
        </div>
        <dl>
          {Object.entries(index.sources).map(([id, s]) => (
            <div
              key={id}
              className="grid gap-x-6 gap-y-1 border-b border-line px-5 py-3.5 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:px-6"
            >
              <dt className="text-[13.5px] font-medium">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-ink no-underline hover:underline">
                  {s.name}
                </a>
              </dt>
              <dd className="text-[13px] text-ink-2">{s.detail}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <h3 className="mt-12 mb-4 eyebrow">Weather grid cells, by how well they describe the site</h3>
      <ul className="grid gap-4 md:grid-cols-3">
        {CELL_ORDER.map((c, i) => (
          <li key={c} className="reveal" style={{ "--i": i } as CSSProperties}>
            <Panel className="flex h-full flex-col gap-2 p-5">
              <p className="font-display text-[44px] leading-none tabular-nums">
                {data.cells[c]}
                <small className="ml-2 font-sans text-sm text-ink-2">of {data.siteCount} sites</small>
              </p>
              <h4 className="text-[14px] font-medium">{sentence(humanize(c))}</h4>
              <p className="text-[13px] text-ink-3">{index.weather_cell_classes[c]}</p>
            </Panel>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------- 06 limits ---------- */

export function LimitsSection({ data }: { data: MethodsData }) {
  const years = data.years[1] - data.years[0] + 1;
  const groups: [string, ReactNode[]][] = [
    [
      "Physics Earth cannot reproduce",
      [
        "Gravity, vacuum and the radiation environment.",
        "The Sun crosses Earth's sky about 30 times faster than the Moon's, so shadows turn quickly.",
        "Air scatters light into shadows and dims and reddens the low Sun; on the Moon shadows are black and the Sun is at full strength. The analog matches shadow length and direction, not contrast.",
      ],
    ],
    [
      "Weather data",
      [
        `A weather grid cell is 0.5° × 0.625°. Only ${data.cells.representative} of ${data.siteCount} site cells are mostly bare land; ${data.cells.not_representative} are ice sheet and read too cold, so their usable days are too pessimistic.`,
        "Cloud comes from a 1° grid, is least reliable over snow and ice and near the horizon, and was not compared with ground observations. The cloud limit is therefore optimistic.",
        "Local effects such as valley fog are missed. Precipitation poleward of 62.5° is model output without rain-gauge correction.",
      ],
    ],
    [
      "A short record",
      [
        `${years} years give ${years} seasons, so the bad-year and good-year values are uncertain.`,
        "Usable days in the best window vary from about 1 to 7 between years: a typical September is not a promised one.",
      ],
    ],
    [
      "Light and horizon",
      [
        "The horizon is flat. Local terrain can block a low Sun that the data counts as up.",
        "Only the Sun's position is modelled, not the amount of light that reaches the ground.",
        "The band's upper edge uses 1.5° for the Moon's tilt. The ephemeris puts the Sun up to 1.59° from the lunar equator, so near the height of southern summer the Sun at a target's centre can stand up to 0.1° above the band.",
      ],
    ],
    [
      "Snow and terrain",
      [
        "MODIS maps Antarctica as snow by design, so snow is not measured at the three Antarctic sites. Snow is reported, but does not lower the count.",
        "Terrain compares slope only, in one 10 km box per place, on a 40 m grid. Roughness and boulders are not compared, the lunar grid is interpolated between altimeter tracks, and the Earth model counts glacier surfaces as terrain.",
      ],
    ],
    [
      "Not modelled",
      [
        "Access, permits, travel and cost.",
        "Safety only as the wind-chill limit; the −40 °C presets carry a very high frostbite risk and are shown with a warning.",
      ],
    ],
  ];
  return (
    <Section id="limits">
      <SectionHead id="limits-title" eyebrow={`${sectionNumber("limits")} · Limits`} title="What the analog cannot do, stated openly">
        An Earth analog is never the Moon. These are the gaps we know about, from the physics that cannot be copied to
        the data that is too coarse.
      </SectionHead>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(([title, items], i) => (
          <li key={title} className="reveal" style={{ "--i": i % 3 } as CSSProperties}>
            <Panel className="flex h-full flex-col gap-3 p-5 sm:p-6">
              <h3 className="font-display text-[24px] leading-tight">{title}</h3>
              <ul className="flex flex-col gap-2.5">
                {items.map((item, k) => (
                  <li key={k} className="grid grid-cols-[10px_1fr] gap-x-2.5 text-[13.5px] text-ink-2">
                    <span aria-hidden="true" className="mt-[9px] block h-px w-2.5 bg-rose/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------- 07 next steps ---------- */

const NEXT: [string, string][] = [
  ["Ground truth", "Compare usable days with hourly observations at Eureka and Ny-Ålesund."],
  ["Horizon", "A local horizon from the elevation model for each shortlisted site."],
  ["More objectives", "Rover mobility on polar highland slopes, and an instrument test on Mars-like ground."],
  ["Every lunar region", "All nine candidate Artemis regions in the target picker."],
  ["Your limits", "Limits set by the user, such as an uncrewed rover's rated temperature, and adjustable weights."],
  ["Any area", "A global grid of bare land instead of a curated list, and upload of a test area as GeoJSON or KML."],
];

export function NextSection() {
  return (
    <Section id="next">
      <SectionHead id="next-title" eyebrow={`${sectionNumber("next")} · Next steps`} title="What comes after this event">
        The method is built to widen: more targets, more objectives and checks against the ground.
      </SectionHead>
      <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {NEXT.map(([title, text], i) => (
          <li key={title} className="reveal grid grid-cols-[34px_1fr] gap-x-3 border-t border-line pt-4" style={{ "--i": i % 3 } as CSSProperties}>
            <span className="font-mono text-[11px] text-sun">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="text-[15px] font-medium">{title}</h3>
              <p className="mt-1 text-sm text-ink-2">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
