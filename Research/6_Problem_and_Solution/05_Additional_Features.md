# 05 · Two Additional Features

**Status:** reviewed by the team on 14 Nov 2026. The decisions are in §11 and are merged into `04_Proposed_Solution.md`. Nothing has been built.

Research date: 14 Nov 2026.

## 1. How the features were chosen
1. Listed the user problems that features 1–3 in `04` do **not** solve.
2. Collected eight candidate features.
3. Tested the strongest candidate with real data (§3).
4. Applied the feature check to each: who uses it, does it solve the core problem, is it essential.

## 2. User problems the first three features don't solve
| # | Problem | Evidence |
|---|---|---|
| a | **A window that looks good on paper can be unusable.** Cloud, wind or rain can cancel a test day. The test lead needs to know how many usable days to expect. | Our data check in §3. In the 2014 Canadian Mars analogue mission, rain cancelled rover operations on sol 2. |
| b | **Users start from a site they already know**, not from a blank search. | USGS survey Finding 11: researchers work at familiar sites; 60% visit a site before starting a formal project there. |
| c | **No single site matches every condition.** | NASA runs its analogs in desert, volcanic, arctic, lake and ocean environments, each for a different purpose. Foucher et al. (2021): pick the analog for the property that matters. |
| d | **Distance and funding limit site choice.** | USGS survey: funding is the top barrier (33%); 50% of those who rank proximity as important say sites are "too difficult to get to". |
| e | **Earlier field data is hard to find.** | USGS survey Finding 15. |

## 3. New finding: sky cover changes the answer
`01_Problem_Space.md` counted the hours the Sun spends 0–7° above the horizon. That is geometry only. A low-sun test also needs a clear sky.

**Method**
- **Data:** NASA POWER daily values, 1 Jan 2001 to 31 Dec 2025 (9,131 days per site, none missing). POWER repackages CERES SYN1deg (cloud) and MERRA-2 (weather). The tool will read these two datasets directly from NASA Earthdata (§8).
- **A day counts as usable when all four hold** (first version of the rule; the approved rule is in §5):
  1. One unbroken low-sun window (0–7°) lasts at least 2 hours.
  2. Daily mean cloud amount is at most 30% (strict) or 50% (relaxed).
  3. Daily mean wind is at most 10 m/s.
  4. Precipitation is at most 1 mm.
- **Result:** the median number of usable days over every 14-day period that starts in the month, across all 25 years.
- The thresholds are our assumptions. In the tool the user would set them.

**Results**

| Site | Month | Longest low-sun window (h, monthly mean) | Mean cloud (%) | Usable days of 14, strict | Usable days of 14, relaxed | Mean air temp (°C) |
|---|---|---|---|---|---|---|
| Flagstaff, AZ 35.4°N | any | 0.6–0.7 | 26–53 | 0 | 0 | 2 to 27 |
| Svalbard 78.2°N | Aug | 5.0 | 82 | **0** | **0** | 3 |
| Svalbard 78.2°N | Apr | 4.3 | 67 | 1 | 4 | −10 |
| Devon Island 75.4°N | Aug | 4.1 | 79 | 0 | 1 | 3 |
| Devon Island 75.4°N | Feb | 3.0 | 40 | 2 | 7 | −32 |
| Devon Island 75.4°N | Apr | 2.3 | 55 | 2 | 4 | −19 |
| Ellesmere Island 81.0°N | Mar | 5.4 | 37 | **7** | **11** | −32 |
| Ellesmere Island 81.0°N | Apr | 5.8 | 36 | **6** | **9** | −24 |
| McMurdo Dry Valleys 77.6°S | Feb | 5.1 | 64 | 0 | 4 | −17 |
| McMurdo Dry Valleys 77.6°S | Oct | 4.1 | 62 | 0 | 5 | −25 |

The window column here is the longest unbroken window, averaged over the month. The table in `01` gives total hours at mid-month, so the numbers differ.

