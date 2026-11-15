import type { Metadata } from "next";

import { Checks } from "@/components/methods/Checks";
import {
  DataSection,
  LevelsSection,
  LimitsSection,
  MethodsHero,
  NextSection,
  OddsSection,
  RuleSection,
} from "@/components/methods/MethodSections";
import { loadIndex, loadSite } from "@/lib/data.server";
import { METHODS_SITE_IDS, toMethodsData, type MethodsSiteKey } from "@/lib/methods";

export const metadata: Metadata = {
  title: "Methods and limits",
  description:
    "The checks behind every usable-day count, the rule and data that produce it, and the limits of an Earth analog for the lunar South Pole.",
};

/** How the numbers are made, how they were checked, and where they stop. */
export default async function MethodsPage() {
  const keys = Object.keys(METHODS_SITE_IDS) as MethodsSiteKey[];
  const [index, ...sites] = await Promise.all([loadIndex(), ...keys.map((k) => loadSite(METHODS_SITE_IDS[k]))]);
  const details = Object.fromEntries(keys.map((k, i) => [k, sites[i]])) as Parameters<typeof toMethodsData>[1];
  const data = toMethodsData(index, details);

  return (
    <>
      <MethodsHero data={data} />
      <Checks data={data} index={index} />
      <RuleSection index={index} />
      <OddsSection data={data} />
      <LevelsSection index={index} />
      <DataSection index={index} data={data} />
      <LimitsSection data={data} />
      <NextSection />
    </>
  );
}
