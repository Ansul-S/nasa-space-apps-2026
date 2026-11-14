# 02 · NASA Worldview + GIBS (Earth)

**Link:** https://worldview.earthdata.nasa.gov · **Body:** Earth · **Priority:** MEDIUM (visualisation and storytelling, not analysis)
**Access:** free, no login.

## What it is
A browser map for exploring **1,000+ satellite imagery layers** day by day, many going back to 2000. It is a front end to **GIBS** (Global Imagery Browse Services), which serves the same layers as standard **map tiles (WMTS/WMS)**. That means we can put them directly into our own web map.

Useful features:
- Timeline and animation (export as GIF)
- Side-by-side **compare** mode
- **Arctic and Antarctic polar projections**
- Snapshot image download
- Shareable permalinks
- **Events** tab, fed by NASA's EONET natural-event tracker

## What it provides
Rendered **images** (coloured PNG/JPEG). It does not provide measured values. Treat it as a viewing layer and get numbers from Earthdata Search.

Layers relevant to analogs (exact GIBS identifiers):

| Purpose | Layer ID |
|---|---|
| True-colour context | `MODIS_Terra_CorrectedReflectance_TrueColor` |
| Day / night surface temperature | `MODIS_Terra_Land_Surface_Temp_Day`, `MODIS_Terra_Land_Surface_Temp_Night` |
| Terrain | `ASTER_GDEM_Color_Shaded_Relief`, `SRTM_Color_Index`, `BlueMarble_ShadedRelief` |
| Dust | `MERRA2_Dust_Surface_Mass_Concentration_Monthly`, `GOES-East_ABI_Dust`, `AIRS_L2_Dust_Score_Day` |
| Aerosol | `MODIS_Terra_Aerosol_Optical_Depth_3km`, `OMI_Absorbing_Aerosol_Optical_Depth` |
| Albedo / vegetation | `MODIS_Combined_L3_Black_Sky_Albedo_Daily`, `MISR_Land_NDVI_Average_Monthly` |
| Labels | `Reference_Features` |

## Why it matters for us
- **Fast visual scouting** of candidate regions before downloading data.
- **Ready-made basemaps** for our app, with no hosting cost.
- **Process storytelling:** animate a real dust storm over an Earth desert next to a Mars dust-storm image. EONET's `dustHaze` and `volcanoes` event categories give dated examples.

## How to connect
1. **GIBS tiles in Leaflet / OpenLayers / Cesium** (no key):
   ```js
   // Template: /wmts/{proj}/best/{Layer}/default/{YYYY-MM-DD}/{TileMatrixSet}/{z}/{y}/{x}.{ext}
   L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' +
     'MODIS_Terra_CorrectedReflectance_TrueColor/default/2025-06-01/' +
     'GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', { maxZoom: 9 }).addTo(map);
   ```
   Each layer has its own `TileMatrixSet` and file format. Look them up in GetCapabilities: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml`. Polar tiles use `epsg3031` (Antarctic) and `epsg3413` (Arctic).
2. **Worldview Snapshots API** (static image of any bbox and date):
   `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=<id>&CRS=EPSG:4326&TIME=2025-06-01&BBOX=S,W,N,E&FORMAT=image/jpeg&WIDTH=1024&HEIGHT=1024`
3. **EONET API** (dated natural events): `https://eonet.gsfc.nasa.gov/api/v3/events?category=dustHaze`

## Gotchas
- Pixel colours come from a colour map, so don't run statistics on them.
- Daily layers have swath gaps and clouds. Monthly layers are cleaner for overview maps.
- Some layers only exist in some projections.