**What it shows**
- **The geometry-only answer was wrong.** Svalbard in August has long low-sun windows, but its sky is about 82% cloud-covered. A typical 14-day campaign gets **0 usable days**.
- **The best odds move to the High Arctic in spring.** Under the first rule, Ellesmere Island in March–April gets 6–7 usable days of 14 (strict); the re-check below lowers this. The chance of at least 3 usable days is 88% in March and 79% in April.
- **That window has its own costs.** Air temperature is −24 to −32 °C. The ground is probably snow-covered, which we have not yet checked.
- **Bad years happen even in the best month.** Counting whole calendar months (30 days, strict limits), Ellesmere Island had 0 to 21 usable April days across the 25 years (median 17).
- **The low-sun season at 81°N ends around 1 May.** The mean longest window is 5.8 h in April and 0.3 h in May. A 14-day campaign that starts late in April loses its last days, so in practice "April" means the first half of April.
- **Flagstaff never qualifies.** Its longest low-sun window is about 40 minutes.

**Limits of this check**
- **Coarse grid.** Cloud comes from a 1° grid, weather from a 0.5° × 0.625° grid. Local effects such as valley fog are missed. The Dry Valleys cell also covers sea and ice sheet, so its cloud value is probably too high.
- **Daily means.** The cloud value is for the whole day, not for the hours of the low-sun window. The hourly MERRA-2 and CERES data in §8 can remove this limit.
- **Cloud over snow and ice is hard to detect from space.** A study of three Svalbard stations found that reanalysis overestimates cloudiness compared with observations.
- **Flat horizon.** Local terrain is not yet included.

**Re-check with the approved usable-day rule (§5)**

After a review against published standards, the rule was revised (§5). The same data was run again. It is still NASA POWER daily data, so cloud and wind chill are daily means, not values for the window hours.

Each cell gives the typical usable days of 14, then the chance of at least 3 usable days.

| Site | Month | Strict cloud, −28 °C | **Relaxed cloud, −28 °C** | Strict cloud, −40 °C | Relaxed cloud, −40 °C |
|---|---|---|---|---|---|
| Svalbard 78.2°N | Aug | 0 (0%) | **0 (5%)** | 0 (0%) | 0 (5%) |
| Svalbard 78.2°N | Apr | 1 (18%) | **3 (62%)** | 1 (19%) | 4 (63%) |
| Devon Island 75.4°N | Feb | 0 (0%) | **0 (0%)** | 0 (2%) | 1 (14%) |
| Devon Island 75.4°N | Apr | 1 (31%) | **3 (57%)** | 2 (41%) | 4 (73%) |
| Ellesmere Island 81.0°N | Mar | 0 (11%) | **0 (15%)** | 4 (68%) | 6 (83%) |
| Ellesmere Island 81.0°N | Apr | 2 (46%) | **4 (71%)** | 5 (79%) | 9 (95%) |
| McMurdo Dry Valleys 77.6°S | Feb | 0 (0%) | **1 (22%)** | 0 (2%) | 4 (74%) |
| McMurdo Dry Valleys 77.6°S | Oct | 0 (0%) | **0 (5%)** | 0 (5%) | 3 (56%) |

How the rule was applied:
- Accurate sun-position formula; precipitation below 1 mm.
- Wind at most 7.7 m/s where the ground is probably snow-covered. At most 10 m/s for Svalbard in August and the Dry Valleys, which are probably snow-free. Snow cover is not yet checked.
- Wind chill from the daily mean temperature and wind.

**What it shows**
- **Cold decides the ranking, not cloud or wind.** The sun formula, refraction, the precipitation limit and the wind limit were each changed on their own. Only Devon Island in February moved (2 → 3 usable days of 14, strict). Adding the wind chill limit changes the answer.
- **At the −28 °C default, April beats March.** Ellesmere Island in April keeps 2 (strict) or 4 (relaxed) usable days of 14. March drops to 0.
- **Svalbard and Devon Island in April come close** with relaxed cloud: 3 usable days of 14 each. Svalbard has an airport and research stations, so it is far easier to reach than Ellesmere Island.
- **Svalbard in August stays at 0 under every rule.**
- **These numbers will change again** when they are recalculated from hourly MERRA-2 and CERES data for the window hours (§8).

