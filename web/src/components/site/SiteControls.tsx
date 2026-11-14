"use client";

import { Segmented, type SegmentOption } from "@/components/ui/Segmented";
import type { ChillChoice, CloudChoice, Target } from "@/lib/data";
import { MONTHS_LONG } from "@/lib/format";
import { shortTarget } from "@/lib/site-view";

interface SiteControlsProps {
  targets: Target[];
  target: string;
  onTarget: (id: string) => void;
  cloud: CloudChoice;
  onCloud: (c: CloudChoice) => void;
  chill: ChillChoice;
  onChill: (c: ChillChoice) => void;
  month: number;
  onMonth: (m: number) => void;
}

const CLOUD: SegmentOption<CloudChoice>[] = [
  { value: "strict", label: "≤30%" },
  { value: "relaxed", label: "≤50%" },
];

const CHILL: SegmentOption<ChillChoice>[] = [
  { value: "28", label: "≥ −28 °C" },
  { value: "40", label: "≥ −40 °C" },
];

function Label({ children }: { children: string }) {
  return <span className="eyebrow min-w-[78px] sm:min-w-0">{children}</span>;
}

/** Target, test limits and month, kept in view while the page scrolls. */
export function SiteControls(p: SiteControlsProps) {
  const targetOptions = p.targets.map((t) => ({ value: t.id, label: shortTarget(t).replace(/ Massif$/, "") }));
  const step = (d: number) => p.onMonth((p.month + d + 12) % 12);

  return (
    <div className="z-30 border-y border-line bg-sky-0/88 backdrop-blur-[10px] md:sticky md:top-(--header-h)">
      <div className="wrap flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-2.5">
            <Label>Target</Label>
            <Segmented size="sm" label="Lunar target" options={targetOptions} value={p.target} onChange={p.onTarget} />
          </div>
          <div className="flex items-center gap-2.5">
            <Label>Cloud</Label>
            <Segmented size="sm" label="Cloud limit" options={CLOUD} value={p.cloud} onChange={p.onCloud} />
          </div>
          <div className="flex items-center gap-2.5">
            <Label>Wind chill</Label>
            <Segmented size="sm" label="Wind chill limit" options={CHILL} value={p.chill} onChange={p.onChill} />
          </div>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Month">
          <StepButton label="Previous month" onClick={() => step(-1)} d="M7.5 2.5 4 6l3.5 3.5" />
          <span className="min-w-[92px] text-center font-mono text-[12px] tracking-[0.06em] text-ink" aria-live="polite">
            {MONTHS_LONG[p.month]}
          </span>
          <StepButton label="Next month" onClick={() => step(1)} d="M4.5 2.5 8 6 4.5 9.5" />
        </div>
      </div>
    </div>
  );
}

function StepButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-7.5 cursor-pointer place-items-center rounded-full border border-line text-ink-2 transition-colors duration-200 hover:border-line-2 hover:text-ink"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
