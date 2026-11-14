import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteView } from "@/components/site/SiteView";
import { DEFAULT_CHILL, DEFAULT_CLOUD, DEFAULT_TARGET, getSite, presetId } from "@/lib/data";
import { loadIndex, loadSite } from "@/lib/data.server";
import { defaultMonth, toSiteView } from "@/lib/site-view";

export const dynamicParams = false;

export async function generateStaticParams() {
  const index = await loadIndex();
  return index.sites.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sites/[id]">): Promise<Metadata> {
  const { id } = await params;
  const site = getSite(await loadIndex(), id);
  return site ? { title: site.name, description: `Low-sun analog analysis for ${site.name}, ${site.region}.` } : {};
}

export default async function SitePage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params;
  const index = await loadIndex();
  if (!getSite(index, id)) notFound();
  const view = toSiteView(index, await loadSite(id));
  const initial = {
    target: DEFAULT_TARGET,
    cloud: DEFAULT_CLOUD,
    chill: DEFAULT_CHILL,
    month: defaultMonth(view, DEFAULT_TARGET, presetId(DEFAULT_CLOUD, DEFAULT_CHILL)),
  };
  return <SiteView view={view} initial={initial} />;
}
