# 05 · LRO Diviner Lunar Radiometer (Moon)

**Link:** https://pds-geosciences.wustl.edu/missions/lro/diviner.htm · **Body:** Moon · **Priority:** HIGH (temperature and ice for the base sites)
**Access:** free, no login. Team site: https://www.diviner.ucla.edu/data

## What it is
A 9-channel thermal radiometer (0.3–400 µm) that has mapped lunar surface temperature since 2009 at ~**500 m** scale:
- 2 solar channels
- 3 narrow channels near 8 µm that measure the **Christiansen feature**, an indicator of silicate composition
- 4 thermal-infrared channels

## Products (from the PDS page)

| Product | What it is | Use for us |
|---|---|---|
| **PRP: Polar Resource Products** ⭐ | One table per pole: ~2.88 M triangular surface facets, each with **`temp_avg`** (annual mean, K), **`temp_max`** (annual max, K) and **`ice_depth`** (depth where water ice would be stable, m; `-999` = not stable). ~605 MB ASCII per pole. | **The** product for Moon-base sites: thermal environment plus ice-resource potential |
| **PCP: Polar Cumulative Products** | Seasonal and diurnal polar temperature grids (2009–2020) | Temperature cycles at the poles |
| GDR L2/L3, GCP, RCP | Gridded global and regional temperature/radiance records | Global context |
| GHRM | Global high-resolution mosaics | Basemap-style thermal layers |
| EPF | Emission phase function observations | Advanced (skip) |
| EDR / RDR | Raw and calibrated point data (to 15 Jun 2026) | Too low-level for a hackathon |

From the UCLA site: global **max/min temperature anomaly** maps (2 px/deg, `.xyz`), polar temperature maps and a "Published Datasets" page with data from team papers.

## Why it matters for us
- **Temperature dimension:** PSRs reach roughly 25–40 K. Earth's coldest satellite-measured surface is ~−98 °C (~175 K, East Antarctic plateau). The **absolute-temperature analogy breaks down**, and we should say so. We can still compare **relative extremes** (coldest percentile on each body) and **thermal stability**.
- **Ice dimension:** `ice_depth` is a **process analog**. Ice that stays stable below a dry, insulating layer is also found in **Antarctic Dry Valleys ice-cemented ground** and in **Mars mid-latitude ground ice**. This is a strong three-body comparison.
- **Composition dimension:** the Christiansen feature uses the same physics as ASTER TIR emissivity (`AG100`) on Earth and TES on Mars.

## How to connect
Direct HTTPS (no key):
```
https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.tab   (+ .xml / .lbl)
```
The file is comma-separated with a header row:
```python
import pandas as pd
cols = ["tri_clon", "tri_clat", "temp_avg", "temp_max", "ice_depth"]
prp = pd.read_csv("dlre_prp_south.tab", skipinitialspace=True, usecols=cols)
prp["ice_stable"] = prp["ice_depth"] >= 0          # -999 => no stable ice
# Clip to a candidate region (e.g., a lat/lon box around Malapert Massif) and summarise.
```
ODE REST also indexes these products (instrument `DLRE`, product types `PRP`, `PCP`, `GDR_L3`).

## Gotchas
- PRP is a **triangular mesh**, not a raster. Rasterise it (e.g. `scipy.interpolate.griddata`), or aggregate facets per region.
- Download the **south** file only (~605 MB). Do it before the event.
- Since 17 Apr 2019, most RDRs lack solar channels 1–2 (`-9999`). This doesn't affect PRP.
