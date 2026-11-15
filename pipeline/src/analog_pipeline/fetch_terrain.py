"""Terrain slope at each lunar target and Earth site, on the same 40 m grid.

The Moon side reads the LOLA polar elevation model LDEM_80S_40M (PDS, polar
stereographic, 40 m pixels) by HTTP range request: only the 250 rows around a
target are downloaded. The Earth side reads the Copernicus DEM GLO-30 tiles
(cloud-optimised GeoTIFF, AWS Open Data copy) for a box around the site and
averages them onto a 40 m grid centred on the site. Both boxes are 10 km wide.

Slope uses Horn's 3 x 3 method on that grid, so both bodies are compared at
the same baseline. The result is a small file in config/ that the build reads;
the downloaded patches are cached in data/raw/terrain/.

Usage:
    uv run python -m analog_pipeline.fetch_terrain
"""

from __future__ import annotations

import json
import logging
import math
from pathlib import Path

import numpy as np
import requests

from .sites import CONFIG_DIR, RAW_DIR, Site, Target, load_sites, load_targets

log = logging.getLogger("fetch_terrain")

OUT = CONFIG_DIR / "terrain.json"
CACHE = RAW_DIR / "terrain"

GRID_M = 40.0
BOX_KM = 10.0
SIZE = int(round(BOX_KM * 1000 / GRID_M))  # pixels per side
STEEP_DEG = 15.0
HIST_EDGES = list(range(0, 42, 2))  # 2° bins up to 40°, then one bin above
# Copernicus DEM heights are relative to EGM2008; the sea is flattened to about 0 m.
SEA_MAX_M = 0.5

# LOLA LDEM_80S_40M: 15200 x 15200 signed 16-bit, little-endian, height = DN x 0.5 m
# above a 1737.4 km sphere. Spherical polar stereographic, centre -90°, 0°E.
LOLA_URL = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_40m.img"
LOLA_N = 15200
LOLA_SCALE_M = 40.0
LOLA_OFFSET_PX = 7599.5
LOLA_DN_M = 0.5
MOON_R_M = 1737400.0

COP_URL = "https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"

SOURCES = {
    "lola_dem": {
        "name": "LRO LOLA polar elevation model LDEM_80S_40M (PDS Geosciences Node)",
        "detail": "South polar stereographic, 40 m pixels, gridded from LOLA altimetry. Read in a 10 km box around each target.",
        "url": "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/",
    },
    "copernicus_dem": {
        "name": "Copernicus DEM GLO-30 (ESA, AWS Open Data copy)",
        "detail": "30 m surface model from TanDEM-X, averaged onto a 40 m grid in a 10 km box around each site. "
        "Glacier and snow surfaces count as terrain.",
        "url": "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
    },
}


# ---------- slope statistics ----------


def horn_slope_deg(z: np.ndarray, spacing_m: float) -> np.ndarray:
    """Slope in degrees for the interior pixels of an elevation grid (Horn 1981). NaN where a neighbour is NaN."""
    a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
    d, f = z[1:-1, :-2], z[1:-1, 2:]
    g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * spacing_m)
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * spacing_m)
    return np.degrees(np.arctan(np.hypot(dzdx, dzdy)))


def slope_stats(z: np.ndarray, spacing_m: float) -> tuple[dict, np.ndarray]:
    """Summary of the slope distribution in a box, and the valid slope values."""
    s = horn_slope_deg(z, spacing_m)
    valid = s[np.isfinite(s)]
    if valid.size == 0:
        return {"land_share": 0.0}, valid
    counts, _ = np.histogram(np.minimum(valid, 90.0), bins=HIST_EDGES + [90.0])
    zs = z[np.isfinite(z)]
    return {
        "land_share": round(valid.size / s.size, 3),
        "median_slope_deg": round(float(np.median(valid)), 1),
        "p90_slope_deg": round(float(np.percentile(valid, 90)), 1),
        "steep_share": round(float(np.mean(valid > STEEP_DEG)), 3),
        "relief_m": round(float(zs.max() - zs.min())),
        "hist_share": [round(float(c) / valid.size, 4) for c in counts],
    }, valid


