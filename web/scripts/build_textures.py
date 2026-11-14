"""Build the globe textures in web/public/textures from NASA sources.

Earth (NASA GIBS, WMS GetMap, EPSG:4326):
  - earth-day.jpg          Blue Marble shaded relief and bathymetry, 4096 x 2048
  - earth-night.jpg        VIIRS Black Marble 2016, 4096 x 2048
  - earth-site-<id>.jpg    Blue Marble around each site at about 0.8 km, for close zoom

Moon (NASA SVS CGI Moon Kit, https://svs.gsfc.nasa.gov/4720):
  - moon-color.jpg         LROC WAC colour with polar fill, 4096 x 2048
  - moon-slope.jpg         LOLA slopes, 8 pixels per degree, whole Moon
  - moon-slope-cap.jpg     LOLA slopes, 16 pixels per degree, 70° S to the pole

The slope maps store the east and north surface slope of the LOLA elevation in
the red and green channels as 128 + 200 x slope (blue is unused). The globe
shader tilts each surface normal by these slopes to shade the relief.

Usage (needs numpy and Pillow):
  python3 web/scripts/build_textures.py --cache <download dir>

Downloads go to the cache directory and are reused on later runs.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "public" / "textures"
SITES = ROOT / "pipeline" / "config" / "sites.json"

GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
SVS = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/"
DAY_LAYER = "BlueMarble_ShadedRelief_Bathymetry"
NIGHT_LAYER = "VIIRS_Black_Marble"

MOON_RADIUS_M = 1_737_400.0
SLOPE_SCALE = 200.0
CAP_LAT = -70.0
# Close-zoom site patches: about 1000 km north-south by 1600 km east-west,
# at roughly 0.8 km per pixel, enough to fill the view at the closest zoom.
PATCH_HALF_LAT = 4.5
PATCH_ASPECT = 1.6
PATCH_W, PATCH_H = 2048, 1280


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    print(f"  download {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=600) as r, open(tmp, "wb") as f:
        if r.headers.get_content_type().startswith("text/"):
            raise RuntimeError(f"{url} returned {r.headers.get_content_type()}")
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    return dest


def gibs(layer: str, bbox: tuple[float, float, float, float], width: int, height: int, dest: Path, time: str | None = None) -> Path:
    """bbox is (lat_min, lon_min, lat_max, lon_max), the axis order of WMS 1.3.0 in EPSG:4326."""
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": layer,
        "STYLES": "",
        "CRS": "EPSG:4326",
        "BBOX": ",".join(f"{v:.5f}" for v in bbox),
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "FORMAT": "image/jpeg",
    }
    if time:
        params["TIME"] = time
    return download(f"{GIBS_WMS}?{urllib.parse.urlencode(params)}", dest)


def save_jpeg(img: Image.Image, name: str, quality: int) -> None:
    path = OUT / name
    img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"  {name}: {img.size[0]} x {img.size[1]}, {path.stat().st_size / 1024:.0f} KB")


def patch_box(lat: float, lon: float) -> dict[str, float]:
    """Latitude and longitude half-sizes for a patch PATCH_ASPECT times wider than tall on the ground."""
    half_lon = round(min(PATCH_HALF_LAT * PATCH_ASPECT / max(math.cos(math.radians(lat)), 0.05), 40.0), 4)
    # Keep the patch inside -180..180 so one WMS request covers it; the site stays inside.
    centre = min(max(lon, -180 + half_lon), 180 - half_lon)
    return {"lat": lat, "lon": round(centre, 4), "half_lat": PATCH_HALF_LAT, "half_lon": half_lon}


def build_earth(cache: Path) -> None:
    print("Earth")
    day = gibs(DAY_LAYER, (-90, -180, 90, 180), 4096, 2048, cache / "earth_day_4096.jpg")
    save_jpeg(Image.open(day).convert("RGB"), "earth-day.jpg", 86)
    night = gibs(NIGHT_LAYER, (-90, -180, 90, 180), 4096, 2048, cache / "earth_night_4096.jpg", time="2016-01-01")
    save_jpeg(Image.open(night).convert("RGB"), "earth-night.jpg", 84)

    sites = json.loads(SITES.read_text())["sites"]
    boxes = {}
    for s in sites:
        box = patch_box(s["lat"], s["lon"])
        bbox = (
            box["lat"] - box["half_lat"],
            box["lon"] - box["half_lon"],
            box["lat"] + box["half_lat"],
            box["lon"] + box["half_lon"],
        )
        src = gibs(DAY_LAYER, bbox, PATCH_W, PATCH_H, cache / f"earth_site_{s['id']}_{PATCH_W}.jpg")
        save_jpeg(Image.open(src).convert("RGB"), f"earth-site-{s['id']}.jpg", 84)
        boxes[s["id"]] = box
    (OUT / "earth-sites.json").write_text(json.dumps(boxes, indent=1) + "\n")


def slopes(height: np.ndarray, lat_top: float, ppd: float) -> np.ndarray:
    """East and north slope of an equirectangular height grid (metres) as an RGB byte image.

    Near the pole the east-west pixel spacing shrinks with cos(latitude). Each row
    therefore takes its east-west difference over enough columns to span at least
    one north-south pixel, so the slope keeps the same ground resolution in both
    directions instead of turning into noise.
    """
    rows, cols = height.shape
    dy = MOON_RADIUS_M * math.radians(1 / ppd)
    lat_c = lat_top - (np.arange(rows) + 0.5) / ppd
    east = np.empty_like(height)
    for r in range(rows):
        cos = max(math.cos(math.radians(lat_c[r])), 1e-6)
        k = int(min(max(1, math.ceil(1 / cos)), cols // 4))
        row = height[r]
        east[r] = (np.roll(row, -k) - np.roll(row, k)) / (2 * k * dy * cos)
    padded = np.vstack([height[:1], height, height[-1:]])
    north = (padded[:-2] - padded[2:]) / (2 * dy)
    rgb = np.zeros((rows, cols, 3), np.uint8)
    rgb[..., 0] = np.clip(np.round(128 + east * SLOPE_SCALE), 0, 255)
    rgb[..., 1] = np.clip(np.round(128 + north * SLOPE_SCALE), 0, 255)
    return rgb


def build_moon(cache: Path) -> None:
    print("Moon")
    color = download(SVS + "lroc_color_poles_4k.tif", cache / "lroc_color_poles_4k.tif")
    save_jpeg(Image.open(color).convert("RGB"), "moon-color.jpg", 84)

    ldem = download(SVS + "ldem_16_uint.tif", cache / "ldem_16_uint.tif")
    # Unsigned 16-bit half-metres above a 1727.4 km sphere; only differences matter here.
    h16 = np.asarray(Image.open(ldem), dtype=np.float64) * 0.5
    rows16 = h16.shape[0]
    ppd16 = rows16 / 180

    h8 = h16.reshape(rows16 // 2, 2, h16.shape[1] // 2, 2).mean(axis=(1, 3))
    save_jpeg(Image.fromarray(slopes(h8, 90.0, ppd16 / 2), "RGB"), "moon-slope.jpg", 88)

    top = int(round((90 - CAP_LAT) * ppd16))
    cap = slopes(h16[top:], CAP_LAT, ppd16)
    save_jpeg(Image.fromarray(cap, "RGB"), "moon-slope-cap.jpg", 90)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--cache", type=Path, required=True, help="directory for downloaded source files")
    parser.add_argument("--only", choices=["earth", "moon"], help="build one body only")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    if args.only in (None, "earth"):
        build_earth(args.cache)
    if args.only in (None, "moon"):
        build_moon(args.cache)
    return 0


if __name__ == "__main__":
    sys.exit(main())
