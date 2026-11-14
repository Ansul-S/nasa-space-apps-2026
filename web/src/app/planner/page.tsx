import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";

import { Planner, type PatchBoxes } from "@/components/planner/Planner";
import { DEFAULT_CHILL, DEFAULT_CLOUD, DEFAULT_TARGET, FEATURED_SITE, getSite, getTarget } from "@/lib/data";
import { loadIndex } from "@/lib/data.server";
import { ringHour, toPlannerData } from "@/lib/planner";

export const metadata: Metadata = {
  title: "Planner",
  description:
    "Rank every analog site for a lunar South Pole test by month, with the low-sun ring on a 3D Earth and a Moon view to compare.",
};

/** The planner opens on September, the month of the featured site's best window. */
const OPEN_MONTH = 8;

export default async function PlannerPage() {
  const index = await loadIndex();
  const site = getSite(index, FEATURED_SITE);
  if (!site) throw new Error(`Featured site ${FEATURED_SITE} is missing from index.json`);
  const target = getTarget(index, DEFAULT_TARGET);
  const patches = JSON.parse(
    await readFile(path.join(process.cwd(), "public", "textures", "earth-sites.json"), "utf8"),
  ) as PatchBoxes;
  const initial = {
    target: DEFAULT_TARGET,
    cloud: DEFAULT_CLOUD,
    chill: DEFAULT_CHILL,
    month: OPEN_MONTH,
    // Open with the ring passing over the featured site.
    hour: ringHour(site.lat, site.lon, OPEN_MONTH, target.band_max_deg),
    site: site.id,
  };
  return <Planner data={toPlannerData(index)} patches={patches} initial={initial} />;
}
