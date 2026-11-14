import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { Tag } from "@/components/ui/Tag";
import { DEFAULT_CHILL, DEFAULT_CLOUD, DEFAULT_TARGET, getPreset, getSite, getTarget, presetId } from "@/lib/data";
import { loadIndex, loadSite } from "@/lib/data.server";
import { formatDayRange, formatLatLon, formatNumber, formatPercent, formatRange, humanize, shortName } from "@/lib/format";

export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await loadIndex();
  return index.sites.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params;
  const site = getSite(await loadIndex(), id);
  return site ? { title: site.name, description: `Low-sun analog analysis for ${site.name}, ${site.region}.` } : {};
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params;
  const index = await loadIndex();
  if (!getSite(index, id)) notFound();
  const detail = await loadSite(id);
  const { site } = detail;

  const target = getTarget(index, DEFAULT_TARGET);
  const preset = getPreset(index, presetId(DEFAULT_CLOUD, DEFAULT_CHILL));
  const best = detail.targets[target.id].presets[preset.id].best_window;
  const cell = detail.grid.merra2_cell;
  // A window with no expected usable days is shown, but not highlighted as an answer.
  const useful = !!best && best.held_out_mean > 0;

  return (
    <div className="wrap">
      <div className="grid items-end gap-10 pt-11 pb-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
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

        <Panel tone={useful ? "sun" : "default"} className="px-6 py-5.5">
          <Eyebrow accent={useful ? "Best window" : undefined}>
            {useful ? shortName(target.name) : `Best window · ${shortName(target.name)}`}
          </Eyebrow>
          {best ? (
            <>
              <div
                className={cn(
                  "mt-2.5 font-display text-[clamp(36px,3.6vw,52px)] leading-none",
                  useful ? "text-sun-pale" : "text-ink-2",
                )}
              >
                {formatDayRange(best.start, best.end)}
              </div>
              <div className="mt-4 flex flex-wrap gap-5.5 border-t border-line pt-3.5">
                <Stat
                  tone={useful ? "sun" : "muted"}
                  value={formatNumber(best.held_out_mean)}
                  label={`usable days of ${index.campaign_days}, expected`}
                />
                <Stat value={formatRange(best.p10, best.p90)} label="bad year – good year" />
                <Stat value={formatPercent(best.p_at_least)} label={`chance of ${index.min_usable_days} or more`} />
              </div>
              <p className="mt-3 text-[11.5px] text-ink-3">
                {index.campaign_days}-day campaign · {preset.label}
              </p>
            </>
          ) : (
            <>
              <div className="mt-2.5 font-display text-[clamp(36px,3.6vw,52px)] leading-none text-ink-3">
                No usable window
              </div>
              <p className="mt-4 border-t border-line pt-3.5 text-[13px] text-ink-2">
                The Sun never stays in the 0–{formatNumber(target.band_max_deg)}° band for 2 hours. This is why tests
                here use lamps at night.
              </p>
            </>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-3 pb-24">
        {cell.class !== "representative" && (
          <Callout
            tone={cell.class === "not_representative" ? "warn" : "info"}
            title={`Weather grid cell ${humanize(cell.class)}: ${formatPercent(cell.land)} bare land, ${formatPercent(cell.land_ice)} ice, ${formatPercent(cell.ocean)} ocean.`}
          >
            {cell.note}
          </Callout>
        )}
        {detail.snow_note && <Callout title="Snow cover.">{detail.snow_note}</Callout>}
      </div>
    </div>
  );
}
