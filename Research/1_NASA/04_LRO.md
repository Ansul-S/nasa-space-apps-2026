# 04 · NASA Lunar Reconnaissance Orbiter, LRO (Moon)

**Link:** https://pds-geosciences.wustl.edu/missions/lro/ · **Body:** Moon · **Priority:** HIGH (defines the **Moon-base target profile**)
**Access:** free, no login.

## What it is
LRO has mapped the Moon since 2009. The PDS Geosciences Node archives **LOLA, Diviner, Mini-RF, LEND and Radio Science** data. LROC images live at the LROC node (ASU), LAMP at the Imaging Node and CRaTER at PPI.

## Products to focus on (product types verified in ODE)

### LOLA laser altimeter: terrain, light and line-of-sight
| ODE type | Product | Moon-base meaning |
|---|---|---|
| `GDRDEM`, `SLDEM` | Elevation (SLDEM ≈ 59 m, ±60° latitude; polar GDRs at higher resolution) | Terrain baseline |
| **`GDRDSM`** | Slope map | Landing safety, rover mobility |
| **`GDRDRM`**, `RMHE`, `RMMAS` | Roughness, Hurst exponent, median absolute slope | Surface texture, a scale-aware metric we can compute on Earth DEMs too |
| **`GDRVIS`** | **Average Sun visibility** (e.g. `AVGVISIB_65S_240M_201608`, 240 m, 65°S to pole) | Solar power potential |
| `GDRVIS` (`…_EARTH`) | **Average Earth visibility** | Direct-to-Earth communications |
| **`GDRPSR`** | Permanently shadowed regions | Ice cold traps |
| `GDRDAM` | 1064 nm albedo | Surface brightness |

### Other instruments
| Instrument | What it gives | Use |
|---|---|---|
| **Mini-RF** | S-band (12.6 cm) and X-band (4.2 cm) radar in **hybrid (compact) polarimetry**: circular polarisation ratio (**CPR**), global mosaics, bistatic data (Release 67 came out 21 Sep 2026) | Roughness and possible ice. **Same polarimetric design as Canada's RCM** (see `2_CSA/06`). |
| **LEND** | Neutron counts, i.e. hydrogen (ice proxy). Coarse (tens of km). | Resource potential |
| **LROC** (lroc.sese.asu.edu) | NAC images ~0.5 m/px, WAC global mosaic ~100 m, NAC DTMs | Visual comparison, boulders, pits |
| **LAMP** | Far-UV; frost signatures in PSRs | Surface frost |
| **CRaTER** | Radiation dose | Documents **where Earth analogs fail** (radiation) |

## Why it matters for us
LOLA and Diviner let us turn each candidate South Pole region into a **numeric signature**:

> slope distribution · roughness/Hurst · % sunlight · % Earth visibility · PSR fraction · temperature · ice-stability depth

We then compute the **same metrics on Earth** where the physics allows it. Slope, roughness and Hurst come from Copernicus DEM, NASADEM or ICESat-2. Illumination comes from a DEM horizon model at high latitudes.

## How to connect
**ODE REST** (tested). Example: find the south-pole sun-visibility maps and their download URLs:
```bash
curl "https://oderest.rsl.wustl.edu/live2/?query=product&results=fp&target=moon&ihid=LRO&iid=LOLA&pt=GDRVIS&output=JSON"
# -> e.g. https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/extras/illumination/img/avgvisib_65s_240m_201608.img (+ .lbl)
```
```python
import rasterio
with rasterio.open("avgvisib_65s_240m_201608.lbl") as src:   # GDAL reads the PDS3 label
    sun = src.read(1); print(src.crs, src.res)                 # polar stereographic, 240 m
```
Other ways in:
- **LROC QuickMap** (https://quickmap.lroc.asu.edu): fastest way to *look* at LOLA, LROC and Diviner layers together and draw profiles.
- **LOLA Data Node** (http://imbrium.mit.edu): newest high-resolution polar DEMs, sometimes ahead of PDS.

## Gotchas
- Polar products use **polar stereographic** projections. Reproject before comparing with lat/lon grids.
- Match **baselines** when comparing slope or roughness: a 240 m slope on the Moon ≠ a 30 m slope on Earth. Resample the Earth DEM to the same baseline.
- Mini-RF (S-band) and RCM (C-band) use different wavelengths. Compare CPR **patterns and rankings**, not absolute values.