## 4. Candidates and the feature check
| Candidate | Who uses it | Solves the core problem? | Essential? | Extra cost | Decision |
|---|---|---|---|---|---|
| **Campaign odds**: usable test days to expect | Test lead setting dates and campaign length | Yes. Without it "when" can be wrong (§3). | Yes | Two NASA Earthdata datasets (MERRA-2, CERES), calculated in advance for a fixed set of sites (§8) | ✅ **Feature 4** (approved 14 Nov 2026) |
| **Check my site**: score a site the user already has, and show what fills its gaps | Test lead or researcher with a familiar site | Yes. It measures the fidelity of the site they would use anyway. | Yes, for adoption | Very low. Same engine, new entry point. | ✅ **Part of Feature 1** (decided 14 Nov 2026) |
| Closest good-enough analog (rank by fidelity and travel time) | Students, small teams | Partly | No. Ranking within the visible map area gives most of the benefit with no new data. | New dataset (Nelson et al. 2019 travel time) | Backlog, first in line |
| Mission run sheet (Earth clock time mapped to lunar sun direction) | Test lead writing the daily plan | Partly | No | Low | Backlog. One 7.5-hour window sweeps as much sun direction as about 9 days on the Moon. |
| Shadow preview (terrain shadows at a chosen hour) | Test lead, presenters | Partly | No | High | Backlog |
| Links to earlier field data per site | Researchers | No. It is a different problem (data archiving). | No | High | Out of scope |
| Mars season matching | Mars scientists | Partly | No | Medium | Backlog (already listed in `04`) |
| Chat interface | Anyone | No | No. Technology for show. | Medium | Rejected |

## 5. Feature 4: Campaign odds
**What it answers:** "If we go there in that month for N days, how many usable test days should we expect, and how sure is that?"

| | |
|---|---|
| **User sets** | Site (from the set calculated in advance), month or start date, campaign length (default 14 days), and the limits of the usable-day rule below |
| **User gets** | Typical usable days (median); a bad-year and a good-year value (10th and 90th percentile); the chance of at least N usable days; a 12-month odds strip; usable days for each past year |
| **Method** | Count usable days in every N-day period over 25 years of daily data. No assumption that days are independent. The same idea is used as "weather window analysis" for offshore operations. |
| **Data** | MERRA-2 (wind, precipitation, air temperature) and CERES SYN1deg (cloud), hourly and daily, from NASA Earthdata. Free Earthdata Login. Calculated in advance and shipped as static files, not fetched live. Details in §8. |
| **Defaults per test** | Lighting tests need a clear sky and a low-sun window. Mobility tests need only the wind, precipitation and cold limits. Crewed tests use the wind chill limit; uncrewed tests use the equipment's rated temperature. |
| **Limits shown to the user** | Coarse grid (cloud 1°, weather 0.5° × 0.625°); uncertain cloud detection over snow and ice; precipitation poleward of 62.5° is MERRA-2 model output with no rain-gauge correction; 25 years give only 25 seasons, so the bad-year value is uncertain; the Arctic is warming, so early years may differ from recent ones; odds only for sites calculated in advance |

**Usable-day rule (approved 14 Nov 2026)**

A day is usable when the Sun stays in the target's elevation band for one unbroken window of at least 2 hours, and these limits hold during that window:

| Limit | Default | Basis |
|---|---|---|
| Sun elevation | From 0° up to about (90° − target latitude) + 1.5°, at most ~7° for the south-polar regions. Calculated with an accurate sun-position method. | Lunar geometry (1.5° axial tilt). The simplified formula used in §3 can be off by up to 1.4°. |
| Window length | At least 2 h | A planning choice, not a scientific value |
| Cloud | ≤30% (strict) or ≤50% (relaxed), hourly, during the window. Both results are shown. | No standard exists for low-sun tests. Near the horizon the line of sight to the Sun crosses more sky, so the chance of a clear line is lower than 1 − cloud fraction (Lund & Shanklin 1973). Both limits are therefore optimistic. |
| Wind | Highest hourly wind at 10 m: ≤7.7 m/s over snow, ≤10 m/s over bare ground | Blowing dry snow starts at 4–11 m/s, 7.7 m/s on average (Li & Pomeroy 1997). It hides the view for camera and lidar tests. |
| Precipitation | Below 1 mm for the day | The standard dry-day definition in climate indices (ETCCDI) |
| Cold, crewed tests | Wind chill −28 °C or warmer. Option: −40 °C, flagged "very high frostbite risk". | Environment Canada risk bands: from −28 to −39 °C exposed skin can freeze in 10–30 minutes, from −40 to −47 °C in 5–10 minutes. Wind chill uses the formula of Environment Canada and the US National Weather Service. |
| Cold, uncrewed tests | The equipment's rated operating temperature | Set by the user |

