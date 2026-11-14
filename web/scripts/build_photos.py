"""Build the story photographs in web/public/photos from the NASA Image and Video Library.

Each photo is downloaded at full resolution from images.nasa.gov, converted
to sRGB, resized to the widths the page requests and saved as progressive
JPEG without camera metadata. photos.json records the credit, date, title
and source page of every photo; the story reads its captions from there.

Usage (needs Pillow):
  python3 web/scripts/build_photos.py --cache <download dir>

Downloads go to the cache directory and are reused on later runs.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageCms

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "public" / "photos"

API = "https://images-api.nasa.gov"
ASSETS = "https://images-assets.nasa.gov/image"
DETAILS = "https://images.nasa.gov/details"

# id: file name on the site. credit: NASA's "NASA/Photographer" form; the
# photographer's surname must appear in the library metadata.
PHOTOS = [
    {"id": "jett3-night-run", "nasa_id": "WJS_6267", "credit": "NASA/Bill Stafford", "widths": [1280, 1920, 2560]},
    {"id": "jett3-night-crew", "nasa_id": "WJS_5929", "credit": "NASA/Bill Stafford", "widths": [720, 1280]},
    {"id": "nbl-lighting", "nasa_id": "jsc2022e001695", "credit": "NASA/Lauren Maples", "widths": [720, 1280]},
    {"id": "msfc-flat-floor", "nasa_id": "CEB_1528", "credit": "NASA/Charles Beason", "widths": [720, 1280]},
    {"id": "artemis2-moon", "nasa_id": "art002e009283", "credit": "NASA", "widths": [960, 1600, 2400]},
    {"id": "devon-k10", "nasa_id": "ARC-2007-ACD07-0170-005", "credit": "NASA/Matt Deans", "widths": [960, 1600, 2400]},
]

QUALITY = 80
SRGB = ImageCms.createProfile("sRGB")


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=600) as r:
        return r.read()


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    print(f"  download {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=600) as r, open(tmp, "wb") as f:
        if not r.headers.get_content_type().startswith("image/"):
            raise RuntimeError(f"{url} returned {r.headers.get_content_type()}")
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    return dest


def metadata(nasa_id: str, cache: Path) -> dict:
    dest = cache / f"{nasa_id}.json"
    if not dest.exists():
        query = urllib.parse.urlencode({"nasa_id": nasa_id, "media_type": "image"})
        dest.write_bytes(fetch(f"{API}/search?{query}"))
    items = json.loads(dest.read_text())["collection"]["items"]
    if not items:
        raise RuntimeError(f"{nasa_id}: not found in the NASA Image and Video Library")
    return items[0]["data"][0]


def photo_date(meta: dict) -> str:
    """The day the photo was taken. JSC captions start with "PHOTO DATE: MM-DD-YY"."""
    m = re.search(r"PHOTO DATE:\s*(\d{2})-(\d{2})-(\d{2})", meta.get("description", ""))
    if m:
        month, day, year = m.groups()
        return f"20{year}-{month}-{day}"
    return meta["date_created"][:10]


def check_credit(credit: str, meta: dict) -> None:
    if credit == "NASA":
        return
    surname = credit.split("/")[-1].split()[-1].lower()
    text = " ".join(str(meta.get(k) or "") for k in ("photographer", "secondary_creator", "description")).lower()
    if surname not in text:
        raise RuntimeError(f"{meta['nasa_id']}: credit {credit!r} not found in the library metadata")


def to_srgb(img: Image.Image) -> Image.Image:
    icc = img.info.get("icc_profile")
    if icc:
        src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        img = ImageCms.profileToProfile(img, src, SRGB, outputMode="RGB")
    return img.convert("RGB")


def build(spec: dict, cache: Path) -> dict:
    nasa_id = spec["nasa_id"]
    print(spec["id"])
    meta = metadata(nasa_id, cache)
    check_credit(spec["credit"], meta)
    src = download(f"{ASSETS}/{urllib.parse.quote(nasa_id)}/{urllib.parse.quote(nasa_id)}~orig.jpg", cache / f"{nasa_id}.jpg")
    with Image.open(src) as raw:
        img = to_srgb(raw)
    files = []
    for width in spec["widths"]:
        width = min(width, img.width)
        height = round(img.height * width / img.width)
        name = f"{spec['id']}-{width}.jpg"
        img.resize((width, height), Image.Resampling.LANCZOS).save(
            OUT / name, "JPEG", quality=QUALITY, optimize=True, progressive=True
        )
        files.append({"width": width, "src": f"/photos/{name}"})
        print(f"  {name}  {(OUT / name).stat().st_size // 1024} KB")
    return {
        "nasa_id": nasa_id,
        "title": meta.get("title") or nasa_id,
        "date": photo_date(meta),
        "center": meta.get("center"),
        "credit": spec["credit"],
        "url": f"{DETAILS}/{urllib.parse.quote(nasa_id)}",
        "width": img.width,
        "height": img.height,
        "files": files,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--cache", type=Path, required=True, help="directory for downloads")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {spec["id"]: build(spec, args.cache) for spec in PHOTOS}
    (OUT / "photos.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {OUT / 'photos.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
