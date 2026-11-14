"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { MarkerSpec } from "@/components/globe/Globe";
import type { FocusRequest } from "@/components/globe/GlobeView";
import { HudChip, StateTag, sunState } from "@/components/planner/CompareHud";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";
import { formatClock, formatLat, formatMinutes, formatNumber, MONTHS, MONTHS_LONG, shortName } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import { ringSteps, ringTime, STORY_MONTH, windowMinutes, type RingStep, type StoryData } from "@/lib/story";
import { ringLimits, solarPosition, subsolarPoint } from "@/lib/sun";
import { useMediaQuery } from "@/lib/use-media";

const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), { ssr: false });

const TEXTURES = { day: "/textures/earth-day.jpg", night: "/textures/earth-night.jpg" };
const SITE_LABEL = { arizona: "Arizona test site", ellesmere: "Inland Ellesmere Island" } as const;
const HUD_NAME = { arizona: "Arizona", ellesmere: "Ellesmere" } as const;

/** "3 h 14" + "min", or "36" + "min": a duration split for a large number and its unit. */
function bigDuration(minutes: number): { value: string; unit: string } {
  const text = formatMinutes(minutes);
  const m = text.match(/^(.*?)\s*(min|h)$/);
  return m ? { value: m[1], unit: m[2] } : { value: text, unit: "" };
}

/**
 * The scroll story: a sticky globe whose camera and clock follow the text.
 * The ring sweeps the Earth, crosses Arizona in minutes, runs along Ellesmere
 * for hours, then tilts with the seasons.
 */
