# 06 · Roadmap

**Status:** approved 14 Nov 2026. The build starts with M0.

**Outcome (15 Nov 2026).** M0 to M4 are complete. Built as planned: all four features for one objective, two targets and 14 sites; the P1 items (check any place, terrain row, CSV export and print card); the validation panel and the methods page. Changed during the build:
- The map is a three.js globe with NASA GIBS imagery, not MapLibre, and a Moon view with an Earth and Moon comparison was added. `04` had listed a 3D globe as backlog.
- The terrain row uses LOLA and the Copernicus DEM. Diviner was not used.
- The sun engine is checked against NREL SPA, not the NOAA calculator's values.
- The combined calendar row became the usable-days row; conditions are not weighted into one score.

Not built: every P2 item (Mars, all nine lunar regions, limits set by the user), the campaign-length and start-date pickers, GeoJSON export, and the local horizon from the DEM. Surface temperature was replaced by wind chill as the fourth calendar row.

**Time and team:** about 17 hours to the submission deadline (Space Apps 2026 runs 14–15 Nov). One developer.

## Approach
1. **Test the data access before writing app code.** The main risk is getting the data, not the UI. Each data source gets a short, time-boxed test that ends in a go/no-go.
2. **Calculate everything in advance and serve static files.** A Python pipeline writes small JSON files, and a static website reads them. There is no backend, so nothing can fail on the server during judging.
3. **Build a thin version first, then widen it.** Build one objective, two targets and about 12 sites, with all four features working end to end. Add more only after that works.
4. **Run the validation checks as tests.** The checks in `04` run as automated tests, so the method's validity is shown from the first version.
5. **Decide in advance what to cut.** Every milestone ends with something we can demo. Feature 4 can be dropped without breaking features 1–3.

## Scope for the event
| Priority | Content |
|---|---|
| **P0: the demo** | Objective: navigation and EVA under low sun. Targets: Mons Mouton and Malapert Massif. About 12 curated sites. Feature 1 ranked list and map, Feature 2 seasonal calendar, Feature 4 campaign odds, Feature 3 fidelity card. A story landing page. Static deploy. |
| **P1: at the T+10 h checkpoint, in this order** | (a) Check my site: click anywhere for a sun calendar calculated in the browser, plus the nearest calculated site and a lighting gap-filler. (b) Moon target profile from LOLA and Diviner, and Earth slope from the Copernicus DEM, which gives the terrain row of the fidelity card. (c) CSV export and a printable card. |
| **P2: only if ahead of schedule** | A minimal Mars stretch: 3–4 desert sites with cold, dry months from the same weather data, no minerals; time box 2 h. All 9 lunar regions in the target picker. Limits set by the user, such as an uncrewed rated temperature. |
| **Not in this event** | Global H3 grid, test objectives 2 and 3, weight sliders, GeoJSON/KML upload, comparison with weather stations, and the backlog in `04`. These are listed as next steps. |

**Sites:**
- **Validation sites:** San Francisco Volcanic Field (Arizona), Svalbard, Devon Island, McMurdo Dry Valleys.
- **Candidate sites:** inland Ellesmere Island and 6–8 lesser-known high-latitude bare-land sites, for example Axel Heiberg Island, Peary Land, Franz Josef Land, Severnaya Zemlya, Northeast Greenland and Antarctic oases.
- Coordinates are checked before the list is frozen in M0.

## Timeline
T is the start of M0. The deadline is T+17:00, and the target is to submit by T+15:00.

