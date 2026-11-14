import { Fragment } from "react";

import { LevelBadge, LevelGlyph, LEVEL_LABELS } from "@/components/ui/LevelBadge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import type { Level } from "@/lib/data";
import { FIDELITY_GROUPS, levelCounts, type FidelityLine } from "@/lib/site-view";

interface FidelityCardProps {
  title: string;
  subtitle: string;
  targetName: string;
  siteColumn: string;
  /** Short column name for the stacked layout on small screens. */
  siteColumnShort: string;
  lines: FidelityLine[];
  levels: Record<Level, string>;
  footer: string[];
}

/** Where the analog holds and where it breaks down, condition by condition. */
export function FidelityCard({
  title,
  subtitle,
  targetName,
  siteColumn,
  siteColumnShort,
  lines,
  levels,
  footer,
}: FidelityCardProps) {
  const counts = levelCounts(lines);
  return (
    <Panel as="section" aria-labelledby="fidelity-title" className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-5 pt-5 pb-2 sm:px-6">
        <div>
          <div className="eyebrow">{subtitle}</div>
          <h3 id="fidelity-title" className="mt-2 font-display text-[26px] leading-tight">
            {title}
          </h3>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Rows at each match level">
          {counts.map(([level, n]) => (
            <li key={level} title={levels[level]} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
              <LevelGlyph level={level} size={12} />
              <b className="font-mono font-normal text-ink">{n}</b> {LEVEL_LABELS[level].toLowerCase()}
            </li>
          ))}
        </ul>
      </div>

      <div className="sm:overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] max-sm:block sm:min-w-[760px]">
          <thead className="max-sm:hidden">
            <tr className="border-b border-line-2 font-mono text-[10.5px] tracking-[0.12em] text-ink-3 uppercase">
              <th scope="col" className="px-5 py-3 text-left font-normal sm:px-6">
                Condition
              </th>
              <th scope="col" className="px-3.5 py-3 text-left font-normal">
                {targetName}
              </th>
              <th scope="col" className="px-3.5 py-3 text-left font-normal">
                {siteColumn}
              </th>
              <th scope="col" className="px-3.5 py-3 text-left font-normal">
                Match
              </th>
              <th scope="col" className="px-3.5 py-3 pr-5 text-left font-normal sm:pr-6">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {FIDELITY_GROUPS.map((group) => {
              const rows = lines.filter((l) => l.group === group);
              if (!rows.length) return null;
              return (
                <Fragment key={group}>
                  <tr className="border-b border-line-2 max-sm:block">
                    <th
                      scope="colgroup"
                      colSpan={5}
                      className="px-5 pt-6 pb-2.5 max-sm:block text-left font-mono text-[10.5px] font-normal tracking-[0.12em] text-sun uppercase sm:px-6"
                    >
                      {group}
                    </th>
                  </tr>
                  {rows.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-line align-top last:border-0 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-4 max-sm:px-5 max-sm:py-4"
                    >
                      <th
                        scope="row"
                        className="px-5 py-3.5 text-left font-medium text-ink max-sm:col-span-2 max-sm:p-0 max-sm:pb-3 sm:min-w-[200px] sm:px-6"
                      >
                        {l.label}
                        {l.note && (
                          <span className="mt-1 block max-w-[48ch] text-[12px] leading-snug font-normal text-ink-3">
                            {l.note}
                          </span>
                        )}
                      </th>
                      <td className="px-3.5 py-3.5 font-mono text-[12.5px] text-ink-2 max-sm:p-0 sm:min-w-[160px]">
                        <MobileLabel>{targetName}</MobileLabel>
                        {l.moon}
                      </td>
                      <td
                        className={cn(
                          "px-3.5 py-3.5 font-mono text-[12.5px] max-sm:p-0 sm:min-w-[180px]",
                          l.level === "match" ? "text-ink" : "text-ink-2",
                        )}
                      >
                        <MobileLabel>{siteColumnShort}</MobileLabel>
                        {l.site}
                      </td>
                      <td className="px-3.5 py-3.5 max-sm:p-0 max-sm:pt-3.5">
                        <span title={levels[l.level]}>
                          <LevelBadge level={l.level} />
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 pr-5 text-[11.5px] text-ink-3 max-sm:p-0 max-sm:pt-3.5 max-sm:text-right sm:min-w-[130px] sm:pr-6">
                        {l.source || "—"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line px-5 pt-3.5 pb-4.5 text-[12px] text-ink-3 sm:px-6">
        {footer.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </Panel>
  );
}

/** Column name shown above a value when the table is stacked on small screens. */
function MobileLabel({ children }: { children: string }) {
  return <span className="eyebrow mb-1 block text-[10px] sm:hidden">{children}</span>;
}
