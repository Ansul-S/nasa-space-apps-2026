# 10 · ESA Open Science Catalog (Earth)

**Link:** https://opensciencedata.esa.int · **Body:** Earth · **Priority:** LOW–MEDIUM (a few unique research layers)
**Access:** free, no login to browse. Each product links to its own host.

## What it is
A **STAC-based catalogue of research datasets, workflows and experiments** produced by ESA-funded Earth-observation science projects. It is part of ESA's EarthCODE initiative. On 13 Nov 2026 it listed **366 products**, organised by:
- **Themes:** Atmosphere, Cryosphere, Land, Magnetosphere-Ionosphere, Oceans, Solid Earth
- **Variables · Projects · EO Missions · Products · Workflows · Experiments**

It catalogues data rather than hosting one large archive. Expect **specialised, often regional** products rather than global standard layers.

## Products relevant to analogs (from the catalogue)

| Theme | Product (examples) | Analog use |
|---|---|---|
| Dust ⭐ | **CALIPSO global dust climatologies**: pure-dust optical depth, **dust-layer top/base boundaries**, dust concentration profiles | Rank Earth deserts by dust activity and vertical dust structure. **Process analog for Mars dust storms.** |
| Solid Earth | Geothermal heat flux: Antarctica (GOCE), Greenland (GOCE + Swarm), aeromagnetic estimates | Subsurface heat, and conditions for subglacial water and habitability |
| Cryosphere | Antarctic bedrock topography (BedMachine); CryoSat land-ice elevation for Antarctica, **Arctic Canada**, Iceland, Svalbard, Russian Arctic, Southern Andes | Ice-terrain analogs for Mars polar caps and glaciers |
| Cryosphere | Snow grain size and spectral/broadband albedo (Arctic, Greenland; Sentinel-3) | Bright icy surfaces vs. polar-cap spectra |
| Land | Glacier-forefield slope instabilities; glacier lake dynamics (Swiss Alps, S1/S2) | Mass-wasting and periglacial processes |

## Why it matters for us
- Not a core source. Use it for **one or two distinctive layers** the standard archives lack, especially the **dust-layer climatology**, which supports a "process analog" story.
- Its **workflows** (often notebooks) can show us how a product was derived.

## How to connect
| Method | URL |
|---|---|
| Web browser (STAC Browser) | https://opensciencedata.esa.int |
| Static STAC root (JSON) | `https://esa-earthcode.github.io/open-science-catalog-metadata/catalog.json` |
| STAC API | `https://eoapi.workspace.earthcode.eox.at/stac` (responded 200) |
| Metadata on GitHub | https://github.com/ESA-EarthCODE/open-science-catalog-metadata |

```python
import pystac
cat = pystac.Catalog.from_file(
    "https://esa-earthcode.github.io/open-science-catalog-metadata/catalog.json")
products = cat.get_child("products")
for c in products.get_children():
    if "dust" in (c.title or "").lower():
        print(c.title, [l.href for l in c.links if l.rel in ("via", "item", "child")][:2])
```

(Tested: the CALIPSO dust products resolve to the **LIVAS** dataset, served by the National Observatory of Athens over public FTPS.)

## Gotchas
- **Heterogeneous:** each product has its own format (NetCDF, GeoTIFF, CSV), host and licence. Check before you commit.
- Many products are **regional or time-limited**, so global consistency is not guaranteed.
