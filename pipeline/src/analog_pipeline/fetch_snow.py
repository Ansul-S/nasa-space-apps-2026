"""Download MODIS/Terra monthly snow cover (MOD10CM v061) and extract it for the analog sites.

MOD10CM is a global 0.05 deg grid of monthly snow cover in percent. For each site
the tool averages the valid pixels in a 5 x 5 pixel window (about 25 km north-south)
around the site, and records how many pixels were valid. Values above 100 are flags
(for example 211 = night, 250 = cloud, 254 = water) and are not counted.

Needs the HDF4 reader pyhdf:
    uv run --with pyhdf python -m analog_pipeline.fetch_snow --start 2016-01 --end 2025-12
"""

from __future__ import annotations

import argparse
import json
import logging
import re

import earthaccess
import numpy as np

from .sites import RAW_DIR, load_sites

log = logging.getLogger("fetch_snow")

RES = 0.05
HALF_WINDOW = 2  # pixels on each side of the site pixel


def site_window(arr: np.ndarray, lat: float, lon: float) -> np.ndarray:
    r = int((90.0 - lat) / RES)
    c = int((lon + 180.0) / RES)
    return arr[max(r - HALF_WINDOW, 0) : r + HALF_WINDOW + 1, max(c - HALF_WINDOW, 0) : c + HALF_WINDOW + 1]


def main() -> None:
    from pyhdf.SD import SD, SDC  # imported here so the rest of the pipeline does not need pyhdf

    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--start", default="2016-01")
    p.add_argument("--end", default="2025-12")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    earthaccess.login(strategy="netrc")
    out_dir = RAW_DIR / "modis" / "MOD10CM"
    out_dir.mkdir(parents=True, exist_ok=True)
    granules = earthaccess.search_data(
        short_name="MOD10CM", version="61", temporal=(f"{args.start}-01", f"{args.end}-28")
    )
    files = earthaccess.download(granules, str(out_dir))
    log.info("%d monthly files available", len(files))

    sites = load_sites()
    result: dict[str, dict[str, dict]] = {s.id: {} for s in sites}
    # Some granules also link an .xml metadata file; only the .hdf files hold data.
    for f in sorted(x for x in map(str, files) if x.endswith(".hdf")):
        m = re.search(r"MOD10CM\.A(\d{4})(\d{3})\.", f)
        if not m:
            continue
        year, doy = int(m.group(1)), int(m.group(2))
        month =(np.datetime64(f"{year}-01-01") + np.timedelta64(doy - 1, "D")).astype("datetime64[M]")
        arr = SD(f, SDC.READ).select("Snow_Cover_Monthly_CMG")[:]
        for s in sites:
            win = site_window(arr, s.lat, s.lon)
            valid = win[win <= 100]
            result[s.id][str(month)] = {
                "snow_pct": round(float(valid.mean()), 1) if valid.size else None,
                "valid_px": int(valid.size),
                "flags": sorted({int(x) for x in win[win > 100].tolist()}),
            }
    out = RAW_DIR / "modis" / "MOD10CM_sites.json"
    out.write_text(json.dumps({"window_px": 2 * HALF_WINDOW + 1, "resolution_deg": RES, "sites": result}))
    log.info("wrote %s", out)


if __name__ == "__main__":
    main()