- **Every limit can be changed by the user.**
- **Why −28 °C is the default:** most users keep the default, so it must be the safe one. It also shows honestly that a lunar-like low Sun on Earth mostly comes with dangerous cold.
- **When to choose −40 °C:** for an experienced polar team with full cold-weather gear, short spells outside and a warm shelter nearby.
- **Before the numbers go into the pitch,** recalculate them from hourly data and compare them with ground observations (`04`, validation check 5).

## 6. Check my site (part of Feature 1)
**Decision (14 Nov 2026):** this is a second way into Feature 1, not a separate feature. It reuses Feature 1's scores. The new output is the gap-filler list.

**What it answers:** "How good is the site I already use (or plan to use) for this test, and where do I get what it lacks?"

| | |
|---|---|
| **User gives** | A site: click the map, type coordinates, pick a name from the USGS known analog sites (if that list is kept, §8), or upload a test-area file (GeoJSON or KML) |
| **User gets** | The fidelity card, seasonal calendar and campaign odds for that site, plus **gap-fillers**. Campaign odds appear only if the site is in the set calculated in advance (§8). |
| **Gap-fillers** | For each condition the site fails, the best other site and month that provides it. This shows which sites to combine. |
| **Why it matters** | It starts from what users already do (problem b). It makes the cost of a convenient site visible in numbers. It accepts that no single site matches everything (problem c). |

**Worked example (partly calculated)**
1. Check the San Francisco Volcanic Field, Arizona, for "navigation and EVA under low sun".
2. Terrain: not yet calculated.
3. Lighting: fails. The longest low-sun window is about 40 minutes, and there are 0 usable days in any month.
4. Gap-filler for lighting: Ellesmere Island in early April, with 2 (strict) or 4 (relaxed) usable days of 14 at the −28 °C wind chill default. Svalbard in April is close (3 of 14, relaxed) and easier to reach. Snow cover not yet checked.

## 7. The four features along the user journey
| Step in the user's work | Feature |
|---|---|
| "I already have a site in mind." | 1. Test-first search, **check my site** |
| "Where else could we test this?" | 1. Test-first search, search from a target |
| "When is it most like the target?" | 2. Seasonal analog calendar |
| "Will we get enough usable days?" | **4. Campaign odds** |
| "How do I justify it, and what won't carry over?" | 3. Fidelity card + export |

## 8. Data sources and cost
Checked 14 Nov 2026.

**Rule:** every feature uses only the 11 official challenge resources listed in `Research/README.md`. All of them are free.
- **Accounts:** NASA Earthdata Login and Copernicus Data Space. Both are free.
- **Software:** open-source libraries. The site is served as static files, which free hosting supports.
- No paid service is needed.

| # | Feature | Data | Official resource |
|---|---|---|---|
| 1 | Test-first search, including check my site | LOLA slope, roughness and sun visibility; Diviner temperatures; MOLA, TES and CRISM for Mars; Copernicus DEM; MODIS snow and land cover; EMIT minerals; JAXA temperature normals. Map click, coordinates and file upload run in the browser. | LRO, LRO Diviner, PDS, Copernicus Data Space, Earthdata, JAXA Earth API |
| 2 | Seasonal analog calendar | Sun position, calculated (no data); MODIS snow; JAXA temperature normals; monthly CERES cloud for clear sky | Earthdata, JAXA Earth API |
| 3 | Fidelity card + export | Reuses 1 and 2. The export runs in the browser. | — |
| 4 | Campaign odds | MERRA-2 and CERES (table below) | Earthdata |

**Feature 4 uses MERRA-2 and CERES, not NASA POWER** (decided 14 Nov 2026)

NASA POWER is not one of the 11 official resources. It repackages two datasets that are in NASA Earthdata, so the tool reads those directly.

| Need | Earthdata collection | Variable | Time step | Record starts |
|---|---|---|---|---|
| Wind at 10 m | MERRA-2 `M2T1NXSLV` v5.12.4 | `U10M`, `V10M` | 1 h | 1980 |
| Air temperature at 2 m | MERRA-2 `M2T1NXSLV` v5.12.4 | `T2M` | 1 h | 1980 |
| Precipitation | MERRA-2 `M2T1NXFLX` v5.12.4 | `PRECTOTCORR` | 1 h | 1980 |
| Cloud | CERES `CER_SYN1deg-1Hour_Terra-Aqua-NOAA20` and `CER_SYN1deg-Day_Terra-Aqua-NOAA20`, Edition 4B | Total cloud area fraction | 1 h, 1 day | Mar 2000 |
| Cloud, cross-check | MERRA-2 `M2T1NXRAD` v5.12.4 | `CLDTOT` | 1 h | 1980 |

