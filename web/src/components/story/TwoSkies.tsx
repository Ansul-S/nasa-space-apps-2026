"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { SunChart } from "@/components/charts/SunChart";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { formatDate, formatMinutes, formatNumber, shortName } from "@/lib/format";
import { sunWindows, windowClock } from "@/lib/site-view";
import type { StoryData } from "@/lib/story";

import { SectionHead } from "./SectionHead";

type Sky = "arizona" | "ellesmere";

/**
 * The same day at both sites on one sun chart. It opens on Arizona and turns
 * to Ellesmere once the chart is in view, unless the reader has chosen.
 */
export function TwoSkies({ story }: { story: StoryData }) {
  const reduced = useReducedMotion() ?? false;
  const [sky, setSky] = useState<Sky>("arizona");
  const chosen = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => !chosen.current && setSky("ellesmere"), reduced ? 0 : 1100);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const { target } = story;
  const day = story.days[sky];
  const windows = sunWindows(day.windows);
  const band = `0–${formatNumber(target.band_max_deg)}°`;

  return (
    <section aria-labelledby="skies-title" className="border-t border-line py-[clamp(88px,14vh,140px)]">
      <div className="wrap">
        <SectionHead
          id="skies-title"
          eyebrow={`Sun elevation · ${formatDate(day.date)} · local solar time`}
          title="Same day, two skies"
        >
          The gold band is the {shortName(target.name)} range, {band}. Bright segments are the minutes the Sun spends
          inside it. Elevation is apparent, with refraction, over a flat horizon.
        </SectionHead>

        <Panel className="reveal px-3 pt-4 pb-3 sm:px-5.5 sm:pt-5.5">
          <div ref={box} className="flex flex-wrap items-center justify-between gap-4 px-1">
            <Segmented<Sky>
              label="Site"
              value={sky}
              onChange={(v) => {
                chosen.current = true;
                setSky(v);
              }}
              options={[
                { value: "arizona", label: "Arizona" },
                { value: "ellesmere", label: "Inland Ellesmere" },
              ]}
            />
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2">
              <span className="inline-flex items-center gap-2">
                <i aria-hidden="true" className="h-2.5 w-3.5 rounded-[2px] bg-sun/20 shadow-[inset_0_0_0_1px_rgb(246_182_90/0.6)]" />
                Target band {band}
              </span>
              <span className="inline-flex items-center gap-2">
                <i aria-hidden="true" className="h-[3px] w-3.5 rounded-full bg-sun" />
                Sun in the band
              </span>
            </div>
          </div>
          <SunChart
            className="mt-3 h-60 sm:h-[340px]"
            elevation={day.elevation}
            stepMin={story.stepMin}
            bandMax={target.band_max_deg}
            bandMin={target.band_min_deg}
            windows={windows}
          />
          <p aria-live="polite" className="mt-2 px-1 font-mono text-[11.5px] text-ink-3">
            {shortName(story.sites[sky].name)}, in the band:{" "}
            {windows.map((w, i) => (
              <span key={w.start}>
                {i > 0 && " and "}
                <span className="text-ink-2">{windowClock(w, windows)}</span> ({formatMinutes(w.minutes)})
              </span>
            ))}
          </p>
        </Panel>
      </div>
    </section>
  );
}