| Milestone | Time | Work | Exit check |
|---|---|---|---|
| **M0 Setup and freeze** | 0:00–0:45 | Create the Earthdata Login and approve the GES DISC application. Freeze the targets and sites. Set up `pipeline/` (Python 3.11 with uv) and `web/` (Next.js, TypeScript, Tailwind, static export). Add a `.gitignore` for build output and raw data. | Commit C1 |
| **M1 Data checks** | 0:45–2:15 | (1) MERRA-2 (`M2T1NXSLV`, `M2T1NXFLX`) and CERES SYN1deg hourly: download 1 site × 1 year and measure the speed. (2) Sun-position engine (NOAA algorithm), tested against NOAA values. (3) Snow: `MOD10CM` in a 30-minute box; fallback MERRA-2 `FRSNO`. | **Go/no-go at 2:15** (see the data decision below). The full download starts. |
| **M2a Pipeline** | 2:15–5:00 | Calculate per day, site and target: (1) the sun window inside the target band, at 5-minute steps; (2) the usable-day rule from `05` §5, applied to the window hours; (3) four presets (strict or relaxed cloud × −28 °C or −40 °C wind chill). Then: campaign odds per start day (N = 14 days) as median, 10th and 90th percentiles, chance of at least 3 usable days, and per-year values; monthly conditions; scores, match levels and fidelity card fields. Write JSON files. | Tests pass. Commit C2 |
| **M2b Frontend core** | 5:00–10:00 | Landing story: spotlights in Arizona vs the real low Sun. Planner: target, objective and month give a ranked list and a map (MapLibre globe with a NASA GIBS basemap). Site view: seasonal calendar, daily sun-elevation chart with the target band shaded, campaign odds, fidelity card. | **T+7:30 checkpoint:** the Arizona → Ellesmere Island journey works end to end with real data. Commits C3 and C4 |
| **T+10 checkpoint** | — | Choose the P1 items, and P2 only if ahead of schedule. | — |
| **M3 Widen** | 10:00–12:30 | P1 items (a), (b), (c) in order, each time-boxed. | Feature freeze at 12:30. Commit C5 |
| **M4 Validate and ship** | 12:30–15:00 | Validation panel. Methods and limits page. Deploy. README. Submission: title, summary, demo, resources list and any statements the form requires. | Submitted. Commit C6 |
| **Buffer** | 15:00–17:00 | Fixes and submission problems | — |

## Data decision for Feature 4
- **First choice, as decided in `05` §8:** MERRA-2 and CERES SYN1deg, read directly from NASA Earthdata.
- **Go:** if every site, with at least 10 years of hourly data, can download in the background in 3 hours or less.
- **No-go:** each variable that fails switches to the NASA POWER hourly API (`T2M`, `WS10M`, `PRECTOTCORR`, `CLOUD_AMT`). POWER repackages the same two datasets, needs no login, and returns one file per site. The data source is shown on every result.

## How each feature is built
**Shared engine (Python).**
- Modules for sun position, sites, weather download, the usable-day rule, campaign odds, monthly conditions, scoring and JSON export.
- The window rule: a day is usable when there is an unbroken stretch of at least 2 hours inside the target band during which every hourly limit holds.
- Wind chill uses the formula of Environment Canada and the US National Weather Service.

**Feature 1: Test-first search.**
- The website reads one index file with the scores per target and month, plus the value of each condition. It sorts the sites and draws the map.
- Check my site (P1) uses a TypeScript port of the sun-position engine, checked against the same test values. Lighting therefore works for any point on Earth. Campaign odds are available only for the calculated sites.

**Feature 2: Seasonal calendar.**
- 12 months × 4 condition rows (low-sun hours, clear sky, snow-free ground, wind chill), plus a combined row.
- Polar night and extreme cold are flagged.
- The daily chart shows the stored sun windows for each month.

**Feature 3: Fidelity card.**
- Each condition gets a row: target value, Earth value, match level (match / partial / breaks down / impossible on Earth) and data source.
- Gravity, vacuum and radiation always appear as "impossible on Earth". The 28× faster Sun and the sky light that fills in shadows appear as "breaks down".
- The card states the best window and why. CSV export and a printable card are P1.

**Feature 4: Campaign odds.**
- The four presets are calculated in advance, and the website switches between them.
- It shows a 12-month odds strip and the usable days for each past year.
- Every result states the grid size and the data source.

**Data contract** (fixed in M2a, before the frontend work starts):
- **Index file:** targets, objectives, sites and scores.
- **One file per site:** monthly conditions, odds by month and preset, per-year values, sun-window samples, fidelity card fields and sources.

## Validation tests
| Test | Expected result |
|---|---|
| Sun elevation vs the NOAA solar calculator, 3 sites and dates | Within 0.1° |
| Arizona (San Francisco Volcanic Field) | 0 usable days in every month |
| Svalbard in August | 0 usable days under every preset |
| Ellesmere Island at −28 °C | April better than March, the same direction as the re-check in `05` §3 |
| Website | The static build succeeds, and the Arizona → Ellesmere Island journey works in a browser |

## Risks
| Risk | Response |
|---|---|
| The MERRA-2 / CERES download is too slow | Go/no-go at T+2:15 with the NASA POWER fallback |
| The frontend takes longer than planned | At the T+7:30 checkpoint a minimal version can already be submitted. P1 and P2 items are dropped first. |
| Too little time for the submission | Feature freeze at T+12:30. 2 hours of buffer. |
| Snow data does not load | Fall back to MERRA-2 `FRSNO`. If that fails too, the snow row says "not calculated". |
