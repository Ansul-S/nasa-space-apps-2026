# 03 · NASA Planetary Data System, PDS (Moon + Mars)

**Link:** https://pds.nasa.gov · **Body:** Moon, Mars (and more) · **Priority:** HIGH (our main source of **Mars** data)
**Access:** free, no login.

## What it is
NASA's long-term archive for planetary mission data. It is split into **discipline nodes**:

| Node | Hosts (relevant to us) |
|---|---|
| **Geosciences** (WUSTL) | Moon and Mars surface data: LOLA, Diviner, Mini-RF, LEND, MOLA, CRISM, TES, GRS. Runs **ODE** (Orbital Data Explorer). |
| **Cartography & Imaging Sciences** (JPL/USGS) | Images and mosaics: HiRISE, CTX, THEMIS, LAMP |
| **Atmospheres** (NMSU) | Mars atmosphere and dust records |
| **PPI** (UCLA) | Radiation and plasma (e.g. LRO CRaTER) |
| **NAIF** (JPL) | SPICE geometry (sun position, illumination) |

Data comes in two label standards: **PDS4** (XML labels, current) and **PDS3** (`.LBL` + `.IMG`, legacy). GDAL reads both.

## Mars datasets to focus on (product types verified in ODE)

| Dimension | Dataset (ODE product type) | What it gives | Analog use |
|---|---|---|---|
| Topography | **MGS MOLA MEGDR** | Global elevation (up to 128 px/deg, ~463 m) | Slope and roughness at matched scale vs Earth DEMs |
| Topography (fine) | MEX HRSC `DTMRDR`; MRO **HiRISE** `RDR4` (~0.25–0.5 m images) | Regional DTMs and very high-resolution images | Landing-scale terrain, dunes, polygons, skylights |
| Mineralogy | **MRO CRISM** `MTRDR`, `MRDR4` | VNIR–IR spectra and mineral summary maps | Compare with **EMIT** on Earth (clays, sulfates, carbonates, iron oxides) |
| Thermal | **MGS TES `TIMAP`** (thermal inertia map) | Global thermal inertia | Compare with Earth apparent thermal inertia (MODIS) |
| Water / ice | **ODY GRS** `ELEMTS`, `DND` | Element maps (H, Cl, Fe, Si…) and neutron data (subsurface hydrogen ≈ ice) | Ice-rich ground. Compare with Earth permafrost. |
| Subsurface | MRO **SHARAD** `USRDRV2`, MEX MARSIS | Radar sounding of buried ice and layers | Subsurface analogs (compare with Earth SAR) |

Moon datasets in PDS: see `04_LRO.md` and `05_LRO_Diviner.md`.

## How to connect
1. **ODE web UI:** https://ode.rsl.wustl.edu/mars/ and https://ode.rsl.wustl.edu/moon/. Search by map area, instrument and product type.
2. **ODE REST API** (JSON, no key). Tested and working:
   ```bash
   # List product types for an instrument host on Mars
   curl "https://oderest.rsl.wustl.edu/live2/?query=iipt&odemetadb=mars&output=JSON"
   # Find products + download URLs (example: TES thermal inertia map)
   curl "https://oderest.rsl.wustl.edu/live2/?query=product&results=fp&target=mars&ihid=MGS&iid=TES&pt=TIMAP&output=JSON"
   ```
   `results=fp` returns file URLs. Download them with `requests` and open with `rasterio`/GDAL.
3. **PDS Registry API** (search across all nodes): `https://pds.nasa.gov/api/search/1/products`
4. **Python readers:** `rasterio`/GDAL (PDS3 `.IMG` and PDS4); `pds4_tools` for PDS4 tables.

## Easier copies of the same data (open, not on the official list)
- **USGS Astrogeology STAC** (`https://stac.astrogeology.usgs.gov/api/`): analysis-ready **Cloud-Optimized GeoTIFFs**, including HiRISE DTMs, CTX DTMs, THEMIS mosaics, Kaguya TC DTMs (including the **south polar** set) and LOLA. Works with `pystac-client` just like Earth STAC catalogs.
- **NASA Solar System Treks** (https://trek.nasa.gov/mars/, /moon/): browser maps with tile services, useful for our UI.
- **Mars Climate Database** (https://www-mars.lmd.jussieu.fr/): modelled Mars surface temperature, pressure and dust by season. Much easier than raw atmospheric records.

## Gotchas
- Choose **derived or gridded** products (levels 3–5), not raw EDRs.
- Planetary coordinates: longitudes are usually **0–360° East**. CRS codes `IAU_2015:49900` (Mars) and `IAU_2015:30100` (Moon) work in PROJ ≥ 8.2.
- Files are large. Download only the tiles around your target sites.
