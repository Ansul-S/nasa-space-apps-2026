import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { DEFAULT_CHILL, DEFAULT_CLOUD, DEFAULT_TARGET, FEATURED_SITE, getTarget, presetId, scoresFor } from "@/lib/data";
import { loadIndex, loadSite } from "@/lib/data.server";
import { formatDayRange, formatMinutes, formatNumber, formatPercent, MONTHS_LONG, shortName } from "@/lib/format";

const SAMPLE_MONTH = 8; // September

export default async function Home() {
  const index = await loadIndex();
  const target = getTarget(index, DEFAULT_TARGET);
  const [arizona, ellesmere] = await Promise.all([loadSite("sf-volcanic-field"), loadSite(FEATURED_SITE)]);
  const durations = (windows: [number, number][]) => windows.map(([a, b]) => b - a);
  const az = durations(arizona.sun_samples.months[SAMPLE_MONTH].windows[target.id]);
  const el = durations(ellesmere.sun_samples.months[SAMPLE_MONTH].windows[target.id]);
  const best = scoresFor(index, target.id, presetId(DEFAULT_CLOUD, DEFAULT_CHILL), FEATURED_SITE).best_window;

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-420px] left-1/2 -z-10 h-[600px] w-[1400px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(255_138_61/0.28),rgb(246_182_90/0.08)_55%,transparent_75%)]"
      />
      <div className="wrap pt-[clamp(72px,12vh,140px)] pb-[clamp(96px,16vh,160px)]">
        <Eyebrow>For field-test leads planning Artemis surface tests</Eyebrow>
        <h1 className="mt-5 max-w-[14ch] font-display text-[clamp(44px,6.2vw,92px)] leading-[0.98] tracking-[-0.012em]">
          Find your place, at <em className="text-sun-pale">the right time</em>.
        </h1>
        <p className="mt-6 max-w-[56ch] text-[clamp(16px,1.35vw,19px)] leading-relaxed text-ink-2">
          At {shortName(target.name)}, a candidate Artemis III region near the lunar South Pole, the Sun never climbs
          above {formatNumber(target.band_max_deg)}°. On 15 {MONTHS_LONG[SAMPLE_MONTH]} the Sun at the Arizona test
          site passes through that band in <strong className="font-medium text-ink">{formatMinutes(az[0])}</strong>,
          at dawn and at dusk. Inland Ellesmere Island holds it for{" "}
          <strong className="font-medium text-ink">{formatMinutes(el[0])}</strong>.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/planner/" variant="primary">
            Open the planner <Arrow />
          </ButtonLink>
          <ButtonLink href={`/sites/${FEATURED_SITE}/`}>See Inland Ellesmere Island</ButtonLink>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Panel className="p-6">
            <Eyebrow>Arizona · 15 {MONTHS_LONG[SAMPLE_MONTH]}</Eyebrow>
            <Stat className="mt-3" size="md" value={formatMinutes(az[0])} unit={`× ${az.length} a day`} />
            <p className="mt-3 text-sm text-ink-2">Too short for a 2-hour test, so teams work at night under lamps.</p>
          </Panel>
          <Panel className="p-6">
            <Eyebrow>Inland Ellesmere · 15 {MONTHS_LONG[SAMPLE_MONTH]}</Eyebrow>
            <Stat className="mt-3" size="md" value={formatMinutes(el[0])} unit={`× ${el.length} a day`} />
            <p className="mt-3 text-sm text-ink-2">The real Sun skims the horizon for hours over real terrain.</p>
          </Panel>
          {best && (
            <Panel tone="sun" className="p-6">
              <Eyebrow accent="Best window">{formatDayRange(best.start, best.end)}</Eyebrow>
              <Stat
                className="mt-3"
                size="md"
                tone="sun"
                value={formatNumber(best.held_out_mean)}
                unit={`of ${index.campaign_days} days`}
              />
              <p className="mt-3 text-sm text-ink-2">
                Expected usable days in a {index.campaign_days}-day campaign. Bad year {formatNumber(best.p10, 0)},
                good year {formatNumber(best.p90, 0)}, and a {formatPercent(best.p_at_least)} chance of at least{" "}
                {index.min_usable_days}.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
