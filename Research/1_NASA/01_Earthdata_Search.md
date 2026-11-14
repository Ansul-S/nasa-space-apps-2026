# 01 · NASA Earthdata Search (Earth)

**Link:** https://search.earthdata.nasa.gov · **Body:** Earth · **Priority:** HIGH (main source of Earth parameters)
**Access:** searching is free and anonymous. Downloading needs a free **Earthdata Login** (https://urs.earthdata.nasa.gov).

## What it is
The search portal for NASA's Earth science archive. It runs on the **CMR (Common Metadata Repository)**, which indexes tens of thousands of collections across NASA data centres (LP DAAC, NSIDC, GES DISC, etc.). Most key collections are now **cloud-hosted on AWS (us-west-2)**.

## Datasets to focus on (verified in CMR, 13 Nov 2026)

| Dimension | Short name | What it measures | Resolution | Analog use |
|---|---|---|---|---|
| Mineralogy | **`EMITL2BMIN`** v002 | Mineral identification and band depth (ISS imaging spectrometer) | 60 m | Maps Mars-relevant minerals: **hematite, goethite, gypsum, kaolinite, montmorillonite, calcite**, etc. Compare with CRISM on Mars. |
| Mineralogy | `EMITL2ARFL` v002 | Surface reflectance, 380–2500 nm (hyperspectral) | 60 m | Our own spectral matching against Mars spectra |
| Composition | **`AG100`** v003 | ASTER Global Emissivity (TIR bands 10–14, mean LST, NDVI) | 100 m | Silica / mafic (basaltic) index. Same physics as Diviner's Christiansen feature and Mars TES. |
| Topography | **`NASADEM_HGT`** v001 | Global DEM (improved SRTM) | 30 m | Slope, roughness, crater morphology (compare with LOLA/MOLA) |
| Topography | `ASTGTM` v003 | ASTER GDEM, covers polar areas beyond SRTM's ±60° | 30 m | High-latitude terrain |
| Topography | `ATL06` / `ATL08` v007 | ICESat-2 laser heights (ice / land) | ~20–100 m along track | Fine-scale roughness. Same instrument type as LOLA. |
| Thermal | **`MOD11A2`** v061 | Day/night land surface temperature, 8-day | 1 km | Thermal extremes and diurnal range |
| Thermal | `MOD21A2` v061 | LST + 3-band emissivity | 1 km | Thermal plus composition |
| Thermal | `ECO_L2T_LSTE` v003 | ECOSTRESS LST + emissivity | 70 m | High-resolution thermal for shortlisted sites |
| Albedo | `MCD43A3` v061 | Surface albedo | 500 m | Brightness. Input for apparent thermal inertia. |
| Life / cover | `MOD13A3` v061 / `MCD12Q1` v061 | NDVI monthly / land cover yearly | 1 km / 500 m | "Barren" mask and habitability gradient |
| Dust | **`M2TMNXAER`** v5.12.4 | MERRA-2 monthly aerosol incl. dust mass | ~50 km | Dust-storm process analog |
| Aridity | `GPM_3IMERGM` v07 | Monthly precipitation | 0.1° | Hyperarid filter |
| Water | `SPL3SMP_E` v006 | SMAP soil moisture | 9 km | Dryness |
| Ice / snow | `MOD10CM` v61 | Snow cover monthly | 0.05° | Cold/ice regions |
| Polar radar | `NSIDC-0103` v2 | RAMP RADARSAT-1 Antarctic mosaic (1997) | 25 m+ | Connects to the CSA resources |

## Why it matters for us
- Provides almost every **Earth-side feature** we need, as global, consistent, gridded products.
- **EMIT** is the strongest Mars link: it maps the same mineral families that orbiters found on Mars.
- **ASTER emissivity + MODIS LST** use thermal-infrared physics comparable to Diviner (Moon) and TES/THEMIS (Mars).

## How to connect
1. **`earthaccess`** (Python; recommended). It handles login, search, download and cloud streaming:
   ```python
   import earthaccess
   earthaccess.login()  # prompts once, or reads ~/.netrc
   res = earthaccess.search_data(short_name="EMITL2BMIN",
                                 bounding_box=(-70.5, -25.5, -68.5, -23.0),  # W,S,E,N
                                 temporal=("2023-01-01", "2025-12-31"), count=20)
   files = earthaccess.download(res, local_path="data/emit")
   ```
2. **CMR REST** (no login for search): `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=MOD11A2&bounding_box=W,S,E,N&temporal=2024-01-01T00:00:00Z,2024-12-31T23:59:59Z`
3. **CMR-STAC** (for `pystac-client`): `https://cmr.earthdata.nasa.gov/stac/LPCLOUD`
4. **AppEEARS** (https://appeears.earthdatacloud.nasa.gov): extracts point or area subsets of MODIS, ECOSTRESS, SMAP, NASADEM and more as CSV or GeoTIFF without downloading full tiles. Best for sampling **many candidate points** quickly. Has a REST API.
5. **Giovanni** (https://giovanni.gsfc.nasa.gov/giovanni/): browser-based time-averaged maps of MERRA-2 and IMERG. Good for quick dust and aridity maps.

## Gotchas
- Create the Earthdata Login **before** the event. GES DISC data (MERRA-2, IMERG) also needs the "NASA GESDISC DATA ARCHIVE" app approved in your profile.
- MODIS uses a sinusoidal grid in HDF4/HDF5. Read with `rioxarray`/GDAL and reproject.
- EMIT is **scene-based, not global**. It covers arid regions within ±52° latitude (ISS orbit).
- ASTER SWIR failed in 2008. Use `AG100` (TIR) or EMIT for minerals.
- Don't download global high-resolution data. Use coarse products to screen, then high-resolution products for shortlisted areas.
