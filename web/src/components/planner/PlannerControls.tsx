"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { WarnIcon } from "@/components/ui/Callout";
import { Segmented } from "@/components/ui/Segmented";
import type { ChillChoice, CloudChoice, Target } from "@/lib/data";
import { shortName } from "@/lib/format";
import type { RankMode } from "@/lib/planner";

interface PlannerControlsProps {
  objective: string;
  targets: Target[];
  target: string;
  onTarget: (id: string) => void;
  cloud: CloudChoice;
  onCloud: (v: CloudChoice) => void;
  chill: ChillChoice;
  onChill: (v: ChillChoice) => void;
  rank: RankMode;
  onRank: (v: RankMode) => void;
  warning: string | null;
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-2.5">
      <span className="font-mono text-[10.5px] tracking-[0.12em] text-ink-3 uppercase">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** What is being planned: the test, the lunar target, the weather limits and the ranking. */
export function PlannerControls(p: PlannerControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Control label="Test">
        <span className="flex items-center gap-2 text-[13px]">
          <i aria-hidden="true" className="size-1.5 flex-none rounded-full bg-sun shadow-[0_0_8px_var(--color-sun)]" />
          {p.objective}
        </span>
      </Control>
      <Control label="Target">
        <Segmented
          size="sm"
          label="Lunar target"
          value={p.target}
          onChange={p.onTarget}
          options={p.targets.map((t) => ({ value: t.id, label: shortName(t.name) }))}
        />
      </Control>
      <Control label="Cloud">
        <Segmented<CloudChoice>
          size="sm"
          label="Cloud limit"
          value={p.cloud}
          onChange={p.onCloud}
          options={[
            { value: "strict", label: "≤30%" },
            { value: "relaxed", label: "≤50%" },
          ]}
        />
      </Control>
      <Control label="Wind chill">
        <Segmented<ChillChoice>
          size="sm"
          label="Wind chill limit"
          value={p.chill}
          onChange={p.onChill}
          options={[
            { value: "28", label: "≥ −28 °C" },
            { value: "40", label: "≥ −40 °C" },
          ]}
        />
      </Control>
      <Control label="Rank by">
        <Segmented<RankMode>
          size="sm"
          label="Ranking"
          value={p.rank}
          onChange={p.onRank}
          options={[
            { value: "month", label: "Selected month" },
            { value: "best", label: "Best window" },
          ]}
        />
      </Control>
      <AnimatePresence initial={false}>
        {p.warning && (
          <motion.div
            key="warning"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 0.8, 0.24, 1] }}
            className="overflow-hidden"
          >
            <div role="note" className="flex items-start gap-2.5 rounded-lg border border-rose/30 bg-rose/[0.08] px-3 py-2.5 text-[12.5px] text-[#f3c9bf]">
              <WarnIcon />
              <span>{p.warning}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
