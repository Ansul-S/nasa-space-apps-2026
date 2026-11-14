# Resource Analysis: Earth Analogs for Moon-Base and Mars Sites

Analysis of the official resources for the NASA Space Apps 2026 challenge *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"*: what each resource offers, which data matters, and how to connect to it. Endpoints, collection IDs and code were **checked against the live services on 13 Nov 2026**.

## Reading order
1. `00_Challenge_Brief.md`: what the judges want, and the Moon/Mars target sites
2. `5_Synthesis/A_Parameter_Crosswalk.md`: the key table mapping Moon/Mars measurements to Earth datasets
3. The resource files you will work with (below)
4. `5_Synthesis/B_Integration_Strategy.md` → `C_Data_Access_Cheatsheet.md` → `D_What_We_Can_Build.md`

```
Resource_Analysis/
├── 00_Challenge_Brief.md
├── 1_NASA/   01_Earthdata_Search · 02_Worldview_GIBS · 03_Planetary_Data_System · 04_LRO · 05_LRO_Diviner
├── 2_CSA/    06_RADARSAT_Constellation_RCM · 07_RADARSAT-1 · 08_SAR_Python_Tutorial
├── 3_ESA/    09_Copernicus_Data_Space · 10_ESA_Open_Science_Catalog
├── 4_JAXA/   11_G-Portal_and_JAXA_Earth_API
└── 5_Synthesis/  A_Parameter_Crosswalk · B_Integration_Strategy · C_Data_Access_Cheatsheet · D_What_We_Can_Build
```

## The 11 resources at a glance

| # | Resource | Body | Main contribution | Login | Priority |
|---|---|---|---|---|---|
| 01 | NASA Earthdata Search | Earth | Nearly every Earth parameter: **EMIT minerals**, MODIS LST, NASADEM, ASTER emissivity, MERRA-2 dust | Earthdata (download) | **HIGH** |
| 02 | NASA Worldview / GIBS | Earth | Visual scouting, free **basemap tiles** for our app, dust-event storytelling | none | MEDIUM |
| 03 | NASA PDS | Moon, Mars | **All Mars data**: MOLA terrain, CRISM minerals, TES thermal inertia, GRS ice | none | **HIGH** |
| 04 | NASA LRO | Moon | South-pole **slope, roughness, sunlight %, Earth visibility, shadowed regions**, Mini-RF radar | none | **HIGH** |
| 05 | LRO Diviner | Moon | Polar **temperature + ice-stability depth** (Polar Resource Product) | none | **HIGH** |
| 06 | CSA RCM | Earth | **Compact-pol radar**, the same design as LRO Mini-RF; Arctic and Antarctic | partly | MEDIUM |
| 07 | CSA RADARSAT-1 | Earth | 1995–2013 radar, **open COGs on AWS**; Sahara and Antarctic mosaics | none (AWS) | MEDIUM |
| 08 | CSA SAR Tutorial | — | Learning: open and plot SAR in QGIS/Python | none | LOW |
| 09 | ESA Copernicus Data Space | Earth | **Copernicus DEM 30 m**, Sentinel-2 10 m, Sentinel-1, free cloud processing (openEO) | CDSE (download) | **HIGH** |
| 10 | ESA Open Science Catalog | Earth | Niche research layers, e.g. **global dust-layer climatology** | none | LOW–MED |
| 11 | JAXA G-Portal (+ Earth API) | Earth | **Ready-made global monthly normals** (LST day/night, soil moisture, rainfall, NDVI) with no login | Earth API: none | MED / **HIGH** |

## Shortlist: datasets to focus on first
| Role | Dataset |
|---|---|
| Moon target profile | LOLA `GDRDSM` slope, `GDRDRM` roughness, `GDRVIS` sun & Earth visibility, `GDRPSR`; Diviner **PRP** (`temp_avg`, `temp_max`, `ice_depth`) |
| Mars target profile | MOLA MEGDR, CRISM `MTRDR`, TES `TIMAP`, GRS `DND`/`ELEMTS`; HiRISE/CTX DTMs via USGS STAC |
| Earth global screen | JAXA Earth API LST/soil-moisture/precipitation normals, MERRA-2 `M2TMNXAER`, `MCD12Q1`, `MOD10CM` |
| Earth detail | Copernicus DEM GLO-30, **EMIT `EMITL2BMIN`**, Sentinel-2 L2A, ASTER `AG100`, ECOSTRESS LST |
| Distinctive extras | RCM compact-pol (vs Mini-RF), RADARSAT-1 + Sentinel-1 time series, CALIPSO dust layers |

## The integration idea in one paragraph
Describe every place by **one value per analog dimension**: terrain, light, temperature, ice/water, composition, dust, habitability. Express each value **relative to its own planet** (percentiles), because raw values like 40 K vs 220 K aren't comparable. Then score Earth locations against a Moon or Mars target **per dimension**. Screen globally with coarse API layers, then refine the top candidates with high-resolution data. Rank by similarity × novelty, so we find under-studied sites rather than rediscovering the Atacama. Show an "analog card" that explains **what matches and where it breaks down**. Details: `5_Synthesis/B_Integration_Strategy.md`.

## Before the hackathon
- [ ] Create **Earthdata Login** (and approve the GES DISC app) and a **Copernicus Data Space** account
- [ ] Set up the Python environment (`C_Data_Access_Cheatsheet.md` §2)
- [ ] Pre-download Diviner PRP south (~605 MB) and the LOLA polar products (§5)
- [ ] Decide focus and targets (`D_What_We_Can_Build.md`, open questions)

## Status notes (13 Nov 2026)
- ⚠️ RCM ARD STAC (`eodms-sgdot.nrcan-rncan.gc.ca/stac/`) returned **HTTP 503**. Retry later.
- ⚠️ RADARSAT-1 **Africa / Antarctica mosaic** download folders linked from CSA pages returned **404**. Antarctica is also in Earthdata as `NSIDC-0103`.
- The challenge page says more resources may be added before the event. Re-check the Resources tab.
- Supplementary open sources used where the official list has gaps: USGS Astrogeology STAC, NASA Solar System Treks, LROC QuickMap, Mars Climate Database, Copernicus DEM on AWS.
