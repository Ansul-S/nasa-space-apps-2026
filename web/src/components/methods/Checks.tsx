import type { CSSProperties, ReactNode } from "react";

import { SectionHead } from "@/components/story/SectionHead";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { DEFAULT_TARGET, getTarget, type AnalogIndex } from "@/lib/data";
import {
  formatDayRange,
  formatDegrees,
  formatDuration,
  formatNumber,
  formatTemp,
  MONTH_INITIALS,
  MONTHS,
  MONTHS_LONG,
  shortName,
} from "@/lib/format";
import { FIELD_SEASON, repoFile, SUN_TESTS, type MethodsData } from "@/lib/methods";

export type CheckStatus = "automated" | "once" | "not_run";

const STATUS: Record<CheckStatus, { label: string; legend: string; text: string }> = {
  automated: { label: "Automated test", legend: "automated tests", text: "tests in the repository, run by GitHub Actions on every push" },
  once: { label: "Checked once", legend: "checked once", text: "on 14 Nov 2026, recorded in the pipeline README" },
  not_run: { label: "Not run", legend: "not run", text: "planned, but not run in this event" },
};

/** Cards per status in `Checks` below; keep in step when a card is added or removed. */
export const CHECK_COUNTS: Record<CheckStatus, number> = { automated: 6, once: 4, not_run: 2 };

/** Filled gold for an automated test, an ice ring for a one-off check, a dashed ring when not run. */
function StatusGlyph({ status, size = 14 }: { status: CheckStatus; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="flex-none">
      {status === "automated" && (
        <>
          <circle cx="7" cy="7" r="6" className="fill-sun" />
          <path d="M4.2 7.2 6.1 9l3.7-4" fill="none" className="stroke-ink-on-sun" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === "once" && (
        <>
          <circle cx="7" cy="7" r="5.3" fill="none" className="stroke-ice" strokeWidth="1.4" />
          <circle cx="7" cy="7" r="2" className="fill-ice" />
        </>
      )}
      {status === "not_run" && (
        <circle cx="7" cy="7" r="5.3" fill="none" className="stroke-ink-3" strokeWidth="1.3" strokeDasharray="2 2.2" />
      )}
    </svg>
  );
}

function StatusChip({ status }: { status: CheckStatus }) {
  return (
    <span
      title={STATUS[status].label}
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase",
        status === "automated" && "border-sun/40 text-sun",
        status === "once" && "border-ice/35 text-ice",
        status === "not_run" && "border-line-2 text-ink-3",
      )}
    >
      <StatusGlyph status={status} size={11} />
      {STATUS[status].label}
    </span>
  );
}