export function RingStory({ story }: { story: StoryData }) {
  const steps = useMemo(() => ringSteps(story), [story]);
  const [step, setStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wide = useMediaQuery("(min-width: 1024px)");

  // A step is current while it crosses a thin line: the middle of the screen
  // beside the globe on wide screens, the text area under the globe on phones.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: wide ? "-45% 0px -45% 0px" : "-72% 0px -24% 0px" },
    );
    for (const el of stepRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [wide]);

  const { target } = story;
  const az = windowMinutes(story.days.arizona.windows);
  const el = windowMinutes(story.days.ellesmere.windows);
  const azBig = bigDuration(az[0]);
  const elBig = bigDuration(el[0]);
  const band = `0–${formatNumber(target.band_max_deg)}°`;
  const date = `15 ${MONTHS_LONG[STORY_MONTH]}`;

  const copy: { eyebrow: [string, string]; body: ReactNode }[] = [
    {
      eyebrow: ["01", "The golden ring"],
      body: (
        <>
          <StepTitle>Where the Sun is as low as at {shortName(target.name)}</StepTitle>
          <StepText>
            At any moment the Sun stands {band} above the horizon only inside this thin ring, just inside the line
            between day and night. The ring sweeps around the Earth once a day.
          </StepText>
          <p className="mt-6 inline-flex items-center gap-2.5 font-mono text-xs text-ink-2">
            <RingSwatch /> Sun {band} above the horizon
          </p>
        </>
      ),
    },
    {
      eyebrow: ["02", shortName(story.sites.arizona.name)],
      body: (
        <>
          <BigNumber value={azBig.value} unit={`${azBig.unit}, twice a day`} />
          <StepText>
            On {date} the ring crosses the test site in {formatMinutes(az[0])} at dawn and again at dusk. A test needs{" "}
            {formatNumber(story.windowMinHours)} unbroken hours, so teams work at night, under lamps.
          </StepText>
        </>
      ),
    },
    {
      eyebrow: ["03", `${shortName(story.sites.ellesmere.name)} · ${formatLat(story.sites.ellesmere.lat, 0)}`],
      body: (
        <>
          <BigNumber value={elBig.value} unit={`${elBig.unit} in the morning`} />
          <StepText>
            and {formatMinutes(el[1])} in the evening. On the same day the ring runs along the High Arctic instead of
            across it. The real Sun skims the horizon for over {Math.floor(Math.min(...el) / 60)} hours, twice a day, over
            real terrain.
          </StepText>
        </>
      ),
    },
    {
      eyebrow: ["04", "A place at the right time"],
      body: (
        <>
          <StepTitle>The ring’s track moves with the seasons</StepTitle>
          <StepText>
            In midsummer the Sun stays high all day in the far north; in midwinter it stays below the horizon. Spring
            and autumn bring the ring over the High Arctic for hours. Each site has its own weeks, and then the weather
            decides how many of those hours you can use.
          </StepText>
          <Link
            href="/planner/"
            className="group mt-6 inline-flex items-center gap-2 text-sm text-sun no-underline hover:text-sun-pale"
          >
            Move the clock yourself in the planner
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </>
      ),
    },
  ];

  return (
    <section
      id="ring"
      aria-label="The low-sun ring"
      className="relative scroll-mt-(--header-h) border-t border-line [--stage-h:min(56svh,520px)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:[--stage-h:max(480px,calc(100svh-var(--header-h)))]"
    >
      <RingStage story={story} steps={steps} step={step} />

      <div className="relative pb-[24svh] lg:col-start-1 lg:row-start-1 lg:py-[16vh] lg:pr-12 lg:pl-[max(20px,calc((100vw-1240px)/2+20px))]">
        {copy.map((c, i) => (
          <div
            key={c.eyebrow[0]}
            ref={(node) => {
              stepRefs.current[i] = node;
            }}
            data-step={i}
            className="wrap flex min-h-[52svh] items-start pt-8 lg:min-h-[80vh] lg:w-auto lg:items-center lg:p-0"
          >
            <article
              className={cn(
                "max-w-[30rem] transition-opacity duration-500 ease-soft",
                step === i ? "opacity-100" : "opacity-35",
              )}
            >
              <Eyebrow accent={c.eyebrow[0]}>{c.eyebrow[1]}</Eyebrow>
              {c.body}
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3.5 max-w-[16ch] font-display text-[clamp(30px,3.3vw,48px)] leading-[1.04] tracking-[-0.01em]">
      {children}
    </h2>
  );
}

function StepText({ children }: { children: ReactNode }) {
  return <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-2 sm:text-base">{children}</p>;
}

function BigNumber({ value, unit }: { value: string; unit: string }) {
  return (
    <p className="mt-3 font-display text-[clamp(60px,7.4vw,112px)] leading-[0.9] tracking-[-0.02em] text-sun tabular-nums">
      {value}
      <small className="ml-2 font-sans text-[15px] tracking-normal text-ink-2">{unit}</small>
    </p>
  );
}

function RingSwatch() {
  return (
    <i
      aria-hidden="true"
      className="inline-block h-2 w-[26px] rounded bg-[linear-gradient(90deg,transparent,var(--color-sun)_30%,var(--color-sun-pale)_50%,var(--color-sun)_70%,transparent)] shadow-[0_0_10px_rgb(246_182_90/0.6)]"
    />
  );
}

/* ---------- the sticky globe ---------- */

function RingStage({ story, steps, step }: { story: StoryData; steps: RingStep[]; step: number }) {
  const reduced = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const current = steps[step];

  // Load the globe shortly before the section scrolls into view; render only while it is on screen.
  useEffect(() => {
    const el = stageRef.current?.parentElement;
    if (!el) return;
    const ahead = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "60% 0px" });
    const onScreen = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    ahead.observe(el);
    onScreen.observe(el);
    return () => {
      ahead.disconnect();
      onScreen.disconnect();
    };
  }, []);

  // A new request for every step: the globe flies to the step's view.
  const focus = useMemo<FocusRequest>(() => ({ ...steps[step].view, nonce: step }), [step, steps]);

  useEffect(() => {
    if (reduced || !visible) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setSeconds((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, visible, reduced]);

  const ms = ringTime(current.clock, reduced ? null : seconds);
  const subsolar = useMemo(() => subsolarPoint(ms), [ms]);
  const { target, sites } = story;
  const band = useMemo(() => ringLimits(target.band_max_deg, target.band_min_deg), [target]);

  const show = current.show;
  const markers = useMemo<MarkerSpec[]>(
    () =>
      (["arizona", "ellesmere"] as const).map((key) => ({
        id: key,
        lat: sites[key].lat,
        lon: sites[key].lon,
        label: SITE_LABEL[key],
        kind: "site",
        color: COLORS.sunPale,
        glow: 0.8,
        showLabel: show.includes(key),
      })),
    [sites, show],
  );

  const d = new Date(ms);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;

  return (
    <div
      ref={stageRef}
      className="sticky top-(--header-h) z-[2] h-(--stage-h) overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,var(--color-sky-1),var(--color-sky-0)_70%)] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-10 after:bg-linear-to-b after:from-transparent after:to-sky-0 lg:col-start-2 lg:row-start-1 lg:self-start lg:after:hidden"
    >
      {near && (
        <GlobeView
          body="earth"
          textures={TEXTURES}
          initialView={steps[0].view}
          subsolar={subsolar}
          band={band}
          markers={markers}
          focus={focus}
          active={visible}
          reducedMotion={reduced}
          interactive={false}
          label={`Earth with the band where the Sun is ${formatNumber(target.band_min_deg)} to ${formatNumber(target.band_max_deg)} degrees above the horizon`}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1.5 lg:top-auto lg:bottom-6 lg:left-6"
      >
        <HudChip>
          <RingSwatch />
          <b className="font-medium text-ink">
            {d.getUTCDate()} {MONTHS[d.getUTCMonth()]} {d.getUTCFullYear()}
          </b>
          {formatClock(hour)} UTC
        </HudChip>
        {show.map((key) => {
          const e = solarPosition(ms, sites[key].lat, sites[key].lon).apparentElevation;
          return (
            <HudChip key={key}>
              {HUD_NAME[key]} <b className="w-[5ch] text-right font-medium text-ink tabular-nums">{formatNumber(e, 1)}°</b>
              <StateTag state={sunState(e, target.band_max_deg, target.band_min_deg)} />
            </HudChip>
          );
        })}
      </div>
    </div>
  );
}