def ks_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Largest gap between the two empirical slope distributions (Kolmogorov-Smirnov statistic), 0 to 1."""
    grid = np.concatenate([a, b])
    grid.sort()
    fa = np.searchsorted(np.sort(a), grid, side="right") / a.size
    fb = np.searchsorted(np.sort(b), grid, side="right") / b.size
    return float(np.max(np.abs(fa - fb)))


# ---------- Moon: LOLA polar stereographic ----------


def lola_pixel(lat: float, lon: float) -> tuple[float, float]:
    """0-based (line, sample) of a south-polar point in LDEM_80S_40M.

    Lines run from +y to -y. Checked on relief: this gives Malapert's summit
    about +4.9 km and Shackleton's floor about -2.8 km; the opposite sign
    puts Shackleton's centre at +0.8 km.
    """
    rho = 2 * MOON_R_M * math.tan(math.pi / 4 + math.radians(lat) / 2)
    x = rho * math.sin(math.radians(lon))
    y = rho * math.cos(math.radians(lon))
    return LOLA_OFFSET_PX - y / LOLA_SCALE_M, LOLA_OFFSET_PX + x / LOLA_SCALE_M


def stereo_spacing_m(lat: float) -> float:
    """Ground distance of one 40 m map pixel at a latitude; polar stereographic is true at the pole."""
    return LOLA_SCALE_M * (1 + abs(math.sin(math.radians(lat)))) / 2


def lola_patch(t: Target) -> np.ndarray:
    path = CACHE / f"lola_{t.id}.npy"
    if path.exists():
        return np.load(path)
    line, sample = lola_pixel(t.lat, t.lon)
    l0 = int(round(line)) - SIZE // 2
    s0 = int(round(sample)) - SIZE // 2
    start = l0 * LOLA_N * 2
    end = (l0 + SIZE) * LOLA_N * 2 - 1
    r = requests.get(LOLA_URL, headers={"Range": f"bytes={start}-{end}"}, timeout=300)
    r.raise_for_status()
    rows = np.frombuffer(r.content, "<i2").reshape(SIZE, LOLA_N)
    z = rows[:, s0 : s0 + SIZE].astype(np.float64) * LOLA_DN_M
    path.parent.mkdir(parents=True, exist_ok=True)
    np.save(path, z)
    return z


# ---------- Earth: Copernicus DEM ----------


def cop_tile_names(lat0: float, lat1: float, lon0: float, lon1: float) -> list[str]:
    names = []
    for la in range(math.floor(lat0), math.floor(lat1) + 1):
        for lo in range(math.floor(lon0), math.floor(lon1) + 1):
            ns = f"{'N' if la >= 0 else 'S'}{abs(la):02d}_00"
            ew = f"{'E' if lo >= 0 else 'W'}{abs(lo):03d}_00"
            names.append(f"Copernicus_DSM_COG_10_{ns}_{ew}_DEM")
    return names


def cop_patch(s: Site) -> np.ndarray:
    """Copernicus DEM averaged onto a SIZE x SIZE grid of GRID_M pixels centred on the site. NaN over the sea."""
    path = CACHE / f"cop_{s.id}.npy"
    if path.exists():
        return np.load(path)

    import rasterio
    from rasterio.crs import CRS
    from rasterio.transform import from_origin
    from rasterio.warp import Resampling, reproject

    half = BOX_KM * 1000 / 2
    dst = np.full((SIZE, SIZE), np.nan, dtype=np.float32)
    dst_crs = CRS.from_proj4(f"+proj=aeqd +lat_0={s.lat} +lon_0={s.lon} +datum=WGS84 +units=m +no_defs")
    dst_transform = from_origin(-half, half, GRID_M, GRID_M)
    # Geographic bounds of the box with a margin, for picking tiles.
    dlat = (half * 1.5) / 111_000
    dlon = (half * 1.5) / (111_000 * math.cos(math.radians(s.lat)))
    names = cop_tile_names(s.lat - dlat, s.lat + dlat, s.lon - dlon, s.lon + dlon)

    env = rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
        GDAL_HTTP_MAX_RETRY="3",
        GDAL_HTTP_RETRY_DELAY="2",
    )
    found = 0
    with env:
        for name in names:
            url = COP_URL.format(name=name)
            if requests.head(url, timeout=60).status_code != 200:
                log.info("%s: no tile %s (sea)", s.id, name)
                continue
            found += 1
            with rasterio.open(f"/vsicurl/{url}") as src:
                part = np.full((SIZE, SIZE), np.nan, dtype=np.float32)
                reproject(
                    source=rasterio.band(src, 1),
                    destination=part,
                    dst_transform=dst_transform,
                    dst_crs=dst_crs,
                    dst_nodata=np.nan,
                    resampling=Resampling.average,
                )
                fill = np.isnan(dst) & np.isfinite(part)
                dst[fill] = part[fill]
    if not found:
        raise RuntimeError(f"{s.id}: no Copernicus DEM tile")
    z = dst.astype(np.float64)
    z[z <= SEA_MAX_M] = np.nan
    path.parent.mkdir(parents=True, exist_ok=True)
    np.save(path, z)
    return z


# ---------- main ----------


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    targets, sites = load_targets(), load_sites()

    moon, moon_slopes = {}, {}
    for t in targets:
        moon[t.id], moon_slopes[t.id] = slope_stats(lola_patch(t), stereo_spacing_m(t.lat))
        log.info("%s %s", t.id, {k: v for k, v in moon[t.id].items() if k != "hist_share"})

    earth, ks = {}, {t.id: {} for t in targets}
    for s in sites:
        earth[s.id], slopes = slope_stats(cop_patch(s), GRID_M)
        for t in targets:
            ks[t.id][s.id] = round(ks_distance(slopes, moon_slopes[t.id]), 3) if slopes.size else None
        log.info("%s %s", s.id, {k: v for k, v in earth[s.id].items() if k != "hist_share"})

    doc = {
        "method": f"Horn slope on a {GRID_M:g} m grid in a {BOX_KM:g} km x {BOX_KM:g} km box centred on each "
        f"target and site. steep_share is the share steeper than {STEEP_DEG:g}°. hist_share bins: "
        f"{HIST_EDGES[1] - HIST_EDGES[0]}° wide from 0° to {HIST_EDGES[-1]}°, then one bin above. "
        "ks is the Kolmogorov-Smirnov distance between a site's and a target's slope distributions.",
        "grid_m": GRID_M,
        "box_km": BOX_KM,
        "steep_deg": STEEP_DEG,
        "hist_edges_deg": HIST_EDGES,
        "sources": SOURCES,
        "targets": moon,
        "sites": earth,
        "ks": ks,
    }
    OUT.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    log.info("wrote %s", OUT)


if __name__ == "__main__":
    main()
