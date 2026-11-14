import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export type SunState = "below" | "in" | "above";

export const sunState = (elevation: number, bandMax: number, bandMin = 0): SunState =>
  elevation < bandMin ? "below" : elevation <= bandMax ? "in" : "above";

const STATE_LABEL: Record<SunState, string> = { below: "Below horizon", in: "In band", above: "Above band" };

export function StateTag({ state }: { state: SunState }) {
  return (
    <span
      className={cn(
        "rounded border px-[7px] py-0.5 font-mono text-[10.5px] tracking-[0.1em] uppercase",
        state === "in" ? "border-sun bg-sun text-ink-on-sun" : "border-line-2 text-ink-3",
      )}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

export function HudChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex w-max max-w-full items-center gap-2.5 rounded-lg border border-line-2 bg-sky-0/80 px-3 py-2 font-mono text-xs text-ink-2 backdrop-blur-[6px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface HudProps {
  title: string;
  elevation: number;
  state: SunState;
  rate: string;
  className?: string;
}

/** Sun elevation now at one place, with whether it sits in the band. */
export function SunHud({ title, elevation, state, rate, className }: HudProps) {
  return (
    <div className={cn("pointer-events-none flex flex-col gap-1.5", className)}>
      <HudChip className="text-[10.5px] tracking-[0.14em] text-ink-3 uppercase">{title}</HudChip>
      <HudChip>
        Sun <b className="font-medium text-ink">{formatNumber(elevation, 1)}°</b> <StateTag state={state} />
      </HudChip>
      <HudChip className="max-sm:hidden">{rate}</HudChip>
    </div>
  );
}
