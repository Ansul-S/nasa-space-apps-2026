import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "info" | "warn";

const TONES: Record<Tone, string> = {
  info: "border-ice/30 bg-ice/[0.06]",
  warn: "border-rose/35 bg-rose/[0.06]",
};

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 flex-none text-ice">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7v4.2M8 4.8v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WarnIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={cn("mt-0.5 flex-none", className)}>
      <path d="M7 1.5 13 12.5H1z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 5.5v3.2M7 10.4v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface CalloutProps {
  tone?: Tone;
  /** Bold lead sentence. */
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A data caveat the reader must see: weather-cell notes, the −40 °C warning. */
export function Callout({ tone = "info", title, children, className }: CalloutProps) {
  return (
    <div
      role="note"
      className={cn("flex items-start gap-3.5 rounded-[10px] border px-4 py-3.5 text-[13.5px] text-ink-2", TONES[tone], className)}
    >
      {tone === "warn" ? <WarnIcon className="text-rose" /> : <InfoIcon />}
      <div>
        {title != null && (
          <>
            <b className="font-medium text-ink">{title}</b>{" "}
          </>
        )}
        {children}
      </div>
    </div>
  );
}
