# 11 · JAXA G-Portal (+ JAXA Earth API) (Earth)

**Link:** https://gportal.jaxa.jp/gpr/ · **Body:** Earth · **Priority:** MEDIUM (G-Portal) / **HIGH (JAXA Earth API, the fastest global feature source we found)**
**Access:** G-Portal: search is free without registration; **downloads need free registration**. JAXA Earth API: **no registration, no API key, no call limit**.

## What it is
**G-Portal** is JAXA's portal for Earth-observation products. You can search by **satellite/sensor** or by **physical quantity** (precipitation, snow, vegetation, …) and download through the web or **SFTP**. Registered users log in to SFTP with username and password.

| Mission / sensor | Key variables |
|---|---|
| **GCOM-W / AMSR2** | Soil moisture, snow depth, sea ice, brightness temperature |
| **GCOM-C / SGLI** | **Land surface temperature**, NDVI, aerosols, snow, albedo |
| **GPM** (with NASA) / **GSMaP** | Precipitation |
| ALOS series, GOSAT, AMSR-E, TRMM | Land imagery and DEM, greenhouse gases, legacy records |

**JAXA Earth API** (linked from G-Portal) serves many of the same products, plus some NASA ones, as **Cloud-Optimised GeoTIFFs with a STAC catalogue**. Clients exist for Python (`jaxa-earth` v0.1.6) and JavaScript (v2.0.1). It has **112 collections**, including ready-made **monthly climatologies ("normals")**.

## Collections to focus on (IDs verified in the STAC catalogue)

| Dimension | Collection ID | What |
|---|---|---|
| Thermal ⭐ | `NASA.EOSDIS_Terra.MODIS_MOD11C1-LST.daytime.v061_global_monthly-normal` (+ `nighttime`) | **Monthly LST normals 2012–2021**, day and night, giving the **diurnal range** directly. Kelvin, 0.05°. |
| Thermal | `JAXA.G-Portal_GCOM-C.SGLI_standard.L3-LST.daytime.v3_global_monthly` (+ `nighttime`) | SGLI LST (independent sensor for cross-checking) |
| Water | `JAXA.G-Portal_GCOM-W.AMSR2_standard.L3-SMC.daytime.v3_global_monthly-normal` | Soil-moisture normals (dryness) |
| Aridity | `JAXA.EORC_GSMaP_standard.Gauge.00Z-23Z.v6_monthly-normal` | Precipitation normals |
| Vegetation | `JAXA.G-Portal_GCOM-C.SGLI_standard.L3-NDVI.daytime.v3_global_monthly` | "Lifelessness" mask |
| Topography | `JAXA.EORC_ALOS.PRISM_AW3D30.v3.2_global` (band `DSM`; v4.1 also listed) | 30 m global DSM (a third DEM for cross-checking) |
| Cover | `JAXA.EORC_ALOS-2.PALSAR-2_FNF.v2.1.0_global_yearly` | Forest / non-forest from L-band radar |

## Why it matters for us
- **Stage-1 global screening in minutes:** temperature extremes, diurnal swing, dryness, rainfall and vegetation as small, pre-aggregated grids. No tile downloads, no HDF parsing.
- Climatology "normals" remove single-year noise, which suits a **stable analog index**.
- **Optional extra:** ALOS-2 PALSAR-2 **L-band** mosaics (JAXA EORC website, separate from G-Portal) penetrate dry sand. Use them for **buried-channel / subsurface** analogs to Mars radar.

## How to connect
```python
# pip install jaxa-earth        (tested 13 Nov 2026)
from jaxa.earth import je
lst = (je.ImageCollection("NASA.EOSDIS_Terra.MODIS_MOD11C1-LST.daytime.v061_global_monthly-normal")
         .filter_date(["2021-01-01T00:00:00", "2021-12-31T23:59:59"])
         .filter_resolution(20)                       # pixels per degree (max 20 here = 0.05°)
         .filter_bounds([-70.5, -25.5, -68.5, -23.0]) # [W, S, E, N]
         .select("LST_2012_2021")                     # band = asset key in the collection's collection.json
         .get_images())
arr = lst.raster.img        # shape (12 months, lat, lon, 1), Kelvin
```
- Band names differ per collection. Read `collection.json` → `assets` first. STAC root: `https://data.earth.jaxa.jp/stac/cog/v1/catalog.json`
- **G-Portal** (full-resolution swaths and tiles): register, search on the web, then bulk-download through SFTP (see the G-Portal user manual for host and paths).

## Gotchas
- The Earth API is for **analysis-ready subsets** at modest resolution. Use G-Portal or Earthdata for full-resolution granules.
- G-Portal formats vary by product: HDF5, GeoTIFF or netCDF.
- AMSR2 soil moisture is **unreliable near coasts, large lakes and dense forest**. Fine for deserts, which is where we will look.
- `AW3D30` is a surface model (includes canopy and buildings), like Copernicus DEM.