- **Checked:** all six collections are in the Earthdata catalog (CMR), and the MERRA-2 variables above are listed in it.
- **Not yet tested:** the CERES variable names, and how to download or extract a time series for one point. Both need an Earthdata Login.
- **Gain:** with hourly data, cloud, wind and rain can be checked for the hours of the low-sun window instead of as daily means. This removes one limit in §3.
- **Costs:**
  - The files are large, global and behind a login, so the web page cannot fetch them live.
  - The odds are calculated in advance for a fixed set of sites (the shortlisted candidates and the validation sites) and shipped as static files.
  - Check my site shows campaign odds only for sites in that set. For any other site it says the odds were not calculated. Covering every high-latitude land cell is possible, but the download size has not been estimated.
- **The §3 results came from NASA POWER.** POWER uses the same two datasets, so the findings should hold. Recalculate them from MERRA-2 and CERES before they go into the pitch. The hourly cloud check may change the numbers.

**Source outside the official list**

| Source | Used for | Status |
|---|---|---|
| USGS *Known Terrestrial Analog Sites* | "New site" flag and pick a site by name (both Feature 1), validation check 1 in `04` | Free and public, but from USGS. Open decision (§11). Fallback: our own short list of known analog sites from NASA pages. |

**If the team wants NASA-only data** (the official list also includes ESA, CSA and JAXA resources):
- Replace the JAXA Earth API temperature normals with MODIS land surface temperature from Earthdata.
- Replace the Copernicus DEM with ASTER GDEM (`ASTGTM` v003, 83°S–82°N). Do not use NASADEM: it covers only 56°S–60°N, which leaves out every high-latitude lighting site in §3.

**Not yet confirmed:** whether the challenge rules allow free sources outside the official list. The challenge page could not be read. Check its Resources tab or FAQ.

## 9. Changes made to the proposal (14 Nov 2026)
- **`04_Proposed_Solution.md`:** the feature list grows from three to four. The USP becomes: "Where and when on Earth should we test this, how faithful will it be, and how many usable days will we get?"
- **Check my site** becomes a second way into Feature 1.
- **Clear sky becomes a seasonal condition** in the calendar and takes the fourth slot, because §3 shows the lighting result is wrong without it. Dust moves to the backlog.
- **Build order:** not yet set. It follows the team roadmap. The earlier proposal was features 1–3 first, then check my site, then campaign odds, which needs MERRA-2 and CERES data prepared in advance.
- **Scope guard:** four features is the limit. Everything else stays in the backlog.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Four features is more than the "three well-built features" rule | Feature 4 can be dropped without breaking 1–3. Check my site reuses Feature 1's scores. |
| The −28 °C default leaves few usable days in the best months | That is a finding, not a fault. Show it, and show the −40 °C result as a flagged option. |
| Coarse weather data gives wrong odds for sites with local weather | State the grid size on every result. Check one or two sites against station records. |
| Strict limits return "0 usable days" almost everywhere | Show strict and relaxed results. Let the user set the limits. |
| Gap-fillers suggest sites that are unreachable | Flag extreme cold and polar night. The travel-time ranking is first in the backlog. |
| Preparing 25 years of MERRA-2 and CERES data takes longer than planned | Test the download route before the hackathon. Start with the five sites in §3. |
| Campaign odds exist only for sites calculated in advance | Say so on the page. Add more sites if time allows. |

## 11. Decisions
**Decided (14 Nov 2026)**
1. **Campaign odds** is approved as Feature 4.
2. **Check my site** is folded into Feature 1 as a second way in. The product has four features.
3. **Clear sky** is a seasonal condition in version 1. It takes the fourth slot; dust moves to the backlog.
4. **The usable-day rule** in §5 is approved. The default cold limit for crewed tests is a wind chill of −28 °C; −40 °C is an option the user must choose, with a warning.
5. **Feature 4 data** comes from MERRA-2 and CERES in NASA Earthdata, not NASA POWER (§8).

