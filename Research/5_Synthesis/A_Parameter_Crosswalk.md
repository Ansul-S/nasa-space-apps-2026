# A · Parameter Crosswalk: Moon/Mars Measurement → Earth Dataset

This file is the core mapping. For each analog dimension it lists the measurement on the target body, the Earth dataset that measures the same thing, the metric that can be compared, and where the analogy breaks down.

## 1. Same-physics bridges (our strongest scientific arguments)
When the **same kind of instrument** measures both worlds, the comparison holds up best.

| Bridge | Moon / Mars | Earth | Comparable metric |
|---|---|---|---|
| Laser altimetry | LOLA (Moon), MOLA (Mars) | ICESat-2 `ATL06/08`; Copernicus DEM / NASADEM | Slope distribution, RMS roughness, **Hurst exponent** at matched baselines |
| Thermal-IR emissivity | Diviner Christiansen feature (Moon), TES/THEMIS (Mars) | ASTER `AG100`, MODIS `MOD21A2` | Silica / mafic index |
| Compact-pol radar | **Mini-RF** (Moon) | **RCM** compact-pol | Circular polarisation ratio (CPR), m-χ decomposition |
| Imaging spectroscopy | CRISM (Mars), M3 (Moon) | **EMIT** `EMITL2BMIN/ARFL` | Mineral classes present; spectral-angle similarity |
| Ice stability | Diviner `ice_depth` (Moon); GRS / ground-ice maps (Mars) | Dry Valleys-type ice-cemented ground; permafrost, snow, ice layers | Depth to stable ice, dry insulating cover |
| Thermal inertia | Diviner thermophysics; TES `TIMAP` | Apparent thermal inertia from MODIS day/night LST + `MCD43A3` albedo | ATI ≈ (1 − albedo) / (T_day − T_night) |
| Illumination / horizon | LOLA `GDRVIS` sun & Earth visibility, `GDRPSR` | Horizon model on Copernicus DEM at high latitude | % time sunlit, shadow fraction |

## 2. Moon: South Pole base sites

| Dimension | Moon data | Earth data (resource) | Metric | Where the analogy breaks |
|---|---|---|---|---|
| Terrain / landing | LOLA slope, roughness, Hurst; SLDEM | Copernicus DEM (ESA), NASADEM (NASA), AW3D30 (JAXA), ICESat-2 | Slope histogram, roughness at same baseline | Erosion softens Earth craters. Gravity changes slope stability. |
| Light / power | LOLA sun visibility, PSR map | DEM horizon model at 70–85° latitude | % sunlit, shadow length | Earth's 23.4° tilt (vs 1.5°) gives a polar day/night cycle. Air scatters light, so shadows are not black. |
| Communications | LOLA **Earth visibility** | DEM line-of-sight to a fixed bearing | % time visible | Proxy only |
| Temperature | Diviner PRP `temp_avg`, `temp_max`; PCP | MODIS LST normals (JAXA Earth API), `MOD11A2`, CLMS diurnal LST | **Percentile** of cold/stability, not kelvin | PSRs ≈ 25–40 K vs Earth minimum ≈ 175 K, so **no absolute match** |
| Ice / volatiles | Diviner `ice_depth`, LEND H, Mini-RF CPR, LAMP frost | Polar ice-cemented ground, permafrost, snow (`MOD10CM`), RCM radar | Ice presence and depth, CPR pattern | Lunar ice is cold-trapped and sublimates in vacuum. Earth ice also melts and moves. |
| Regolith / composition | Diviner CF; anorthositic highlands | ASTER `AG100` emissivity; anorthosite or basaltic-ash terrain (EMIT, S2) | Silica index, albedo | Earth has no space-weathered, glassy, electrostatic dust |
| Operations | Slope, rocks, light, comms | DEM, WorldCover (bare), remoteness | Traversability score | Vacuum, low gravity and radiation **cannot** be reproduced |

## 3. Mars: landing and exploration sites

| Dimension | Mars data | Earth data (resource) | Metric | Where the analogy breaks |
|---|---|---|---|---|
| Mineralogy | **CRISM**, TES, GRS element maps | **EMIT** (hematite, goethite, gypsum, clays, calcite), ASTER `AG100`, Sentinel-2 SWIR ratios | Mineral-class overlap, spectral similarity | Earth weathering involves more liquid water and biology |
| Terrain | MOLA MEGDR, HRSC/HiRISE DTMs (USGS STAC) | Copernicus DEM, NASADEM, ICESat-2 | Slope, roughness, crater and dune morphometry | Lower gravity on Mars. Different erosion rates. |
| Temperature | TES/THEMIS; Mars Climate Database | MODIS/SGLI LST normals, CLMS diurnal cycle | Mean, minimum, **diurnal amplitude** | Mars mean ≈ −60 °C, overlapping only with polar/high-altitude Earth |
| Thermophysics | TES `TIMAP`, THEMIS | Apparent thermal inertia (MODIS + albedo), `AG100` | ATI rank | ATI is only a proxy for true thermal inertia |
| Water / aridity / ice | GRS hydrogen (`DND`), SHARAD | IMERG, GSMaP, SMAP, AMSR2, snow cover, RCM / RADARSAT-1 | Precipitation, soil-moisture percentile, ground ice | Even hyperarid Earth deserts get fog or rare rain |
| Dust & aeolian | Dust storms, dunes (HiRISE/CTX), MCD dust | MERRA-2 dust (`M2TMNXAER`), Sentinel-5P aerosol index, CALIPSO dust layers (ESA OSC), EONET `dustHaze`; dune migration from RADARSAT-1 + Sentinel-1 | Dust frequency, AOD, dune speed | Mars air is ~1% as dense, so saltation thresholds differ |
| Subsurface / caves | SHARAD, MARSIS; skylights in HiRISE | PALSAR L-band (JAXA), volcanic fields from DEM; **no global cave dataset**, so use local/USGS data | Buried-feature detection | Data gap. State it honestly. |
| Habitability | Past water, evaporites | NDVI (`MOD13A3`), land cover `MCD12Q1` (barren), EMIT evaporites | Low-NDVI + evaporite mask | Earth is never sterile. This is also why analog biosignature studies are useful. |
| Radiation / atmosphere | MSL RAD, thin CO₂ | none | — | **Breaks completely** (magnetosphere, thick atmosphere) |

## 4. Rules for comparing values across bodies
1. **Never compare raw kelvin or pascals across bodies.** Compare **percentiles within each body**, dimensionless ratios (e.g. diurnal amplitude ÷ mean T) or categories (mineral class present / absent).
2. **Match spatial baselines.** Slope or roughness at 240 m on the Moon must be compared with an Earth DEM resampled to 240 m.
3. **Use radar only on dry or frozen ground.** Water dominates the radar response on Earth.
4. **Report every dimension separately** (an "analog card"), then a weighted total. The challenge explicitly rewards saying where the analogy fails.
