import { loadIndex } from "@/lib/data.server";
import { EN_DASH } from "@/lib/format";

import { BrandMark } from "./BrandMark";

export async function SiteFooter() {
  const { period } = await loadIndex();
  const first = period.years[0];
  const last = period.years[period.years.length - 1];
  return (
    <footer className="border-t border-line pt-7 pb-10 text-xs text-ink-3">
      <div className="wrap flex flex-wrap justify-between gap-6">
        <div className="flex items-center gap-3 self-start">
          <BrandMark size={22} />
          <span>Wayfinders Frontier · NASA Space Apps Challenge 2026</span>
        </div>
        <div className="flex max-w-[80ch] flex-col gap-2">
          <p>
            Data: MERRA-2 (NASA GES DISC), CERES SYN1deg cloud and MERRA-2 precipitation through the NASA POWER API,
            MODIS/Terra MOD10CM snow, sun position from the NOAA solar algorithm. Record {first}
            {EN_DASH}
            {last}.
          </p>
          <p>
            Globe imagery: NASA GIBS Blue Marble and VIIRS Black Marble. Moon: NASA SVS CGI Moon Kit (LRO LROC colour,
            LOLA elevation). Sun on the Moon: astronomy-engine with the IAU rotation model. Moon feature positions: USGS
            Gazetteer of Planetary Nomenclature (IAU). Place search: Photon, © OpenStreetMap contributors.
          </p>
          <p>Photographs: NASA Image and Video Library (images.nasa.gov), credited where they appear.</p>
        </div>
      </div>
    </footer>
  );
}
