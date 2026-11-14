# 04 · Proposed Solution

**Status:** proposal for team review. Nothing has been built. It is based on `01` (problem), `02` (user) and `03` (approaches).

## In one sentence
A **test-first analog planner**:
1. Choose a Moon or Mars target and what you want to test.
2. Get a ranked shortlist of Earth sites with the **best date and time windows** for that test.
3. Each site comes with a **fidelity report**: what matches, what partly matches, and what Earth can't reproduce.

## USP
> **"Where and when on Earth should we test this, and how faithful will it be?"**, answered with numbers.

No existing option combines all three:
1. Ranking **for a specific test**, not a general idea of "Moon-like".
2. **Time windows**: the same site is a good analog in some weeks and a poor one in others.
3. **Measured limits**: every result says what won't carry over.

**The story for judges:**
- NASA rehearses South Pole moonwalks **at night with a spotlight** in Arizona, because the Sun there sits in the Artemis 0–7° band for only about 1.2 hours a day.
- Our tool finds **where and when on Earth the real Sun does this for 5–10 hours a day**, over real terrain.
- It is upfront about what it still can't reproduce.

## Core features (three, no more)
| # | Feature | What the user does / gets | Feature check |
|---|---|---|---|
| 1 | **Test-first search** | Pick a target (e.g. Mons Mouton, Malapert Massif) and a test objective. The weights per dimension are shown and can be adjusted. Get a ranked map and list, with a "new site" flag for places that are not well-known analogs. | Who: test lead. Core problem: yes, it removes familiarity bias. Essential: yes. |
| 2 | **Analog calendar** | For each candidate, a 12-month strip of how well it matches. For lighting, the exact daily windows when the Sun is in the target's elevation band, with sun direction. | Who: test lead choosing dates. Core problem: yes, it is the time dimension. Essential: yes, it is the USP. |
| 3 | **Fidelity card + export** | Per dimension: target value, Earth value, match level (**match / partial / breaks down / impossible on Earth**) and the data source. Export as CSV, GeoJSON or a printable card for test plans and proposals. | Who: test lead justifying the site. Core problem: yes, it states the limits. Essential: yes, and it fits their existing workflow. |

## Test objectives for the first version (proposal)
| Body | Objective | Dimensions used | Varies over time |
|---|---|---|---|
| Moon | **Navigation and EVA under low sun** | Hours of sun in the target band, local horizon, slope, roughness, bare and snow-free ground | Hourly and monthly |
| Moon | **Rover mobility on polar highland slopes** | Slope distribution at a matched baseline, roughness, bare and snow-free ground | Monthly (snow) |
| Mars | **Science / instrument test on Mars-like ground** | Hyperaridity, no vegetation, Mars-relevant minerals (EMIT), temperature and day–night range | Monthly |

**Stretch goals:** Moon landing hazard detection; Mars ground-ice / ISRU testing.

## How it works
```
TARGETS (from existing research files)       EARTH (bare land only, H3 grid)
LOLA slope / roughness / sun visibility       Copernicus DEM slope / roughness (target baseline)
Diviner temperatures                          MODIS monthly snow, MODIS / JAXA monthly LST
MOLA / TES / CRISM (Mars)                     Precipitation and NDVI normals, EMIT minerals
              │                                         │
              └──────────►  SCORING per dimension  ◄─────┘
                            × objective weights
                            × month (and hour, for lighting)
                            + novelty vs USGS known-sites layer
                                       │
               precomputed static files → web map (MapLibre / Leaflet + GIBS basemap)
```

**Two things keep the computation small:**
- **Lighting needs no download.** Sun elevation and direction come from orbital geometry for any place and time. For the shortlisted sites only, the local horizon comes from the Copernicus DEM.
- **Mask first.** Only bare, sparsely vegetated land is processed (from MODIS `MCD12Q1` / ESA WorldCover). This removes most of the planet before any heavy work.

## How values are compared
This fixes the open question about which reference group percentiles should use.
| Kind of value | Rule | Examples |
|---|---|---|
| Same unit, same physics | **Compare directly** | Slope (°) and roughness (m) at the same baseline; sun elevation (°) |
| Very different physical ranges | **Percentile within each body**, with the reference group stated (target region vs Earth bare land) | Temperature |
| Present or absent | **Categorical match** | Mineral classes, snow-free, bare ground |

## Validation (proof for judges)
1. **Known sites.** Sites in the USGS *Known Terrestrial Analog Sites* layer should score high for their own analog type.
2. **The Arizona check.** The San Francisco Volcanic Field should score **well on terrain and poorly on lighting**. That matches NASA's choice to add spotlights there. If the tool reproduces this, the method holds.
3. **Sun-window check.** Compare calculated sun windows with an independent solar calculator (e.g. NOAA).

## Limits we will state openly
| Area | Limit |
|---|---|
| Physics Earth can't reproduce | Gravity, vacuum, radiation |
| Lighting | The Sun moves ~28× faster on Earth (15°/h vs 0.5°/h), so shadows rotate quickly. Sky light fills in shadows. Refraction distorts the sun near the horizon. Low-sun windows are seasonal. |
| Temperature | Permanently shadowed regions reach 25–40 K vs Earth's lowest ~175 K, so there is no absolute match. Only relative extremes can be compared. |
| Data coverage | EMIT covers arid land within ±52° only. There is no global cave or lava-tube dataset. DEMs include snow and ice surfaces. |
| Not modelled in version 1 | Access, permits, safety, cost of getting there |

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Global DEM metrics too heavy | Bare-land mask, coarse first pass, full resolution only for the shortlist |
| Few windows that are both snow-free and low-sun | That is a valid finding. Show it honestly and rank the best partial windows. |
| Local horizon blocks the low sun | DEM horizon check for shortlisted sites |
| Scope creep | 3 features and 3 objectives. Everything else goes to the backlog. |

## Deliberately not building (backlog)
- ML embeddings
- Radar polarimetry
- A chatbot
- User accounts
- A 3D globe
- Global high-resolution processing
- Logistics and permit data
- An education mode

## Fit with the challenge and the judging criteria
| Challenge item | Covered by |
|---|---|
| 1. Find Earth analogs | Feature 1 |
| 2. Compare scientifically | Same-physics comparisons and stated reference groups |
| 3. Discover new locations | Global search and the "new site" flag |
| 4. Practical applications | The test objective is the input |
| 5. Identify limitations | Feature 3, the fidelity card |

| Judging criterion | Why it scores |
|---|---|
| Impact | A real user, a NASA-named crew risk (lighting), and a USGS-recommended community need |
| Creativity | Time-window analogs: "where **and when**" |
| Validity | Transparent weights, same-physics metrics, validation against known sites, stated limits |
| Relevance | Answers all five challenge items |
| Presentation | One memorable story: spotlights in Arizona vs the real low sun elsewhere |

## Open decisions for the team
1. Confirm the primary user (`02`).
2. Confirm the 3 test objectives for the first version.
3. Choose 2–3 lunar target regions (of the 9) and 1–2 Mars targets.
4. Hackathon dates, time budget and team roles.
5. Product name.
6. Can we test the user journey with one real test engineer or analog researcher?
