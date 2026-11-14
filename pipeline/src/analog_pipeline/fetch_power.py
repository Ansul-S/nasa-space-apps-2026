"""Download hourly point time series for the analog sites from the NASA POWER API.

POWER repackages two NASA products as hourly point series:
- CLOUD_AMT: cloud amount (%) from CERES SYN1deg. The CERES SYN1deg hourly files
  are about 780 MB per day with no subsetting service, too large to process for a
  decade of data.
- PRECTOTCORR: bias-corrected precipitation (mm/h) from MERRA-2. Read through POWER
  because one request per site is much faster than one OPeNDAP request per day.

Usage:
    uv run python -m analog_pipeline.fetch_power --parameters CLOUD_AMT,PRECTOTCORR
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import time

import requests

from .sites import RAW_DIR, load_sites

log = logging.getLogger("fetch_power")

API = "https://power.larc.nasa.gov/api/temporal/hourly/point"
DEFAULT_PARAMETERS = ("CLOUD_AMT", "PRECTOTCORR")


def out_path(parameter: str, site_id: str):
    return RAW_DIR / "power" / parameter / f"{site_id}.json"


def fetch_site(site_id: str, lat: float, lon: float, parameters: list[str], start: dt.date, end: dt.date) -> None:
    missing = [p for p in parameters if not out_path(p, site_id).exists()]
    if not missing:
        return
    params = {
        "parameters": ",".join(missing),
        "community": "RE",
        "latitude": lat,
        "longitude": lon,
        "start": f"{start:%Y%m%d}",
        "end": f"{end:%Y%m%d}",
        "format": "JSON",
        "time-standard": "UTC",
    }
    for attempt in range(6):
        try:
            r = requests.get(API, params=params, timeout=300)
            r.raise_for_status()
            data = r.json()
            series = data["properties"]["parameter"]
            break
        except Exception as exc:  # network errors: back off and retry
            if attempt == 5:
                raise
            log.warning("retry %d for %s: %s", attempt + 1, site_id, str(exc)[:120])
            time.sleep(min(60, 5 * 2**attempt))
    header = data.get("header", {})
    for p in missing:
        out = out_path(p, site_id)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps(
                {
                    "site": site_id,
                    "parameter": p,
                    "sources": header.get("sources"),
                    "fill_value": header.get("fill_value"),
                    "time_standard": "UTC",
                    p: series[p],
                }
            )
        )
        log.info("%s %s: %d hourly values", site_id, p, len(series[p]))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--start", default="2016-01-01")
    p.add_argument("--end", default="2025-12-31")
    p.add_argument("--parameters", default=",".join(DEFAULT_PARAMETERS))
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    parameters = [x for x in args.parameters.split(",") if x]
    for s in load_sites():
        fetch_site(s.id, s.lat, s.lon, parameters, start, end)


if __name__ == "__main__":
    main()
