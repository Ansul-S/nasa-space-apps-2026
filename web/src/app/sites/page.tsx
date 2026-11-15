import type { Metadata } from "next";

import { SiteGrid, SitesHero } from "@/components/sites/SiteGrid";
import { loadIndex } from "@/lib/data.server";
import { toSiteList } from "@/lib/site-list";

export const metadata: Metadata = {
  title: "Sites",
  description:
    "Every Earth analog site for the lunar South Pole, ranked by the usable low-sun test days of its best two-week window.",
};

export default async function SitesPage() {
  const index = await loadIndex();
  const list = toSiteList(index);
  return (
    <>
      <SitesHero list={list} />
      <SiteGrid list={list} index={index} />
    </>
  );
}
