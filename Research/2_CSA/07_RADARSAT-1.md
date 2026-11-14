# 07 · CSA RADARSAT-1 Archive (Earth)

**Link:** https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1 · **Body:** Earth · **Priority:** MEDIUM (easy to access, 18-year radar history)
**Licence:** Open Government Licence – Canada. The **whole archive is open**.

## What it is
Canada's first SAR satellite, operating **1995–2013**: C-band, **HH** polarisation. Imaging modes visible in file names include Fine (`F1`–`F5`, ~8 m), Standard (`S1`–`S7`, ~25 m) and ScanSAR Narrow/Wide (`SCNA`, `SCNB`, ~50–100 m).

## What we can get

| Source | Details |
|---|---|
| **AWS Open Data** ⭐ | `s3://radarsat-r1-l1-cog/` (ca-central-1). **Cloud-Optimised GeoTIFFs, no AWS account needed.** Organised by `YYYY/MM/` from 1996 to 2013. Example: `1996/10/RS1_C0003310_SCNA_19961004_140742_HH_SCN.tif` (~200–750 MB per scene). |
| **EODMS** | Search and order by area and date. Since **18 Dec 2025**, an NRCan **RADARSAT-1 Processing Service** creates products free of charge from the raw archive, including scenes never processed before. |
| **Antarctica Mosaic** | Byrd Polar Research Center / CSA / Alaska SAR Facility, NASA-sponsored. The same 1997 mosaic is in Earthdata as **`NSIDC-0103`** (RAMP AMM-1 v2). |
| **Africa Mosaic** | ~1,600 images (Oct 1998 – Jul 2002). ScanSAR Narrow north of 10°N, so it covers **the entire Sahara**, plus country mosaics. |
| **Helper code** | https://github.com/asc-csa/radarsat1-scripts: S3 access helpers and a lake-ice detection example |

> On 13 Nov 2026 the mosaic download folders linked from the CSA pages returned 404. For Antarctica, use `NSIDC-0103` via Earthdata Search. For Africa, check the dataset page again or contact the CSA open-data team.

## Why it matters for us
- **Process analogs through time.** 1995–2013 radar lets us measure **dune migration**, glacier and ice change and lake-ice cycles. These Earth processes mirror Mars aeolian and polar activity. Combine with Sentinel-1 (2014–today) for a 30-year record.
- **Saharan and Antarctic radar mosaics:** ready-made regional radar context for two of the biggest Mars and Moon analog environments.
- **Roughness:** HH backscatter is a surface-texture metric, useful for landing and mobility analogs.

## How to connect
```python
import os, rasterio
os.environ["AWS_NO_SIGN_REQUEST"] = "YES"
url = "s3://radarsat-r1-l1-cog/1996/10/RS1_C0003310_SCNA_19961004_140742_HH_SCN.tif"
with rasterio.Env(AWS_REGION="ca-central-1"), rasterio.open(url) as src:
    gcps, gcp_crs = src.gcps            # 15 ground control points in EPSG:4326 (no map CRS on the raster)
    footprint = [(g.x, g.y) for g in gcps]
    meta = src.tags()                   # CEOS_* tags: acquisition time, pass direction, calibration constants
    preview = src.read(1, out_shape=(src.height // 16, src.width // 16))  # overview read, no full download
# Georeference for analysis:  gdalwarp -tps -t_srs EPSG:4326 <in.tif> <out.tif>
# (tested 13 Nov 2026: 13632×13616 px uint8, overviews 2/4/8/16)
```
```bash
aws s3 ls --no-sign-request s3://radarsat-r1-l1-cog/2005/07/
```

## Gotchas
- File names have **no coordinates**, and the rasters are in **image geometry** (GCPs, not a map projection). Find scenes for your area with EODMS search, or read the GCP footprints of a month of files to build your own small index. COG header reads are cheap.
- Pixels are 8-bit detected amplitude. Use the CEOS calibration tags before comparing scenes; for single-scene texture, relative statistics are fine.
- C-band penetrates dry sand only slightly. For **sub-sand features** (palaeochannels), L-band (JAXA PALSAR) works better. See `4_JAXA`.
