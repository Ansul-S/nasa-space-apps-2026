"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FocusRequest } from "@/components/globe/GlobeView";
import type { MarkerSpec, PatchSpec } from "@/components/globe/Globe";
import { DownloadIcon } from "@/components/ui/Icons";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { presetId, type ChillChoice, type CloudChoice } from "@/lib/data";
import { downloadCsv, rankingCsv, rankingCsvName } from "@/lib/export";
import { lightingGapFillers } from "@/lib/gap-fillers";
import { formatClock, formatLatLon, formatNumber, MONTHS, MONTHS_LONG, shortName } from "@/lib/format";
import { MOON_FEATURES, targetFeature, type MoonFeature } from "@/lib/moon-features";
import { moonLight, moonSubsolarPoint, moonSunElevation } from "@/lib/moon-sun";
import { rampColor, rampGradient } from "@/lib/palette";
import { useMediaQuery } from "@/lib/use-media";
import {
  localHourOfUtc,
  monthPeaks,
  nearestSite,
  pointLight,
  rampPosition,
  rankSites,
  sunElevationAt,
  usableWindow,
  WINDOW_MIN_H,
  type PlannerData,
  type RankMode,
} from "@/lib/planner";
import type { SearchResult } from "@/lib/search";
import { clockMs, declinationAndEot, ringLimits, SAMPLE_YEAR, subsolarPoint } from "@/lib/sun";

import { ClockBar } from "./ClockBar";
import { SunHud, sunState } from "./CompareHud";
import { PlannerControls } from "./PlannerControls";
import { MoonCard, PlaceCard, SiteCard } from "./PointCard";
import { RankedList } from "./RankedList";
import { SearchBox } from "./SearchBox";

const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), { ssr: false });

const EARTH_TEXTURES = { day: "/textures/earth-day.jpg", night: "/textures/earth-night.jpg" };
const MOON_TEXTURES = {
  color: "/textures/moon-color.jpg",
  slope: "/textures/moon-slope.jpg",
  cap: "/textures/moon-slope-cap.jpg",
};
const EARTH_VIEW = { lat: 60, lon: -70, dist: 3.9 };
const MOON_VIEW = { lat: -35, lon: 20, dist: 4.4 };
/** Hours of the clock that one second of play covers. */
const PLAY_RATE = 1.6;

export type PatchBoxes = Record<string, { lat: number; lon: number; half_lat: number; half_lon: number }>;

type BodyMode = "earth" | "moon" | "compare";
type EarthSel = { kind: "site"; id: string } | { kind: "place"; name: string; detail: string; lat: number; lon: number };
interface MoonSel {
  name: string;
  lat: number;
  lon: number;
  feature: MoonFeature | null;
}

interface PlannerProps {
  data: PlannerData;
  patches: PatchBoxes;
  initial: { target: string; cloud: CloudChoice; chill: ChillChoice; month: number; hour: number; site: string };
}

let nonce = 0;
const focus = (lat: number, lon: number, dist?: number): FocusRequest => ({ lat, lon, dist, nonce: ++nonce });

