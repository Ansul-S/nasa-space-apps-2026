# D · What We Can Build With These Resources

We are not building yet. This page lists options so we can choose one on day 1.

## Option overview

| # | Concept | Main data | Difficulty | "Surprise us" potential |
|---|---|---|---|---|
| **1** | **Analog Finder**: global similarity map + "analog cards" | JAXA Earth API normals, MERRA-2, MODIS, Copernicus DEM; LOLA/Diviner + MOLA/TES/CRISM targets | Medium | High (systematic, finds under-studied sites) |
| 2 | **Twin Terrain**: Earth terrain that matches lunar South Pole topography and lighting | LOLA slope/roughness/Hurst/sun-visibility vs Copernicus DEM + horizon model | Medium | High (useful for rover and landing tests) |
| 3 | **Mineral Mars on Earth**: Earth places with Mars mineral assemblages | EMIT minerals + Sentinel-2 vs CRISM at Jezero / Gale / Meridiani | Medium | Medium–High |
| 4 | **Radar Twins**: Earth surfaces that scatter radar like the lunar poles | RCM compact-pol CPR vs Mini-RF CPR | High (SAR processing) | Very high (novel, but narrow coverage) |
| 5 | **Process Analogs**: dust storms and dune migration, Earth vs Mars | EONET `dustHaze`, MERRA-2, S5P, CALIPSO (OSC), RADARSAT-1 + Sentinel-1 | Medium | Medium |
| 6 | **Ice Table Explorer**: where ice stays stable under dry cover on Moon, Mars and Earth | Diviner `ice_depth`, Mars ground-ice data, Antarctic / Arctic ground ice, RCM | Medium–High | High (three-body process story) |

## Recommendation
**Build #1 as the backbone and add one deep-dive (#2 or #3) as the showcase.**
- #1 answers the challenge directly: "systematically search Earth", "similarity metrics", "explain what's analogous and what's not", "look beyond well-known sites".
- The deep-dive gives a concrete, explained site that judges remember.
- #2 fits **permanent Moon base** best: South Pole terrain plus illumination is what base planners care about.
- #3 fits **Mars** best: EMIT and CRISM are directly comparable instruments.

## Minimum viable product (what "done" looks like)
1. A web map (Leaflet / MapLibre + GIBS basemap) with a **target selector**: Moon South Pole region / Mars site.
2. An Earth layer coloured by **composite analog score**, with **weight sliders** per dimension.
3. Click a cell → **analog card**: per-dimension match bars, "analogous because…", "breaks down because…" (gravity, vacuum, radiation are always listed), and suggested tests (rover mobility, ISRU, instrument calibration).
4. A **validation panel**: known analog sites shown with their scores, proving the method works.
5. A short written report (the challenge encourages documentation for the public).

## Scope guards
- Use at most **2–3 targets per body** and **5–7 dimensions**. Depth beats breadth.
- Use **pre-aggregated** layers for the global pass. Download high-resolution data only for the shortlist.
- Skip anything that needs raw SAR processing unless one teammate owns it full time. RCM CPR is the stretch goal.

## Open questions for the team (decide on day 1)
- Moon focus, Mars focus, or both? Both is fine when they share one engine.
- Which 2–3 targets on each body?
- Which deep-dive: #2 (terrain/light) or #3 (minerals)?
- Who owns data pipeline, scoring, frontend and report?
