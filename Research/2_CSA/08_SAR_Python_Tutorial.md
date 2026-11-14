# 08 · CSA Synthetic Aperture Radar (SAR) Python Tutorial

**Link:** https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial · **Type:** learning resource (no new data) · **Priority:** LOW–MEDIUM
**Licence:** MIT (modified). Bilingual EN/FR.

## What it is
A beginner's guide to **opening and plotting RADARSAT rasters and shapefiles**. It has two options:

| Option | Content |
|---|---|
| **1 – QGIS** | PDF step-by-step guide: load a raster and a vector layer in QGIS. Sample: RCM-3 image of B.C. wildfires (`OK2080033`) from the CSA open-data server. |
| **2 – Python** | Jupyter notebook: plot rasters with **GDAL (`osgeo`) + `cartopy` + `matplotlib`**, overlay Natural Earth shapefiles |

Setup: Python 3.8+, `venv` or `conda`, `pip install -r requirements.txt`, then `jupyter notebook`.

## What it does *not* cover
Calibration (σ⁰), dB conversion, speckle filtering, terrain correction, polarimetry/CPR, or EODMS/STAC search. We need those steps for real analysis.

## Why it matters for us
- **Onboarding:** gets teammates new to SAR from zero to "I can open and map a radar scene" in about an hour.
- **Template:** its GDAL + cartopy plotting pattern is reusable for report figures.

## Use it together with
- **EO Visualization and Search Tutorial** (https://github.com/asc-csa/EO-Visualization-and-Search-Tutorial): EODMS REST search with an interactive `ipyleaflet` map (Python 3.11+). More useful for finding data.
- **radarsat1-scripts** (https://github.com/asc-csa/radarsat1-scripts): S3 access to the RADARSAT-1 COG archive.
- **ESA SNAP** (desktop): the processing steps the tutorial skips.

## Minimal SAR processing chain we will need
```
GRD/SLC → radiometric calibration (σ⁰) → speckle filter (e.g. Lee 5×5)
        → terrain correction (Copernicus DEM) → dB = 10·log10(σ⁰)
        → per-region statistics (mean, std, texture) or CPR from compact-pol MLC
```
