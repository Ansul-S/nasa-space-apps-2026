"""Download hourly MERRA-2 values for the analog sites through NASA Earthdata Cloud OPeNDAP.

Each request asks for one day of one collection, cut to a small box that covers a
cluster of nearby sites. Only the grid cells of the sites are kept. Results are
stored as one small .npz file per collection and day, so an interrupted run
resumes where it stopped.

Usage:
    uv run python -m analog_pipeline.fetch_merra2 --start 2016-01-01 --end 2025-12-31
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import logging
import threading
import time

import earthaccess
import netCDF4
import numpy as np

from .sites import RAW_DIR, Site, load_sites

log = logging.getLogger("fetch_merra2")

# MERRA-2 grid: 361 latitudes from -90 by 0.5 deg, 576 longitudes from -180 by 0.625 deg.
LAT0, DLAT, LON0, DLON, NLON = -90.0, 0.5, -180.0, 0.625, 576

COLLECTIONS = {
    "M2T1NXSLV": ["T2M", "U10M", "V10M"],  # 2 m air temperature (K), 10 m wind (m/s)
    "M2T1NXFLX": ["PRECTOTCORR"],  # bias-corrected total precipitation (kg m-2 s-1)
}

# Sites close together share one request box. Every site must belong to one cluster.
CLUSTERS = {
    "canadian-arctic": ["devon-island", "ellesmere-inland", "axel-heiberg", "cornwallis-resolute"],
    "north-greenland": ["peary-land", "kronprins-christian-land"],
    "eurasian-arctic": ["svalbard", "franz-josef-land", "severnaya-zemlya"],
    "east-antarctica": ["schirmacher-oasis", "vestfold-hills"],
    "ross-sea": ["mcmurdo-dry-valleys"],
    "arizona": ["sf-volcanic-field"],
    "iceland": ["iceland-highlands"],
}


def grid_index(site: Site) -> tuple[int, int]:
    """Return the (lat, lon) index of the MERRA-2 cell that contains the site."""
    j = int(round((site.lat - LAT0) / DLAT))
    i = int(round((site.lon - LON0) / DLON)) % NLON
    return j, i


def build_boxes(sites: list[Site]) -> list[dict]:
    by_id = {s.id: s for s in sites}
    missing = set(by_id) - {sid for ids in CLUSTERS.values() for sid in ids}
    if missing:
        raise ValueError(f"sites not assigned to a cluster: {sorted(missing)}")
    boxes = []
    for name, ids in CLUSTERS.items():
        idx = [grid_index(by_id[sid]) for sid in ids]
        j0, j1 = min(j for j, _ in idx), max(j for j, _ in idx)
        i0, i1 = min(i for _, i in idx), max(i for _, i in idx)
        boxes.append({"name": name, "ids": ids, "j": (j0, j1), "i": (i0, i1), "cells": idx})
    return boxes


def opendap_urls(short_name: str, start: dt.date, end: dt.date) -> dict[dt.date, str]:
    """Look up the OPeNDAP URL of every daily granule in CMR (file names change between streams)."""
    granules = earthaccess.search_data(
        short_name=short_name, version="5.12.4", temporal=(start.isoformat(), end.isoformat())
    )
    urls = {}
    for g in granules:
        day = dt.date.fromisoformat(
            g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10]
        )
        for u in g["umm"].get("RelatedUrls", []):
            if "OPENDAP" in u.get("Subtype", "").upper():
                urls[day] = u["URL"]
    return urls


_local = threading.local()
# The netCDF-C / HDF5 libraries are not thread-safe: downloads run in parallel,
# but responses are parsed one at a time.
_parse_lock = threading.Lock()


def _session():
    if not hasattr(_local, "session"):
        _local.session = earthaccess.get_requests_https_session()
    return _local.session


def _fetch_box(url: str, variables: list[str], box: dict) -> dict[str, np.ndarray]:
    (j0, j1), (i0, i1) = box["j"], box["i"]
    hyperslab = f"[0:1:23][{j0}:1:{j1}][{i0}:1:{i1}]"
    ce = ";".join(f"/{v}{hyperslab}" for v in variables)
    attempts = 8  # with the back-off below this rides out network outages of about 3 minutes
    for attempt in range(attempts):
        try:
            r = _session().get(f"{url}.dap.nc4?dap4.ce={ce}", timeout=180)
            r.raise_for_status()
            with _parse_lock, netCDF4.Dataset("box.nc", memory=r.content) as ds:
                return {v: np.asarray(ds.variables[v][:], dtype=np.float32) for v in variables}
        except Exception as exc:  # network errors and throttling: back off and retry
            if attempt == attempts - 1:
                raise
            log.warning("retry %s for %s: %s", attempt + 1, url.rsplit("/", 1)[-1], str(exc)[:120])
            time.sleep(min(60, 2 ** (attempt + 1)))
    raise RuntimeError("unreachable")


def fetch_day(short_name: str, day: dt.date, url: str, boxes: list[dict], site_order: list[str]) -> None:
    out = RAW_DIR / "merra2" / short_name / f"{day:%Y%m%d}.npz"
    if out.exists():
        return
    variables = COLLECTIONS[short_name]
    values = {v: np.full((len(site_order), 24), np.nan, dtype=np.float32) for v in variables}
    for box in boxes:
        data = _fetch_box(url, variables, box)
        j0, i0 = box["j"][0], box["i"][0]
        for sid, (j, i) in zip(box["ids"], box["cells"]):
            k = site_order.index(sid)
            for v in variables:
                values[v][k] = data[v][:, j - j0, i - i0]
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp.npz")
    np.savez_compressed(tmp, sites=np.array(site_order), **values)
    tmp.rename(out)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--start", default="2016-01-01")
    p.add_argument("--end", default="2025-12-31")
    p.add_argument("--workers", type=int, default=32)
    p.add_argument(
        "--collections",
        default=",".join(COLLECTIONS),
        help="comma-separated MERRA-2 collections to download (default: all)",
    )
    args = p.parse_args()
    selected = [c for c in args.collections.split(",") if c]
    unknown = set(selected) - set(COLLECTIONS)
    if unknown:
        p.error(f"unknown collections: {sorted(unknown)}")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    start, end = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    earthaccess.login(strategy="netrc")
    sites = load_sites()
    site_order = [s.id for s in sites]
    boxes = build_boxes(sites)

    for short_name in selected:
        urls = opendap_urls(short_name, start, end)
        log.info("%s: %d granules found in CMR", short_name, len(urls))
        # Newest days first, so a partial run still gives the most recent complete years.
        days = sorted(urls, reverse=True)
        done, t0 = 0, time.time()
        with cf.ThreadPoolExecutor(args.workers) as ex:
            futures = {ex.submit(fetch_day, short_name, d, urls[d], boxes, site_order): d for d in days}
            for f in cf.as_completed(futures):
                try:
                    f.result()
                except Exception as exc:
                    log.error("%s %s failed: %s", short_name, futures[f], exc)
                done += 1
                if done % 100 == 0:
                    rate = done / (time.time() - t0)
                    log.info("%s: %d/%d days (%.1f days/min)", short_name, done, len(days), rate * 60)
        log.info("%s: finished", short_name)


if __name__ == "__main__":
    main()