**Still open**
1. Build order and roadmap (team).
2. Keep the USGS known-sites list, which is outside the official list, or replace it with our own list (§8).
3. Check whether the challenge rules allow free sources outside the official list (§8).
4. Before the pitch: recalculate the §3 numbers from hourly MERRA-2 and CERES data and compare them with ground observations.

## Sources
- NASA POWER daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA POWER overview: https://www.earthdata.nasa.gov/learn/articles/power-overview
- MERRA-2 `M2T1NXSLV` (wind, air temperature): https://doi.org/10.5067/VJAFPLI1CSIV
- MERRA-2 `M2T1NXFLX` (precipitation): https://doi.org/10.5067/7MCPBJ41Y0K6
- MERRA-2 `M2T1NXRAD` (cloud): https://doi.org/10.5067/Q9QMY5PBNV1T
- CERES SYN1deg daily, Edition 4B: https://doi.org/10.5067/Terra-Aqua-NOAA20/CERES/SYN1degDay_L3.004B
- CERES SYN1deg hourly, Edition 4B: https://doi.org/10.5067/TERRA-AQUA-NOAA20/CERES/SYN1DEG-1HOUR_L3.004B
- ASTER GDEM v3: https://doi.org/10.5067/ASTER/ASTGTM.003
- NASADEM: https://doi.org/10.5067/MEASURES/NASADEM/NASADEM_HGT.001
- NASA Earthdata catalog search (CMR): https://cmr.earthdata.nasa.gov/search/
- Li & Pomeroy 1997, *Estimates of Threshold Wind Speeds for Snow Transport Using Meteorological Data*, J. Appl. Meteor. 36: https://doi.org/10.1175/1520-0450(1997)036%3C0205:EOTWSF%3E2.0.CO;2
- Lund & Shanklin 1973, *Universal Methods for Estimating Probabilities of Cloud-Free Lines-of-Sight Through the Atmosphere*, J. Appl. Meteor. 12: https://doi.org/10.1175/1520-0450(1973)012%3C0028:UMFEPO%3E2.0.CO;2
- Reichle et al. 2017, *Land Surface Precipitation in MERRA-2*, J. Climate 30: https://doi.org/10.1175/JCLI-D-16-0570.1
- NCAR Climate Data Guide, MERRA-2: https://climatedataguide.ucar.edu/climate-data/nasas-merra2-reanalysis
- ETCCDI climate extreme indices (wet day ≥ 1 mm), Copernicus Climate Data Store: https://cds.climate.copernicus.eu/datasets/sis-extreme-indices-cmip6
- CCOHS, *Cold Environments – Working in the Cold* (Environment Canada wind chill risk bands): https://ccohs.ca/oshanswers/phys_agents/cold_working.html
- US National Weather Service, wind chill chart and formula: https://www.weather.gov/safety/cold-wind-chill-chart
- NOAA solar calculator: https://gml.noaa.gov/grad/solcalc/
- *Seasonal and Annual Variability of Svalbard Cloud Cover*: https://openpolar.no/Record/ftdoajarticles:oai:doaj.org%2Farticle:0d423a07e3f245edb4be8a13c5229491
- The Planetary Society, *Canadian Mars Analogue Mission: Field Report, Week 1* (2014): https://www.planetary.org/articles/0820-canadian-mars-analogue-mission-week-1
- DMI Report 19-15, weather windows in Southwest Greenland: https://www.dmi.dk/fileadmin/user_upload/Rapporter/TR/2019/DMIRep19-15.pdf
- Gintautas & Sørensen 2017, weather window prediction for offshore operations: https://www.mdpi.com/2077-1312/5/2/20
- USGS OFR 2024-1042, *Assessing Community Needs for Terrestrial Analog Studies*: https://pubs.usgs.gov/publication/ofr20241042
- NASA analog missions fact sheet: https://www.nasa.gov/wp-content/uploads/2015/06/541196main_analogfactsheet.pdf
- NASA, *10 Things to Know About Planetary Analogs*: https://science.nasa.gov/solar-system/planetary-analogs/10-things-to-know-about-planetary-analogs
- Foucher et al. 2021, *Definition and use of functional analogues in planetary exploration*: https://hal.archives-ouvertes.fr/hal-03130725
- Nelson et al. 2019, *Travel time to cities and ports in the year 2015*: https://figshare.com/articles/Travel_time_to_cities_and_ports_in_the_year_2015/7638134
