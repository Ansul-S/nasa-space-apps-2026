# C · Data Access Cheatsheet: Accounts, Endpoints, Code

All endpoints below were tested on **13 Nov 2026**. Per-source code is in each resource file. This page is the one-stop reference.

## 1. Accounts to create before the hackathon
| Account | Needed for | Required? |
|---|---|---|
| **NASA Earthdata Login**: https://urs.earthdata.nasa.gov | Downloading any NASA Earth data (EMIT, MODIS, NASADEM, MERRA-2…). Also approve the *NASA GESDISC DATA ARCHIVE* app in your profile. | **Yes** |
| **Copernicus Data Space**: https://dataspace.copernicus.eu | Sentinel downloads, openEO, Sentinel Hub | **Yes** |
| EODMS (NRCan): https://www.eodms-sgdot.nrcan-rncan.gc.ca | RCM / RADARSAT-1 beyond the open samples | Optional |
| JAXA G-Portal: https://gportal.jaxa.jp | Full-resolution JAXA granules | Optional (JAXA Earth API needs none) |
| PDS / ODE, AWS open buckets, GIBS, USGS STAC | — | **No account** |

## 2. Environment
```bash
conda create -n analog -c conda-forge python=3.11 gdal rasterio rioxarray xarray geopandas
conda activate analog
pip install earthaccess pystac-client openeo jaxa-earth h3 pds4_tools py-eodms-rapi scikit-learn boto3
```

## 3. Endpoint map
| Source | Endpoint | Auth | Tested |
|---|---|---|---|
| CMR search (NASA Earth) | `https://cmr.earthdata.nasa.gov/search/` | none to search | ✅ |
| CMR-STAC (LP DAAC cloud) | `https://cmr.earthdata.nasa.gov/stac/LPCLOUD` (e.g. collection `EMITL2BMIN_002`) | download: Earthdata | ✅ |
| AppEEARS (point/area subsets) | `https://appeears.earthdatacloud.nasa.gov` | Earthdata | ✅ (site) |
| GIBS tiles | `https://gibs.earthdata.nasa.gov/wmts/{epsg}/best/...` | none | ✅ |
| Worldview snapshots | `https://wvs.earthdata.nasa.gov/api/v1/snapshot` | none | ✅ |
| EONET events | `https://eonet.gsfc.nasa.gov/api/v3/events?category=dustHaze` | none | ✅ |
| ODE REST (Moon / Mars) | `https://oderest.rsl.wustl.edu/live2/` | none | ✅ |
| PDS Registry API | `https://pds.nasa.gov/api/search/1/products` | none | ✅ |
| Diviner PRP (direct) | `https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/` | none | ✅ |
| USGS Astrogeology STAC | `https://stac.astrogeology.usgs.gov/api/` | none | ✅ |
| RADARSAT-1 COGs | `s3://radarsat-r1-l1-cog/` (ca-central-1) | none (`--no-sign-request`) | ✅ |
| RCM open samples | `https://donnees-data.asc-csa.gc.ca/users/OpenData_DonneesOuvertes/pub/RCM/` | none | ✅ |
| RCM ARD STAC | `https://www.eodms-sgdot.nrcan-rncan.gc.ca/stac/` | ? | ⚠️ HTTP 503 |
| CDSE STAC | `https://stac.dataspace.copernicus.eu/v1` | search none; download token | ✅ |
| CDSE openEO | `https://openeo.dataspace.copernicus.eu` | CDSE (OIDC) | ✅ |
| CDSE OData | `https://catalogue.dataspace.copernicus.eu/odata/v1/Products` | search none | ✅ |
| Copernicus DEM (AWS) | `https://copernicus-dem-30m.s3.amazonaws.com/` | none | ✅ |
| ESA OSC STAC (static) | `https://esa-earthcode.github.io/open-science-catalog-metadata/catalog.json` | none | ✅ |
| ESA OSC STAC API | `https://eoapi.workspace.earthcode.eox.at/stac` | none | ✅ |
| JAXA Earth API STAC | `https://data.earth.jaxa.jp/stac/cog/v1/catalog.json` | none | ✅ |

## 4. One STAC pattern, three planets
The same few lines work for Earth (CDSE, CMR) and for Moon/Mars (USGS):
```python
from pystac_client import Client
bbox = [162.5, -78.0, 163.5, -77.5]   # W,S,E,N  (example: McMurdo Dry Valleys)
dem = Client.open("https://stac.dataspace.copernicus.eu/v1").search(
        collections=["cop-dem-glo-30-dged-cog"], bbox=bbox).item_collection()
emit = Client.open("https://cmr.earthdata.nasa.gov/stac/LPCLOUD").search(
        collections=["EMITL2BMIN_002"], bbox=[-70.5, -25.5, -68.5, -23.0], max_items=5).item_collection()
moon = Client.open("https://stac.astrogeology.usgs.gov/api/").search(
        collections=["kaguya_terrain_camera_usgs_dtms_v2_southpolar"], max_items=5).item_collection()
```
(All three searches tested. CDSE asset hrefs are `s3://eodata/...`, which needs CDSE S3 keys. For the DEM without keys, use the AWS mirror instead.)

## 5. Download before hackathon day
| Item | Source | Size |
|---|---|---|
| Diviner PRP south (`dlre_prp_south.tab`) | PDS Geosciences | ~605 MB |
| LOLA south-polar sun/Earth visibility (`avgvisib_65s_240m_201608*.img`) | ODE → PDS | ~82 MB each |
| LOLA polar slope, roughness and PSR GDRs for target regions | ODE (`GDRDSM`, `GDRDRM`, `GDRPSR`) | varies |
| TES thermal inertia map (`TIMAP`) | ODE | small |
| Mars DTMs / THEMIS mosaics for target sites | USGS STAC | varies |
| Copernicus DEM tiles for 3–5 Earth test regions | AWS mirror | 1°×1° tiles |

## 6. Common pitfalls
- **Longitudes:** planetary data is often 0–360° E; Earth uses −180–180°.
- **Projections:** lunar polar products are polar stereographic; MODIS uses a sinusoidal grid; RADARSAT-1 COGs are in image geometry with GCPs.
- **Units:** check the scale factor and offset. Raw MODIS LST is stored as integers (multiply by 0.02 to get K); JAXA Earth API values are already in K.
- **Quotas:** openEO 10,000 credits/month; Sentinel Hub 10,000 processing units/month. Test small areas first.
