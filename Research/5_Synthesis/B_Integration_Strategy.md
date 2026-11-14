# B · Integration Strategy: How the Sources Fit Together

## The core idea
Turn every place into a **feature vector**, one value per analog dimension. Build a **target signature** for each Moon or Mars site. Then score every Earth location by **per-dimension similarity**: coarse and global first, detailed only for the shortlist.

```
 MOON (LRO: LOLA, Diviner, Mini-RF)        MARS (PDS/ODE + USGS STAC: MOLA, TES, CRISM, GRS)
            │                                              │
            └──────────►  TARGET SIGNATURES  ◄─────────────┘
                          (per candidate site, per dimension)
                                     │
 EARTH STAGE 1 (global, ~5–10 km)    ▼                    EARTH STAGE 2 (shortlist, 10–100 m)
 JAXA Earth API normals (LST, SM,    SIMILARITY ENGINE    Copernicus DEM slope/roughness,
 precip, NDVI) · MERRA-2 dust ·  ──► per-dimension   ──►  Sentinel-2 indices, EMIT minerals,
 MODIS land cover/albedo/snow ·      scores + weights     ECOSTRESS LST, RCM / S1 / RADARSAT-1
 Copernicus DEM (aggregated)         + novelty score      radar, OSC dust layers
                                     │
                                     ▼
              APP: Worldview/GIBS basemap · Moon/Mars Trek side panel · "analog cards"
```

## Step by step

**1. Choose targets and dimensions**
- Moon: 2–3 of the nine South Pole regions (e.g. Malapert Massif, Mons Mouton, Haworth).
- Mars: 2–3 sites of different types (e.g. Jezero = clays/carbonates, Meridiani = hematite, Arcadia Planitia = shallow ice).
- Pick 5–7 dimensions where data exists on **both** sides (see `A_Parameter_Crosswalk.md`).

**2. Build target signatures**
- Clip LOLA, Diviner, MOLA, TES and CRISM products to each site polygon.
- Store summary statistics: median, IQR, histogram of slope, % sunlit, `ice_depth` fraction, mineral flags, and so on.
- Express each value as its **percentile on that body**, e.g. "Malapert slope roughness is in the 85th percentile of the south polar region".

**3. Earth Stage 1: global screening grid**
- Grid: **H3 hexagons** (`h3` library; resolution 5 ≈ 250 km², or 6 ≈ 36 km²) or a regular 0.1° grid.
- Pull pre-aggregated layers so we never download full archives:
  - JAXA Earth API monthly normals (LST day/night, soil moisture, precipitation, NDVI)
  - MERRA-2 dust
  - `MCD12Q1` land cover and `MOD10CM` snow
  - Copernicus DEM slope/roughness aggregated per cell, computed with openEO or tile by tile
- Apply **hard filters** first, e.g. NDVI < 0.1 and precipitation < 250 mm/yr for Mars, or permanent cold for Moon-ice analogs. This removes most of the planet cheaply.

**4. Normalise so values are comparable**
- Use percentile or rank transforms *within each body*, dimensionless ratios, and categorical matches (mineral class present: yes / no).
- Don't compare absolute temperatures across bodies (see crosswalk rule 1).

**5. Score**
- Per-dimension similarity: `s_d = exp(-(p_earth - p_target)² / (2σ²))`, using percentile distance.
- Composite: `S = Σ w_d · s_d / Σ w_d`, with weights `w_d` as **user-adjustable sliders**.
- Always store the vector `s_d` alongside `S`. The app shows **which dimensions match and which don't**.

**6. Novelty**
- Keep a list of well-known analog sites (Atacama, Haughton, Dry Valleys, Iceland, Hawaii, Death Valley, Svalbard, Rio Tinto, Mojave, etc.).
- Compute distance to the nearest known site, then rank by `S × novelty`. This answers "look beyond well-known sites".

**7. Earth Stage 2: refine the top 10–20 candidates**
- Copernicus DEM 30 m → slope and roughness **histograms at matched baselines**, compared with LOLA/MOLA using Wasserstein or KS distance.
- EMIT minerals (where covered), Sentinel-2 SWIR ratios, ECOSTRESS 70 m LST.
- RCM compact-pol CPR (Canada and Antarctic samples), Sentinel-1 / RADARSAT-1 change over time (dunes, ice).

**8. Validate (and show the judges)**
- Known analogs should score high on their known dimensions: Atacama for Mars aridity, Dry Valleys for cold and ice.
- If they don't, the weights or normalisation are wrong. Showing this check makes the result credible.

## Engineering notes
| Topic | Recommendation |
|---|---|
| Stack | Python: `earthaccess`, `pystac-client`, `openeo`, `jaxa-earth`, `rasterio`/`rioxarray`, `xarray`, `geopandas`, `h3`, `scikit-learn`. GDAL from conda-forge. |
| CRS | Earth: EPSG:4326 for storage, equal-area for statistics. Moon `IAU_2015:30100`, Mars `IAU_2015:49900`. Polar products use polar stereographic. |
| Storage | Feature table as **Parquet** (one row per H3 cell); rasters as **COG**; cubes as Zarr |
| Web app | Leaflet / MapLibre + GIBS tiles. Precomputed scores served as static GeoJSON or PMTiles, so no backend is needed. |
| Data volume | Screen with coarse API layers. Download high-resolution data only for shortlisted areas. Pre-download Moon/Mars products before the event. |

## Optional ML layer (if time allows)
- **Unsupervised:** k-nearest-neighbours in the normalised feature space (Earth cells vs target signatures). It is simple, explainable and good enough.
- **Terrain texture embeddings:** train a small self-supervised model on DEM hillshade patches from Earth, Moon and Mars (all resampled to the same metres per pixel), then search for Earth patches nearest to lunar-polar patches. Strong "surprise" potential; higher risk.
