# 04 · Proposed Solution: Seasonal Analog Planner

**Status:** proposal for team review. Nothing has been built. It is based on `01` (problem), `02` (user) and `03` (approaches).

## In one sentence
A **seasonal, test-first analog planner**:
1. Choose a Moon or Mars target and what you want to test.
2. Get the Earth sites that match best **and the months (and, for lighting, the hours) when they match best**.
3. Each result comes with a **fidelity report**: what matches, what partly matches, and what Earth can't reproduce.

## Headline idea
> **An Earth analog is a place at the right time.**

On Earth, the conditions that make a site Moon- or Mars-like change through the year: sun angle, snow cover, cold, dust. Today analogs are treated as fixed places, and campaign seasons are chosen for logistics. We find the **seasonal windows** when Earth is most like the target, for a specific test.

## USP
> **"Where and when on Earth should we test this, and how faithful will it be?"**, answered with numbers.

No existing option combines all three:
1. Ranking **for a specific test**, not a general idea of "Moon-like".
2. **Seasonal windows**: month by month for every condition, and hour by hour for lighting.
3. **Measured limits**: every result says what won't carry over.

**The story for judges:**
- NASA rehearses South Pole moonwalks **at night with a spotlight** in Arizona, because the Sun there sits in the Artemis 0–7° band for only about 1.2 hours a day.
- Our tool finds **where and when on Earth the real Sun does this for 5–10 hours a day**, over real terrain, and in which of those weeks the ground is also snow-free.
- The same seasonal idea works for Mars: cold, dry, dusty months in Earth deserts.
- It is upfront about what Earth still can't reproduce.

## Core features (three, no more)
| # | Feature | What the user does / gets | Feature check |
|---|---|---|---|
| 1 | **Test-first search** | Pick a target (e.g. Mons Mouton, Malapert Massif) and a test objective, plus a month or "any month". The weights per condition are shown and can be adjusted. Get a ranked map and list, with a "new site" flag for places that are not well-known analogs. | Who: test lead. Core problem: yes, it removes familiarity bias. Essential: yes. |
| 2 | **Seasonal analog calendar** | For each candidate, a 12-month strip of the combined match, with one row per seasonal condition (low-sun hours, snow-free ground, temperature, dust). For lighting, the exact daily windows when the Sun is in the target's elevation band, with sun direction. The hard months are flagged: polar night, extreme cold. | Who: test lead choosing dates. Core problem: yes, it is the time dimension. Essential: yes, it is the USP. |
| 3 | **Fidelity card + export** | Per condition: target value, Earth value, match level (**match / partial / breaks down / impossible on Earth**) and data source. Also the **best window and why**. Format example, not yet a result: "10 Aug–5 Sep: sun 0–7° for ~7 h/day, ground snow-free". Export as CSV, GeoJSON or a printable card for test plans and proposals. | Who: test lead justifying the site and dates. Core problem: yes, it states the limits. Essential: yes, and it fits their existing workflow. |

## Seasonal conditions in version 1
At most four, so the scope stays small.

| Condition | Matters for | Earth data (already monthly) | How compared |
|---|---|---|---|
| **Low-sun hours** (sun 0–7° above the horizon) | Moon navigation and EVA | Calculated from sun geometry for every place and day; local horizon from the Copernicus DEM for shortlisted sites | Directly (degrees, hours per day) |
| **Snow-free bare ground** | Moon and Mars terrain and mobility | MODIS `MOD10CM` monthly snow cover; `MCD12Q1` / ESA WorldCover for bare ground | Yes/no per month |
| **Surface temperature** (day, night, day–night range) | Mars science and instruments; context for Moon tests | MODIS LST monthly normals (JAXA Earth API) | Percentile within each body, with the reference group stated |
| **Dust activity** (optional) | Mars | MERRA-2 `M2TMNXAER` monthly dust | Percentile within each body |

**Later versions:**
- Frozen ground (Mars ground ice).
- Polar-night conditions for operations in permanently shadowed regions. Check these against the 2024 finding that small shadowed craters are dimly lit by scattered light.

## Test objectives for the first version (proposal)
| Body | Objective | Fixed conditions | Seasonal conditions |
|---|---|---|---|
| Moon | **Navigation and EVA under low sun** | Slope, roughness, local horizon | Low-sun hours, snow-free ground |
| Moon | **Rover mobility on polar highland slopes** | Slope distribution at a matched baseline, roughness | Snow-free ground |
| Mars | **Science / instrument test on Mars-like ground** | Mars-relevant minerals (EMIT), no vegetation | Temperature and day–night range, dryness (monthly precipitation), dust |

**Stretch goals:** Moon landing hazard detection; Mars ground-ice / ISRU testing.

## How it works
```
TARGETS (from existing research files)       EARTH (bare land only, H3 grid)
LOLA slope / roughness / sun visibility       Fixed:    Copernicus DEM slope / roughness
Diviner temperatures                          Monthly:  snow, LST, precipitation, dust
MOLA / TES / CRISM (Mars)                     Daily:    sun geometry → low-sun hours
              │                                         │
              └──────►  SCORING per condition, per month  ◄──────┘
                        score(site, month) × test weights
                        + novelty vs USGS known-sites layer
                                       │
               precomputed static files → web map (MapLibre / Leaflet + GIBS basemap)
```

