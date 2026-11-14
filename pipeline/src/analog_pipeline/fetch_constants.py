"""Read the surface type and elevation of each site's MERRA-2 grid cell.

The MERRA-2 constants collection (M2C0NXASM) gives the fraction of bare land,
land ice, ocean and lake in every cell, and the surface height. A cell that is
mostly ice sheet or ocean does not describe the weather of a bare-ground site
inside it. The result is a small file in config/ that the build reads.

Usage:
    uv run python -m analog_pipeline.fetch_constants
"""

from __future__ import annotations

import json
import logging

import earthaccess
import netCDF4

from .fetch_merra2 import grid_index
from .sites import CONFIG_DIR, RAW_DIR, load_sites

log = logging.getLogger("fetch_constants")

OUT = CONFIG_DIR / "merra2_cells.json"
GRAVITY = 9.80665


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    earthaccess.login(strategy="netrc")
    folder = RAW_DIR / "merra2" / "constants"
    folder.mkdir(parents=True, exist_ok=True)
    granules = earthaccess.search_data(short_name="M2C0NXASM", version="5.12.4")
    path = earthaccess.download(granules[:1], str(folder))[0]
    cells = {}
    with netCDF4.Dataset(str(path)) as ds:
        for s in load_sites():
            j, i = grid_index(s)
            cells[s.id] = {
                "lat": round(float(ds["lat"][j]), 3),
                "lon": round(float(ds["lon"][i]), 3),
                "land": round(float(ds["FRLAND"][0, j, i]), 2),
                "land_ice": round(float(ds["FRLANDICE"][0, j, i]), 2),
                "ocean": round(float(ds["FROCEAN"][0, j, i]), 2),
                "lake": round(float(ds["FRLAKE"][0, j, i]), 2),
                "elevation_m": round(float(ds["PHIS"][0, j, i]) / GRAVITY),
            }
    doc = {
        "source": "MERRA-2 M2C0NXASM v5.12.4 (FRLAND, FRLANDICE, FROCEAN, FRLAKE, PHIS)",
        "source_url": "https://doi.org/10.5067/ME5QX6Q5IGGU",
        "cells": cells,
    }
    OUT.write_text(json.dumps(doc, indent=2) + "\n")
    log.info("wrote %s", OUT)


if __name__ == "__main__":
    main()
