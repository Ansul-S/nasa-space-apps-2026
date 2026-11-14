# 06 · CSA RADARSAT Constellation Mission, RCM (Earth)

**Link:** https://donnees-data.asc-csa.gc.ca/en/dataset/rcm · **Body:** Earth · **Priority:** MEDIUM (unique radar link to the Moon)
**Licence:** Open Government Licence – Canada, plus the RCM user licence that comes with each product.

## What it is
Three C-band (5.6 cm) SAR satellites, launched 12 June 2019. Radar works **day or night and through cloud**, which matters for polar regions. Revisit: daily over Canada, daily access to 90% of the world and up to 4×/day in the Arctic.

Its standout feature is **Compact Polarimetry (CP)**: it transmits circular polarisation and receives H and V coherently (files are tagged `CH CV`). **LRO Mini-RF uses the same hybrid-polarity design** on the Moon.

## What we can get

| Source | What is there | Access |
|---|---|---|
| **CSA open-data samples** | Folders for Antarctica, Canadian Arctic, Nairobi, Fort McMurray, Lake Superior, etc. Antarctica has a Jan 2020 **compact-pol ScanSAR 30 m** scene in GRD, SLC and **MLC** formats. | Direct HTTPS, no login: `https://donnees-data.asc-csa.gc.ca/users/OpenData_DonneesOuvertes/pub/RCM/` |
| **EODMS archive** (NRCan) | Search and order of openly released RCM products | https://www.eodms-sgdot.nrcan-rncan.gc.ca (free account, some products need vetting) |
| **RCM ARD** (NRCan) | CEOS **analysis-ready**, 30 m, compact-pol, **all of Canada's landmass every 12 days** | STAC: `https://www.eodms-sgdot.nrcan-rncan.gc.ca/stac/collections/rcm-ard` (**returned HTTP 503 on 13 Nov 2026**, so retry; it may be intermittent) |

Also linked from the page: **EO Visualization and Search Tutorial** (https://github.com/asc-csa/EO-Visualization-and-Search-Tutorial). It is a Jupyter notebook that searches EODMS through its REST API and shows results on an `ipyleaflet` map.

## Why it matters for us
- **Same measurement on Earth and Moon.** From CP data we can compute the **circular polarisation ratio (CPR)** and the m-χ decomposition. Mini-RF publishes the same quantities for the lunar poles. That allows a direct "radar-twin" comparison: which Earth surfaces scatter radar like lunar regolith, rocky crater rims or possible ice?
- **Polar and permafrost terrain.** The Canadian High Arctic has patterned ground, pingos, ice-rich permafrost and polar desert, all Mars periglacial analogs. Much of it is far less studied than Haughton Crater.
- **Surface roughness and moisture.** Backscatter separates smooth from rough and dry from wet surfaces, which supports landing and mobility analogs.

## How to connect
```python
# 1) Open-data samples: plain HTTPS download, then GDAL/rasterio
#    .../pub/RCM/Antarctica/RCM3_OK1050586_PK1050588_3_SC30MCPB_20200124_083635_CH_CV_GRD/
# 2) EODMS REST API via the official client
#    pip install py-eodms-rapi
from eodms_rapi import EODMSRAPI
rapi = EODMSRAPI("<eodms_user>", "<eodms_password>")
rapi.search("RCMImageProducts", filters={"Beam Mnemonic": ("like", ["SC30%"])},
            features=[("intersects", "POLYGON((-90 75, -80 75, -80 80, -90 80, -90 75))")],
            dates=[{"start": "20240101_000000", "end": "20241231_235959"}])
res = rapi.get_results("full")
```
(Check the `py-eodms-rapi` docs for current field names before relying on the filter keys.)

## Gotchas
- SAR is **not plug-and-play**. Plan for radiometric calibration to σ⁰, dB conversion, speckle filtering and terrain correction. **ESA SNAP** handles RCM products. ARD skips most of these steps.
- CPR formula: in Mini-RF/Raney notation, **CPR = (S₁ − S₄)/(S₁ + S₄)**, from Stokes parameters. The sign convention depends on transmit handedness, so check the product documentation.
- C-band (RCM) and S-band (Mini-RF) probe different roughness scales. Compare rankings, not raw values. Earth surfaces must be **dry or frozen** for a fair comparison, because water changes radar response strongly.
- Coverage is Canada-focused, plus the sample sites.