**Combining conditions for each month:**
- `score(site, month) = Σ w_c · s_c(site, month) / Σ w_c`
- Fixed conditions (terrain) have the same value every month. Seasonal ones change.
- The **best window** is the run of months with the highest score.
- The breakdown always shows each condition. A month that fixes lighting but brings snow is visible, not hidden in an average.

**Three things keep the computation small:**
- **The Earth data is already monthly.** Seasons add 12 values per site, not a new dataset.
- **Lighting needs no download.** Sun elevation and direction come from orbital geometry. The DEM horizon check is done only for the shortlist.
- **Mask first.** Only bare, sparsely vegetated land is processed, which removes most of the planet before any heavy work.

## How values are compared
| Kind of value | Rule | Examples |
|---|---|---|
| Same unit, same physics | **Compare directly** | Slope (°) and roughness (m) at the same baseline; sun elevation (°); low-sun hours per day |
| Very different physical ranges | **Percentile within each body**, with the reference group stated (target region vs Earth bare land) | Temperature, dust |
| Present or absent | **Categorical match** | Mineral classes, snow-free, bare ground |

## Validation (proof for judges)
1. **Known sites.** Sites in the USGS *Known Terrestrial Analog Sites* layer should score high for their own analog type.
2. **The Arizona check.** The San Francisco Volcanic Field should score **well on terrain and poorly on lighting in every month**. That matches NASA's choice to add spotlights there.
3. **Field-season check.** The snow-free months calculated for well-known Arctic and Antarctic analog sites should match their known summer field seasons.
4. **Sun-window check.** Compare calculated sun windows with an independent solar calculator (e.g. NOAA).

## Limits we will state openly
| Area | Limit |
|---|---|
| Physics Earth can't reproduce | Gravity, vacuum, radiation |
| Lighting | The Sun moves ~28× faster on Earth (15°/h vs 0.5°/h), so shadows rotate quickly. Sky light fills in shadows. Refraction distorts the sun near the horizon. |
| Seasons | **The Moon has almost no seasons** (1.5° axial tilt), so for Moon targets the time dimension comes from Earth's seasons only. Low-sun windows exist only at high latitudes. Monthly averages hide year-to-year variation: a typical August is not a guaranteed August. |
| Temperature | Permanently shadowed regions reach 25–40 K vs Earth's lowest ~175 K, so there is no absolute match. Only relative extremes can be compared. |
| Data coverage | EMIT covers arid land within ±52° only. There is no global cave or lava-tube dataset. DEMs include snow and ice surfaces. |
| Not modelled in version 1 | Access, permits, safety, cost of getting there |

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| The best months are the hardest to work in (polar night, extreme cold) | Flag those months in the calendar and show the best **workable** window next to the best overall |
| A season fixes one condition and breaks another (low sun often comes with snow) | Combined monthly score with a per-condition breakdown |
| Few windows that are both snow-free and low-sun | That is a valid finding. Show it honestly and rank the best partial windows. |
| Local horizon blocks the low sun | DEM horizon check for shortlisted sites |
| Global DEM metrics too heavy | Bare-land mask, coarse first pass, full resolution only for the shortlist |
| Scope creep | 3 features, 3 objectives, at most 4 seasonal conditions. Everything else goes to the backlog. |

## Deliberately not building (backlog)
- Season matching for Mars (an Earth month matched to a Mars season, using the Mars Climate Database)
- Year-by-year analysis instead of monthly averages
- Polar-night analog for permanently shadowed regions
- ML embeddings
- Radar polarimetry
- A chatbot
- User accounts
- A 3D globe
- Logistics and permit data
- An education mode

## Fit with the challenge and the judging criteria
| Challenge item | Covered by |
|---|---|
| 1. Find Earth analogs | Feature 1 |
| 2. Compare scientifically | Same-physics comparisons and stated reference groups, per month |
| 3. Discover new locations | Global search, the "new site" flag and **new seasonal windows at known sites** |
| 4. Practical applications | The test objective is the input |
| 5. Identify limitations | Feature 3, the fidelity card, including seasonal limits |

| Judging criterion | Why it scores |
|---|---|
| Impact | A real user, a NASA-named crew risk (lighting), and a USGS-recommended community need |
| Creativity | Seasonal analogs: "an Earth analog is a place at the right time" |
| Validity | Transparent weights, same-physics metrics, validation against known sites and field seasons, stated limits |
| Relevance | Answers all five challenge items; matches "think about processes as well as places" |
| Presentation | One memorable story: spotlights in Arizona vs the real low sun elsewhere, in the right weeks |

## Open decisions for the team
1. Confirm the primary user (`02`).
2. Confirm the 3 test objectives for the first version.
3. Confirm the seasonal conditions for version 1 (proposed: low-sun hours, snow-free ground, temperature, optionally dust).
4. Choose 2–3 lunar target regions (of the 9) and 1–2 Mars targets.
5. Hackathon dates, time budget and team roles.
6. Product name.
7. Can we test the user journey with one real test engineer or analog researcher?