/** The planner: one globe, one clock and a ranked list of sites for a lunar target. */
export function Planner({ data, patches, initial }: PlannerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const wide = useMediaQuery("(min-width: 1024px)");
  const [targetId, setTargetId] = useState(initial.target);
  const [cloud, setCloud] = useState<CloudChoice>(initial.cloud);
  const [chill, setChill] = useState<ChillChoice>(initial.chill);
  const [rank, setRank] = useState<RankMode>("month");
  const [month, setMonth] = useState(initial.month);
  const [hour, setHour] = useState(initial.hour);
  const [playing, setPlaying] = useState(false);
  const [body, setBody] = useState<BodyMode>("earth");
  const [moonOpened, setMoonOpened] = useState(false);
  const [earthSel, setEarthSel] = useState<EarthSel | null>({ kind: "site", id: initial.site });
  const [moonSel, setMoonSel] = useState<MoonSel | null>(null);
  const [cardOpen, setCardOpen] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [earthFocus, setEarthFocus] = useState<FocusRequest | null>(null);
  const [moonFocus, setMoonFocus] = useState<FocusRequest | null>(null);

  const preset = data.presets.find((p) => p.id === presetId(cloud, chill)) ?? data.presets[0];
  const target = data.targets.find((t) => t.id === targetId) ?? data.targets[0];
  const bandMax = target.band_max_deg;

  /* ---------- clock ---------- */

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setHour((h) => (h + dt * PLAY_RATE) % 24);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const ms = clockMs(month, hour);
  const earthSub = useMemo(() => subsolarPoint(ms), [ms]);
  const moonSub = useMemo(() => (moonOpened ? moonSubsolarPoint(ms) : { lat: 0, lon: 0 }), [ms, moonOpened]);
  const earthBand = useMemo(() => ringLimits(bandMax, target.band_min_deg), [bandMax, target.band_min_deg]);
  const moonBand = useMemo<[number, number]>(() => [target.band_min_deg, bandMax], [target.band_min_deg, bandMax]);

  /* ---------- ranking ---------- */

  const rows = useMemo(() => rankSites(data, targetId, preset.id, month, rank), [data, targetId, preset.id, month, rank]);
  const peaks = useMemo(() => monthPeaks(data, targetId, preset.id), [data, targetId, preset.id]);
  const topSite = rows[0]?.rank ? rows[0].site : null;
  const exportRanking = useCallback(() => {
    const q = { targetId, presetId: preset.id, month, mode: rank };
    downloadCsv(rankingCsvName(q), rankingCsv(data, rows, q, window.location.origin + window.location.pathname));
  }, [data, rows, targetId, preset.id, month, rank]);
  const siteById = useCallback((id: string) => data.sites.find((s) => s.id === id), [data.sites]);

  /* ---------- selection ---------- */

  const showEarth = useCallback(() => setBody((b) => (b === "moon" ? "earth" : b)), []);

  const selectSite = useCallback(
    (id: string, fly = true) => {
      const s = siteById(id);
      if (!s) return;
      setEarthSel({ kind: "site", id });
      setCardOpen(true);
      showEarth();
      if (fly) setEarthFocus(focus(s.lat, s.lon, 2.4));
    },
    [siteById, showEarth],
  );

  const selectPlace = useCallback(
    (place: { name: string; detail: string; lat: number; lon: number }, fly = true) => {
      setEarthSel({ kind: "place", ...place });
      setCardOpen(true);
      showEarth();
      if (fly) setEarthFocus(focus(place.lat, place.lon, 2.3));
    },
    [showEarth],
  );

  const openMoon = useCallback((mode: BodyMode = "moon") => {
    setMoonOpened(true);
    setBody(mode);
  }, []);

  const selectMoon = useCallback(
    (sel: MoonSel, fly = true) => {
      setMoonSel(sel);
      setCardOpen(true);
      setMoonOpened(true);
      setBody((b) => (b === "earth" ? "moon" : b));
      if (fly) setMoonFocus(focus(sel.lat, sel.lon, sel.lat < -80 ? 1.55 : 1.8));
    },
    [],
  );

  const onBody = (b: BodyMode) => {
    if (b !== "earth" && !moonOpened) {
      const f = targetFeature(targetId);
      if (!moonSel) setMoonSel({ name: f.name, lat: f.lat, lon: f.lon, feature: f });
      setMoonFocus(focus(f.lat, f.lon, 1.7));
    }
    if (b === "earth") setBody("earth");
    else openMoon(b);
    setCardOpen(true);
  };

  const onSearch = (r: SearchResult) => {
    if (r.kind === "site") selectSite(r.site.id);
    else if (r.kind === "moon") selectMoon({ name: r.feature.name, lat: r.feature.lat, lon: r.feature.lon, feature: r.feature });
    else selectPlace(r.place);
  };

  const onEarthPick = useCallback(
    (p: { lat: number; lon: number }) => selectPlace({ name: "Picked point", detail: "", lat: p.lat, lon: p.lon }, false),
    [selectPlace],
  );
  const onMoonPick = useCallback(
    (p: { lat: number; lon: number }) => selectMoon({ name: "Picked point", lat: p.lat, lon: p.lon, feature: null }, false),
    [selectMoon],
  );
  const onMoonMarker = useCallback(
    (id: string) => {
      const f = MOON_FEATURES.find((x) => x.id === id);
      if (f) selectMoon({ name: f.name, lat: f.lat, lon: f.lon, feature: f });
    },
    [selectMoon],
  );
  const onEarthMarker = useCallback(
    (id: string) => {
      if (id === "__place") setCardOpen(true);
      else selectSite(id);
    },
    [selectSite],
  );

  /* ---------- markers ---------- */

  const selectedSiteId = earthSel?.kind === "site" ? earthSel.id : null;
  const earthMarkers = useMemo<MarkerSpec[]>(() => {
    const top = new Set(rows.filter((r) => r.rank && r.rank <= 3).map((r) => r.site.id));
    const list: MarkerSpec[] = rows.map((r) => {
      const t = Math.min(1, rampPosition(r, data, month, rank));
      const zero = r.rank === null;
      return {
        id: r.site.id,
        lat: r.site.lat,
        lon: r.site.lon,
        label: shortName(r.site.name),
        description: `${r.site.name}: ${formatNumber(r.value, 1)} ${rank === "best" ? "expected usable days in the best window" : `usable days per ${data.campaignDays}`}`,
        kind: "site",
        color: zero ? undefined : rampColor(t),
        glow: zero ? 0 : 0.35 + 0.65 * t,
        zero,
        showLabel: top.has(r.site.id) || r.site.id === hoverId,
        selected: r.site.id === selectedSiteId,
        priority: r.site.id === selectedSiteId ? 100 : r.site.id === hoverId ? 90 : r.rank ? 50 - r.rank : 0,
      };
    });
    if (earthSel?.kind === "place") {
      list.push({
        id: "__place",
        lat: earthSel.lat,
        lon: earthSel.lon,
        label: earthSel.name === "Picked point" ? formatLatLon(earthSel.lat, earthSel.lon, 1) : earthSel.name,
        kind: "place",
        showLabel: true,
        selected: true,
        priority: 100,
      });
    }
    return list;
  }, [rows, data, month, rank, hoverId, selectedSiteId, earthSel]);

  const moonMarkers = useMemo<MarkerSpec[]>(() => {
    const list: MarkerSpec[] = MOON_FEATURES.map((f) => ({
      id: f.id,
      lat: f.lat,
      lon: f.lon,
      label: f.name,
      description: `${f.name}, ${f.note}`,
      kind: f.kind === "target" ? "moon-target" : "moon-feature",
      showLabel: f.kind === "target" || moonSel?.feature?.id === f.id,
      selected: moonSel?.feature ? moonSel.feature.id === f.id : f.target === targetId && !moonSel,
      priority: moonSel?.feature?.id === f.id ? 100 : f.target === targetId ? 80 : f.kind === "target" ? 60 : 0,
    }));
    if (moonSel && !moonSel.feature) {
      list.push({
        id: "__point",
        lat: moonSel.lat,
        lon: moonSel.lon,
        label: formatLatLon(moonSel.lat, moonSel.lon, 1),
        kind: "place",
        showLabel: true,
        selected: true,
      });
    }
    return list;
  }, [targetId, moonSel]);

  const patch = useMemo<PatchSpec | null>(() => {
    const box = selectedSiteId ? patches[selectedSiteId] : undefined;
    return box && selectedSiteId
      ? { url: `/textures/earth-site-${selectedSiteId}.jpg`, lat: box.lat, lon: box.lon, halfLat: box.half_lat, halfLon: box.half_lon }
      : null;
  }, [selectedSiteId, patches]);

  /* ---------- cards ---------- */

  const earthPoint = useMemo(() => {
    if (earthSel?.kind === "site") {
      const s = siteById(earthSel.id);
      return s ? { name: shortName(s.name), lat: s.lat, lon: s.lon } : null;
    }
    return earthSel ? { name: earthSel.name === "Picked point" ? "the picked point" : earthSel.name, lat: earthSel.lat, lon: earthSel.lon } : null;
  }, [earthSel, siteById]);

  const placeLight = useMemo(
    () => (earthSel?.kind === "place" ? pointLight(earthSel.lat, earthSel.lon, month, bandMax, target.band_min_deg) : null),
    [earthSel, month, bandMax, target.band_min_deg],
  );
  const placeNearest = useMemo(
    () => (earthSel?.kind === "place" ? nearestSite(data.sites, earthSel.lat, earthSel.lon) : null),
    [earthSel, data.sites],
  );

  // Gap-filler: where to get the light when the place fails the 2-hour test this month,
  // or the calculated site has no usable window at all.
  const selectedRow = selectedSiteId ? rows.find((r) => r.site.id === selectedSiteId) : undefined;
  const lacksLight =
    earthSel?.kind === "place"
      ? !!placeLight && placeLight.longestHours < WINDOW_MIN_H
      : !!selectedRow && !usableWindow(selectedRow.scores.best_window);
  const gapAt = earthSel?.kind === "place" ? earthSel : selectedRow?.site;
  const gap = useMemo(
    () =>
      lacksLight && gapAt
        ? lightingGapFillers(data, {
            targetId,
            presetId: preset.id,
            lat: gapAt.lat,
            lon: gapAt.lon,
            month,
            excludeId: selectedSiteId ?? undefined,
          })
        : null,
    [lacksLight, gapAt, data, targetId, preset.id, month, selectedSiteId],
  );

  const moonPlace = moonSel ?? (() => {
    const f = targetFeature(targetId);
    return { name: f.name, lat: f.lat, lon: f.lon, feature: f };
  })();
  const moonPeriodStart = Date.UTC(SAMPLE_YEAR, month, 1);
  const moonLit = useMemo(
    () => (moonOpened ? moonLight(moonPlace.lat, moonPlace.lon, bandMax, moonPeriodStart, target.band_min_deg) : null),
    [moonOpened, moonPlace.lat, moonPlace.lon, bandMax, moonPeriodStart, target.band_min_deg],
  );

  const compareSite = earthPoint ?? (() => {
    const s = siteById(initial.site)!;
    return { name: shortName(s.name), lat: s.lat, lon: s.lon };
  })();

  let card: React.ReactNode = null;
  if (body === "earth" && earthSel?.kind === "site") {
    const row = rows.find((r) => r.site.id === earthSel.id);
    if (row)
      card = (
        <SiteCard
          site={row.site}
          scores={row.scores}
          bandHours={data.bandHours[targetId][row.site.id]}
          data={data}
          target={target}
          month={month}
          topSite={topSite}
          gap={gap}
          onFly={selectSite}
          onClose={() => setCardOpen(false)}
        />
      );
  } else if (body === "earth" && earthSel?.kind === "place" && placeLight && placeNearest) {
    card = (
      <PlaceCard
        name={earthSel.name}
        detail={earthSel.detail}
        lat={earthSel.lat}
        lon={earthSel.lon}
        light={placeLight}
        target={target}
        month={month}
        sunNow={sunElevationAt(earthSel.lat, earthSel.lon, month, hour)}
        nearest={placeNearest}
        siteCount={data.sites.length}
        campaignDays={data.campaignDays}
        gap={gap}
        onFly={selectSite}
        onClose={() => setCardOpen(false)}
      />
    );
  } else if (body === "moon" && moonLit) {
    card = (
      <MoonCard
        name={moonPlace.name}
        feature={moonPlace.feature}
        lat={moonPlace.lat}
        lon={moonPlace.lon}
        light={moonLit}
        sunNow={moonSunElevation(ms, moonPlace.lat, moonPlace.lon)}
        target={target}
        terrain={(() => {
          const stats = data.targets.find((t) => t.id === moonPlace.feature?.target)?.terrain;
          return stats && data.terrain ? { stats, boxKm: data.terrain.box_km } : null;
        })()}
        periodLabel={`Over one lunar day from 1 ${MONTHS[month]} ${SAMPLE_YEAR}`}
        compareWith={compareSite.name}
        onCompare={() => {
          if (moonPlace.feature?.target) setTargetId(moonPlace.feature.target);
          setBody("compare");
        }}
        onClose={() => setCardOpen(false)}
      />
    );
  }

  /* ---------- compare HUD ---------- */

  const hudTarget = targetFeature(targetId);
  const earthEl = sunElevationAt(compareSite.lat, compareSite.lon, month, hour);
  const moonEl = moonOpened ? moonSunElevation(ms, hudTarget.lat, hudTarget.lon) : 0;
  const earthRate = 15.041 * Math.cos(declinationAndEot(ms).declination);

  const localNote = earthPoint && body !== "moon" ? `${formatClock(localHourOfUtc(hour, earthPoint.lon))} solar time at ${earthPoint.name}` : null;
  const split = body === "compare";
  // On wide screens the card floats over the right of the globe; keep the selection clear of it.
  const centerOffset = wide && !split && cardOpen && card ? 190 : 0;

  return (
    <div className="grid lg:h-[calc(100dvh-var(--header-h))] lg:min-h-[640px] lg:grid-cols-[400px_minmax(0,1fr)]">
      <h1 className="sr-only">Planner: rank Earth sites for a lunar South Pole test</h1>

      {/* ---------- side: controls and ranked list ---------- */}
      <aside className="order-2 flex min-h-0 flex-col bg-sky-0 max-lg:border-t max-lg:border-line lg:order-1 lg:border-r lg:border-line">
        <div className="border-b border-line px-[max(18px,env(safe-area-inset-left,0px))] pt-[18px] pb-3.5 pr-[18px]">
          <PlannerControls
            objective={data.objective}
            targets={data.targets}
            target={targetId}
            onTarget={setTargetId}
            cloud={cloud}
            onCloud={setCloud}
            chill={chill}
            onChill={setChill}
            rank={rank}
            onRank={setRank}
            warning={preset.warning}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-[max(18px,env(safe-area-inset-left,0px))] pt-3 pr-[18px] pb-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h2 className="text-[13px] font-medium">{rank === "best" ? "Best window of the year" : `Ranked for ${MONTHS_LONG[month]}`}</h2>
            <span className="eyebrow">{rank === "best" ? `expected days of ${data.campaignDays}` : `usable days per ${data.campaignDays}`}</span>
          </div>
          <button
            type="button"
            onClick={exportRanking}
            aria-label="Download this ranking as CSV"
            title="Download this ranking as CSV"
            className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] text-ink-2 transition-colors duration-200 hover:border-line-2 hover:text-ink"
          >
            <DownloadIcon size={12} />
            CSV
          </button>
        </div>
        <div className="min-h-0 flex-1 px-2.5 pb-5 lg:overflow-y-auto">
          <RankedList rows={rows} data={data} mode={rank} month={month} selectedId={selectedSiteId} onSelect={selectSite} onHover={setHoverId} />
          <p className="mx-2.5 mt-4 text-[11.5px] leading-normal text-ink-3">
            {rank === "best"
              ? "Expected usable days in the best 14-day window, each year scored on a window chosen without it."
              : `Average usable days in a ${data.campaignDays}-day campaign in ${MONTHS_LONG[month]}, ${data.years[0]}–${data.years[1]}. Median and bad-to-good-year range for campaigns starting that month.`}
          </p>
        </div>
      </aside>

      {/* ---------- stage: globes, search, clock, card ---------- */}
      <section className="relative order-1 min-w-0 lg:order-2" aria-label="Globe">
        <div
          className={cn(
            "relative min-h-[460px] overflow-hidden bg-[radial-gradient(80%_70%_at_60%_45%,#0b1220_0%,var(--color-sky-0)_70%)] lg:h-full",
            split ? "h-[min(96svh,860px)]" : "h-[min(70svh,660px)]",
          )}
        >
          <div className={cn("absolute inset-0", split && "max-lg:bottom-1/2 lg:right-1/2", body === "moon" && "hidden")}>
            <GlobeView
              body="earth"
              textures={EARTH_TEXTURES}
              initialView={EARTH_VIEW}
              subsolar={earthSub}
              band={earthBand}
              markers={earthMarkers}
              patch={patch}
              focus={earthFocus}
              active={body !== "moon"}
              centerOffset={body === "earth" ? centerOffset : 0}
              reducedMotion={reducedMotion}
              onMarker={onEarthMarker}
              onPick={onEarthPick}
              label="Interactive 3D Earth with the low-sun ring"
            />
          </div>
          {moonOpened && (
            <div
              className={cn(
                "absolute inset-0",
                split && "border-line-2 max-lg:top-1/2 max-lg:border-t lg:left-1/2 lg:border-l",
                body === "earth" && "hidden",
              )}
            >
              <GlobeView
                body="moon"
                textures={MOON_TEXTURES}
                initialView={MOON_VIEW}
                subsolar={moonSub}
                band={moonBand}
                markers={moonMarkers}
                focus={moonFocus}
                active={body !== "earth"}
                centerOffset={body === "moon" ? centerOffset : 0}
                reducedMotion={reducedMotion}
                onMarker={onMoonMarker}
                onPick={onMoonPick}
                label="Interactive 3D Moon with the low-sun band around the South Pole"
              />
            </div>
          )}

          {/* top bar */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[7] flex flex-wrap items-start gap-2.5 sm:inset-x-4 sm:top-4 [&>*]:pointer-events-auto">
            <SearchBox
              sites={data.sites}
              features={MOON_FEATURES}
              moonFirst={body === "moon"}
              onSelect={onSearch}
              className="w-full sm:w-[min(360px,calc(100%-250px))]"
            />
            <Segmented<BodyMode>
              label="Globe"
              value={body}
              onChange={onBody}
              className="glass rounded-xl p-1"
              options={[
                { value: "earth", label: "Earth" },
                { value: "moon", label: "Moon" },
                { value: "compare", label: "Compare" },
              ]}
            />
          </div>

          {/* compare HUDs */}
          {split && (
            <>
              <SunHud
                title={`Earth · ${compareSite.name}`}
                elevation={earthEl}
                state={sunState(earthEl, bandMax, target.band_min_deg)}
                rate={`Sun crosses the sky at ${formatNumber(earthRate, 1)}°/h`}
                className="absolute top-[118px] left-3 z-[4] sm:top-[76px] sm:left-4"
              />
              <SunHud
                title={`Moon · ${hudTarget.name}`}
                elevation={moonEl}
                state={sunState(moonEl, bandMax, target.band_min_deg)}
                rate={`${formatNumber(target.sun_rate_deg_per_h, 2)}°/h · one lunar day is 29.5 Earth days`}
                className="absolute top-[calc(50%+12px)] left-3 z-[4] lg:top-[76px] lg:left-[calc(50%+16px)]"
              />
            </>
          )}

          {/* legend */}
          {!split && (
            <div className="absolute right-4 bottom-[100px] z-[4] hidden flex-col gap-2 rounded-[10px] border border-line bg-sky-1/70 px-3 py-2.5 text-[11.5px] text-ink-2 backdrop-blur-[6px] lg:flex">
              <div className="flex items-center gap-2">
                <i
                  aria-hidden="true"
                  className="h-2 w-[26px] rounded bg-[linear-gradient(90deg,transparent,var(--color-sun)_30%,var(--color-sun-pale)_50%,var(--color-sun)_70%,transparent)] shadow-[0_0_10px_rgb(246_182_90/0.6)]"
                />
                Sun {formatNumber(target.band_min_deg)}–{formatNumber(bandMax)}° above the horizon now
              </div>
              {body === "earth" && (
                <div className="flex flex-col gap-1">
                  <span>Share of usable days in the month</span>
                  <div className="h-2 w-[150px] rounded" style={{ background: rampGradient() }} />
                  <div className="flex w-[150px] justify-between font-mono text-[10px] text-ink-3">
                    <span>0</span>
                    <span>{Math.round(data.maxScore * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* clock */}
          <div className="absolute inset-x-3 bottom-3 z-[5] sm:inset-x-4 sm:bottom-4">
            <ClockBar
              month={month}
              onMonth={setMonth}
              hour={hour}
              onHour={(h) => {
                setPlaying(false);
                setHour(h);
              }}
              playing={playing}
              onPlay={setPlaying}
              peaks={peaks}
              maxScore={data.maxScore}
              localNote={localNote}
            />
          </div>
        </div>

        {/* card: floats over the globe on large screens, sits under it on small ones */}
        <AnimatePresence>
          {card && cardOpen && !split && (
            <motion.div
              key={body === "moon" ? "moon" : earthSel?.kind ?? "none"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.22, 0.8, 0.24, 1] }}
              className="z-[6] border-b border-line bg-sky-1 p-[18px] lg:glass lg:absolute lg:top-[72px] lg:right-4 lg:max-h-[calc(100%-72px-200px)] lg:w-[360px] lg:overflow-y-auto lg:rounded-[14px] lg:border lg:shadow-[0_20px_60px_-20px_rgb(0_0_0/0.9)]"
            >
              {card}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