/** A link to the file that runs or records a check. */
function Evidence({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-3 underline decoration-line-2 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink-3"
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

const testFile = (path: string) => repoFile(path);

interface CardProps {
  status: CheckStatus;
  title: ReactNode;
  expected: ReactNode;
  children: ReactNode;
  evidence?: [label: string, href: string][];
  className?: string;
  tone?: "default" | "sun";
  i?: number;
  /** Show the status chip; the grouped one-off and not-run cards have a heading instead. */
  chip?: boolean;
}

/** One check: what we expected, what the data gives, and where to verify it. */
function CheckCard({ status, title, expected, children, evidence = [], className, tone = "default", i = 0, chip = true }: CardProps) {
  const body = (
    <>
      {chip && <StatusChip status={status} />}
        <h3 className="font-display text-[24px] leading-[1.1] tracking-[-0.005em] sm:text-[26px]">{title}</h3>
        <p className="text-[13px] text-ink-3">
          <span className="eyebrow mr-1.5 text-[10px]">Expected</span>
          {expected}
        </p>
        <div className="flex flex-1 flex-col gap-3 text-sm text-ink-2">{children}</div>
        {evidence.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
            {evidence.map(([label, href]) => (
              <Evidence key={label} href={href}>
                {label}
              </Evidence>
            ))}
          </div>
        )}
    </>
  );
  const box = "flex h-full flex-col gap-3 p-5 sm:p-6";
  return (
    <li className={cn("reveal", className)} style={{ "--i": i } as CSSProperties}>
      {status === "not_run" ? (
        <article className={cn(box, "rounded-panel border border-dashed border-line-2")}>{body}</article>
      ) : (
        <Panel as="article" tone={tone} className={box}>
          {body}
        </Panel>
      )}
    </li>
  );
}

/** A big measured value with its unit. */
function Measured({ value, unit, muted = false }: { value: ReactNode; unit?: ReactNode; muted?: boolean }) {
  return (
    <p className={cn("font-display text-[56px] leading-[0.9] tracking-[-0.02em] tabular-nums", muted ? "text-ink-3" : "text-sun")}>
      {value}
      {unit != null && <small className="ml-2 font-sans text-sm tracking-normal text-ink-2">{unit}</small>}
    </p>
  );
}

/** Twelve month cells with a value printed in each. */
function MonthCells({
  cells,
  label,
}: {
  cells: { text: string; on?: boolean; dim?: boolean; title: string }[];
  label: string;
}) {
  return (
    <div role="img" aria-label={label}>
      <div className="grid grid-cols-12 gap-[3px]">
        {cells.map((c, m) => (
          <span
            key={m}
            title={`${MONTHS_LONG[m]}: ${c.title}`}
            className={cn(
              "grid h-9 place-items-center rounded-[4px] border font-mono text-[11px] tabular-nums sm:h-10",
              c.on ? "border-sun/60 bg-sun/15 text-sun" : "border-line bg-sky-2",
              c.dim ? "text-ink-3" : !c.on && "text-ink-2",
            )}
          >
            {c.text}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 grid grid-cols-12 gap-[3px] text-center font-mono text-[9.5px] text-ink-3">
        {MONTH_INITIALS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}

/** The validation panel: every check, with its status and the file that runs or records it. */
export function Checks({ data, index }: { data: MethodsData; index: AnalogIndex }) {
  const target = getTarget(index, DEFAULT_TARGET);
  const band = `0–${formatDegrees(target.band_max_deg)}`;
  const minHours = Number(index.rule.window_min_h);
  const az = data.arizona;
  const sv = data.svalbard;
  const ho = data.heldOut;
  const fs = data.fieldSeason;
  const [first, last] = data.years;
  const devon = shortName(data.sites.devon.name);
  const validationFile = testFile("pipeline/tests/test_validation.py");
  const methodsTest = testFile("web/src/lib/methods.test.ts");
  const readme = repoFile("pipeline/README.md#checks-and-findings");
  const maxDays = Math.max(...data.ellesmere.map((c) => Math.max(c.march, c.april)));
  const chillDefault = index.presets.find((p) => p.default)?.wind_chill_min_c ?? null;

  return (
    <section id="checks" aria-labelledby="checks-title" className="py-[clamp(72px,11vh,120px)]">
      <div className="wrap">
        <SectionHead id="checks-title" eyebrow="01 · Validation" title="We tested the method before trusting it">
          Each check states what we expected and what the data gives. Automated checks are tests in the repository.
          On every push, GitHub Actions reruns the website&apos;s tests, which recheck these figures against the published
          data, and the pipeline tests that need no raw data. The checks on the downloaded raw data run before each data
          release. The links open each test on GitHub.
        </SectionHead>

        <ul className="mb-8 flex flex-wrap gap-x-6 gap-y-2" aria-label="Checks by status">
          {(Object.keys(STATUS) as CheckStatus[]).map((s) => (
            <li key={s} className="inline-flex items-center gap-2 text-[13px] text-ink-2">
              <StatusGlyph status={s} />
              <b className="font-mono font-normal text-ink">{CHECK_COUNTS[s]}</b> {STATUS[s].legend}
              <span className="hidden text-ink-3 lg:inline">· {STATUS[s].text}</span>
            </li>
          ))}
        </ul>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* The Arizona check: the reason the planner exists. */}
          <CheckCard
            status="automated"
            tone="sun"
            className="md:col-span-2"
            title={<>{shortName(data.sites.arizona.name)}: the terrain matches, the light never does</>}
            expected={
              <>
                Good terrain and no usable low sun in any month: the reason NASA lights its night tests near Flagstaff
                with lamps.
              </>
            }
            evidence={[
              ["methods.test.ts", methodsTest],
              ["test_validation.py", validationFile],
              ["test_terrain.py", testFile("pipeline/tests/test_terrain.py")],
            ]}
          >
            <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
              <Measured value={az.usableCases} unit={`of ${az.cases} cases with a usable day`} muted />
              <MonthCells
                label={`${shortName(data.sites.arizona.name)}: 0 usable days in every month`}
                cells={MONTHS.map(() => ({ text: "0", dim: true, title: "0 usable days" }))}
              />
            </div>
            <p>
              Every month, for both targets and all {data.presetCount} weather presets ({az.cases} cases). The Sun
              crosses the {band} band twice a day, for {formatNumber(az.bandHoursMax)} h a day at most, but never for
              more than {formatDuration(az.longestWindowMax)} at a stretch. A usable day needs {formatNumber(minHours)} unbroken
              hours.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LevelBadge level={az.terrainLevel} label={`Terrain ${az.terrainLevel === "match" ? "matches" : "does not match"} ${shortName(target.name)}`} />
              <span className="font-mono text-[12px] text-ink-3">
                slope distance {formatNumber(az.terrainKs, 2)} · match at ≤ {formatNumber(index.thresholds.terrain_match_ks)}
              </span>
            </div>
          </CheckCard>

          <CheckCard
            i={1}
            status="automated"
            title={<>{shortName(data.sites.svalbard.name)} in August: zero</>}
            expected="No usable day in a typical August campaign, whatever the preset."
            evidence={[
              ["methods.test.ts", methodsTest],
              ["test_validation.py", validationFile],
            ]}
          >
            <Measured value="0" unit={`median usable days of ${data.campaignDays}`} muted />
            <p>
              In {sv.zeroMedianCases} of {sv.cases} target and preset cases. The Sun is low for hours, but August
              averages {formatNumber(sv.cloudMeanPct, 0)}% cloud. At most {formatNumber(sv.expectedMax)} days are
              expected.
            </p>
          </CheckCard>

          <CheckCard
            i={0}
            status="automated"
            title={<>{shortName(data.sites.ellesmere.name)}: April beats March</>}
            expected={`At the ${formatTemp(chillDefault, 0)} wind-chill limit, April gives more usable days than March, as the first estimate found.`}
            evidence={[
              ["methods.test.ts", methodsTest],
              ["test_validation.py", validationFile],
            ]}
          >
            <ul className="flex flex-col gap-2.5" aria-label="Expected usable days, March and April">
              {data.ellesmere.map((c) => (
                <li key={`${c.targetId}-${c.presetId}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                  <span className="text-[12.5px] text-ink-2">
                    {shortName(c.targetName)} · {c.presetLabel.split(",")[0].toLowerCase()}
                  </span>
                  <span className="font-mono text-[12px] text-ink-3 tabular-nums">
                    {formatNumber(c.march)} → <b className="font-normal text-sun">{formatNumber(c.april)}</b>
                  </span>
                  <span className="col-span-2 flex flex-col gap-[3px]" aria-hidden="true">
                    <i className="block h-1 rounded-full bg-ink-3/50" style={{ width: `${(c.march / maxDays) * 100}%` }} />
                    <i className="block h-1 rounded-full bg-sun" style={{ width: `${(c.april / maxDays) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-ink-3">
              Expected usable days of {data.campaignDays}, March (grey) and April (gold).
            </p>
          </CheckCard>

          <CheckCard
            i={1}
            status="automated"
            title="Sun position, against an independent algorithm"
            expected="Our NOAA-based sun engine agrees with NREL's Solar Position Algorithm."
            evidence={[
              ["test_sun.py", testFile("pipeline/tests/test_sun.py")],
              ["sun.test.ts", testFile("web/src/lib/sun.test.ts")],
            ]}
          >
            <Measured value={`≤ ${formatNumber(SUN_TESTS.spaElevationDeg, 2)}°`} unit="elevation" />
            <p>
              Every hour of {SUN_TESTS.spaYear} at {SUN_TESTS.spaSites} sites: elevation within{" "}
              {formatNumber(SUN_TESTS.spaElevationDeg, 2)}°, azimuth within {formatNumber(SUN_TESTS.spaAzimuthDeg)}°,
              and within {formatNumber(SUN_TESTS.spaBandDeg)}° inside the low-sun band, where refraction is largest.
              The browser&apos;s engine matches the pipeline at every site and month.
            </p>
          </CheckCard>

          <CheckCard
            i={2}
            status="automated"
            title="No hindsight in the best window"
            expected="Picking the best of 365 start days flatters its mean, so we quote a held-out figure instead."
            evidence={[
              ["methods.test.ts", methodsTest],
              ["test_odds.py", testFile("pipeline/tests/test_odds.py")],
            ]}
          >
            <Measured value={formatNumber(ho.meanInflation)} unit="days removed on average" />
            <p>
              Each year is scored on a window chosen from the other years. Over {ho.count} best windows the held-out
              figure is never higher, and up to {formatNumber(ho.maxInflation)} days lower.{" "}
              {shortName(data.sites.ellesmere.name)}, {formatDayRange(ho.example.start, ho.example.end)}:{" "}
              {formatNumber(ho.example.mean)} in sample, <span className="text-ink">{formatNumber(ho.example.held_out_mean)} held out</span>.
            </p>
          </CheckCard>

          <CheckCard
            i={0}
            status="automated"
            className="md:col-span-2 lg:col-span-3"
            title={<>{devon}: snow-free in its field season</>}
            expected={`The ${FIELD_SEASON.name} works on Devon Island in July and August, so the data should show bare ground then.`}
            evidence={[
              ["methods.test.ts", methodsTest],
              ["NASA Ames, 2010", FIELD_SEASON.url],
            ]}
          >
            <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
              <MonthCells
                label={`${devon}: snow-free in ${fs.snowFreeMonths.map((m) => MONTHS_LONG[m]).join(" and ")}`}
                cells={fs.snowPct.map((v, m) => ({
                  text: v == null ? "—" : `${Math.round(v)}`,
                  on: fs.snowFreeMonths.includes(m),
                  dim: v == null,
                  title: v == null ? "polar night, not measured" : `${Math.round(v)}% snow cover`,
                }))}
              />
              <p>
                Median snow cover (%) from MODIS, {first}–{last}. Under{" "}
                {formatNumber(index.thresholds.snow_free_pct, 0)}% only in{" "}
                {fs.snowFreeMonths.map((m) => MONTHS_LONG[m]).join(" and ")}, the months the data calls bare ground.{" "}
                {FIELD_SEASON.detail}
              </p>
            </div>
          </CheckCard>
        </ul>

        <h3 className="mt-14 mb-4 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-ice uppercase">
          <StatusGlyph status="once" /> Checked once · 14 Nov 2026
        </h3>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CheckCard
            status="once"
            chip={false}
            title="A second implementation"
            expected="The same usable days from independent code."
            evidence={[["pipeline README", readme]]}
          >
            <p>
              Recomputed with NREL SPA sun positions at 1-minute steps: the same usable days at Ellesmere Island in
              2020 under all four presets; 1 to 3 marginal days differ at Vestfold Hills.
            </p>
          </CheckCard>
          <CheckCard
            i={1}
            status="once"
            chip={false}
            title="No low-sun bias in the cloud"
            expected="Low-sun hours should not look clearer than the rest."
            evidence={[["pipeline README", readme]]}
          >
            <p>
              Hours with the Sun in the band are not less cloudy than other hours of the same month, so the cloud data
              does not favour the result.
            </p>
          </CheckCard>
          <CheckCard
            i={2}
            status="once"
            chip={false}
            title="Horizon sensitivity"
            expected="A slightly raised horizon should not change the ranking."
            evidence={[["pipeline README", readme]]}
          >
            <p>
              Requiring the Sun to be at least 1° or 2° up lowers the best windows by 0.1 to 0.6 days of{" "}
              {data.campaignDays} and leaves the ranking unchanged.
            </p>
          </CheckCard>
          <CheckCard
            i={3}
            status="once"
            chip={false}
            title="Model air against stations"
            expected="MERRA-2 temperature close to weather-station normals."
            evidence={[["pipeline README", readme]]}
          >
            <p>
              Within about 2 to 4 °C at Resolute, Svalbard Airport and Station Nord. 7 to 12 °C too cold in summer at the
              two Antarctic sites whose weather cell is ice sheet, which are flagged on their pages.
            </p>
          </CheckCard>
        </ul>

        <h3 className="mt-14 mb-4 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
          <StatusGlyph status="not_run" /> Not run in this event
        </h3>
        <ul className="grid gap-4 md:grid-cols-2">
          <CheckCard
            status="not_run"
            chip={false}
            title="Usable days against ground observations"
            expected="Counted usable days agree with hourly sky and wind records at Eureka (Ellesmere Island) or Ny-Ålesund (Svalbard)."
          >
            <p>
              Needs hourly station observations of cloud, which we could not obtain and process in time. The model-air
              check above is the partial substitute; cloud accuracy near the horizon remains the largest open
              question.
            </p>
          </CheckCard>
          <CheckCard
            i={1}
            status="not_run"
            chip={false}
            title="Known analog sites by type"
            expected="Sites in the USGS layer of known terrestrial analog sites score high for their own analog type."
          >
            <p>
              This event covers one test objective, navigation under low sun, so the layer&apos;s other analog types
              (volcanic, impact, polar) cannot be scored yet. It returns with the next objectives.
            </p>
          </CheckCard>
        </ul>
      </div>
    </section>
  );
}
