# 09 · ESA Copernicus Data Space Ecosystem, CDSE (Earth)

**Link:** https://dataspace.copernicus.eu · **Body:** Earth · **Priority:** HIGH (best global DEM, 10 m optical, free cloud processing)
**Access:** STAC/OData **search is open**. Downloads and processing need a **free CDSE account**.

## What it is
Europe's main free portal for **Sentinel** missions, plus Landsat, MODIS, Copernicus DEM and Copernicus Land Monitoring Service (CLMS) products. It includes the **Copernicus Browser**, **APIs** and a free **JupyterLab**. Its STAC catalog lists ~400 collections.

## Datasets to focus on (collection IDs verified in STAC/openEO, 13 Nov 2026)

| Dimension | Collection (STAC id / openEO id) | What / resolution | Analog use |
|---|---|---|---|
| Topography ⭐ | `cop-dem-glo-30-dged-cog` / `COPERNICUS_30` | **Copernicus DEM, 30 m, global including poles** | Slope, roughness, Hurst, crater morphometry. Compute the same metrics as LOLA/MOLA. |
| Mineral proxies ⭐ | `sentinel-2-l2a` / `SENTINEL2_L2A` | 13 bands, 10–20 m (SWIR B11/B12) | Iron-oxide (B4/B2), clay/hydroxyl (B11/B12) and ferrous indices at fine scale |
| Radar | `sentinel-1-grd`, `sentinel-1-global-mosaics` | C-band SAR, 10 m, 2014–today | Roughness and change (dunes, ice). Continues RADARSAT-1's record. |
| Thermal | `sentinel-3-sl-2-lst-ntc` / `SENTINEL3_SLSTR_L2_LST` | Land surface temperature, 1 km | Cross-check with MODIS LST |
| Diurnal cycle | `clms_lst-daily-cycle_global_5km_10daily_v2` | Hour-by-hour LST, 10-day composites | **Day–night amplitude** (a key thermal metric) |
| Dust | `sentinel-5p-l2-aer-ai`, `…-aer-lh` | UV absorbing aerosol index, aerosol layer height | Dust-storm frequency and height |
| Surface cover | `ESA_WORLDCOVER_10M_2021_V2` (openEO), `clms_lc_global_100m_yearly_v3_cog` | Classes incl. **bare/sparse**, snow & ice, moss & lichen | Mask to barren, lifeless terrain |
| Snow / water | `clms_sce_global_1km_daily_v1_cog`, `clms_wb_global_100m_monthly_v1_cog` | Snow cover, water bodies | Ice and water presence |

## Why it matters for us
- **Copernicus DEM** is the best open global DEM for comparing terrain with LOLA and MOLA, and it covers high latitudes.
- **Sentinel-2** adds 10–20 m detail to shortlisted sites (EMIT is 60 m and not global).
- **openEO / Sentinel Hub** run the computation **on their servers**, so we never download a full Sentinel archive.

## How to connect
| API | Endpoint | Notes |
|---|---|---|
| **STAC** | `https://stac.dataspace.copernicus.eu/v1` | Search is open. Asset download needs a token. |
| **openEO** ⭐ | `https://openeo.dataspace.copernicus.eu` | Python client. Server-side band maths and composites. |
| OData | `https://catalogue.dataspace.copernicus.eu/odata/v1/Products` | Classic product search |
| Sentinel Hub | Process / Statistical APIs | Zonal statistics over many polygons |
| S3 | `https://eodata.dataspace.copernicus.eu` | Bulk access (S3 keys from your account) |

```python
import openeo
con = openeo.connect("openeo.dataspace.copernicus.eu").authenticate_oidc()  # browser login once
s2 = con.load_collection("SENTINEL2_L2A",
        spatial_extent={"west": 57.0, "south": 29.5, "east": 59.0, "north": 31.0},
        temporal_extent=["2024-01-01", "2024-12-31"], bands=["B02", "B04", "B11", "B12"],
        max_cloud_cover=10)
clay = (s2.band("B11") / s2.band("B12")).reduce_dimension(dimension="t", reducer="median")
clay.download("clay_ratio.tif")
```
**No-account option for the DEM:** the same Copernicus DEM is on AWS Open Data. Example:
`https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S78_00_E163_00_DEM/Copernicus_DSM_COG_10_S78_00_E163_00_DEM.tif` (tested; one tile per 1°×1°).

## Free-tier quotas (Copernicus General user)
| Service | Monthly limit |
|---|---|
| openEO | **10,000 credits/month** (temporary boost, may change); 2 concurrent jobs |
| Sentinel Hub | **10,000 processing units** and **10,000 requests/month** (300/min) |
| Downloads | 4 parallel connections × 20 MB/s; 12 TB per 30 days |

## Gotchas
- Sentinel-2 has **no data in polar night** and cloud contamination in the tropics. Composite over months.
- Copernicus DEM is a **surface** model: it includes ice-sheet surfaces and vegetation tops. Mask vegetated areas.
- S2 SWIR band ratios are **proxies**, not mineral identification. Confirm with EMIT where it has coverage.
- The CLMS diurnal-cycle LST comes from geostationary satellites, so it has **gaps at high latitudes**.
