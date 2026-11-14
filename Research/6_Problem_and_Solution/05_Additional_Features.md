# 05 · Two Additional Features

**Status:** proposal for team review. Nothing has been built. `04_Proposed_Solution.md` keeps its three core features until this file is approved.

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
- **A day counts as usable when all four hold:**
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
- **The best odds move to the High Arctic in spring.** Ellesmere Island in March–April gets 6–7 usable days of 14 (strict). The chance of at least 3 usable days is 88% in March and 79% in April.
- **That window has its own costs.** Air temperature is −24 to −32 °C. The ground is probably snow-covered, which we have not yet checked.
- **Bad years happen even in the best month.** Usable April days on Ellesmere Island ranged from 0 to 21 across the 25 years (median 17).
- **Flagstaff never qualifies.** Its longest low-sun window is about 40 minutes.

**Limits of this check**
- **Coarse grid.** Cloud comes from a 1° grid, weather from a 0.5° × 0.625° grid. Local effects such as valley fog are missed. The Dry Valleys cell also covers sea and ice sheet, so its cloud value is probably too high.
- **Daily means.** The cloud value is for the whole day, not for the hours of the low-sun window. The hourly MERRA-2 and CERES data in §8 can remove this limit.
- **Cloud over snow and ice is hard to detect from space.** A study of three Svalbard stations found that reanalysis overestimates cloudiness compared with observations.
- **Flat horizon.** Local terrain is not yet included.

## 4. Candidates and the feature check
| Candidate | Who uses it | Solves the core problem? | Essential? | Extra cost | Decision |
|---|---|---|---|---|---|
| **Campaign odds**: usable test days to expect | Test lead setting dates and campaign length | Yes. Without it "when" can be wrong (§3). | Yes | Two NASA Earthdata datasets (MERRA-2, CERES), calculated in advance for a fixed set of sites (§8) | ✅ **Feature 4** |
| **Check my site**: score a site the user already has, and show what fills its gaps | Test lead or researcher with a familiar site | Yes. It measures the fidelity of the site they would use anyway. | Yes, for adoption | Very low. Same engine, new entry point. | ✅ **Feature 5** |
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
| **User sets** | Site (from the set calculated in advance), month or start date, campaign length (default 14 days), and limits: cloud, wind, precipitation, lowest workable temperature, shortest useful low-sun window |
| **User gets** | Typical usable days (median); a bad-year and a good-year value (10th and 90th percentile); the chance of at least N usable days; a 12-month odds strip; usable days for each past year |
| **Method** | Count usable days in every N-day period over 25 years of daily data. No assumption that days are independent. The same idea is used as "weather window analysis" for offshore operations. |
| **Data** | MERRA-2 (wind, precipitation, air temperature) and CERES SYN1deg (cloud), hourly and daily, from NASA Earthdata. Free Earthdata Login. Calculated in advance and shipped as static files, not fetched live. Details in §8. |
| **Defaults per test** | Lighting tests need a clear sky and a low-sun window. Mobility tests need only wind, precipitation and temperature limits. |
| **Limits shown to the user** | Coarse grid (cloud 1°, weather 0.5° × 0.625°), uncertain cloud detection over snow and ice, past years do not guarantee future ones, odds only for sites calculated in advance |

## 6. Feature 5: Check my site
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
4. Gap-filler for lighting: Ellesmere Island in March–April, with 6–7 usable days of 14. Flagged: −24 to −32 °C, snow cover not yet checked.

## 7. The five features along the user journey
| Step in the user's work | Feature |
|---|---|
| "I already have a site in mind." | **5. Check my site** |
| "Where else could we test this?" | 1. Test-first search |
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
| 1 | Test-first search | LOLA slope, roughness and sun visibility; Diviner temperatures; MOLA, TES and CRISM for Mars; Copernicus DEM; MODIS snow and land cover; EMIT minerals; JAXA temperature normals | LRO, LRO Diviner, PDS, Copernicus Data Space, Earthdata, JAXA Earth API |
| 2 | Seasonal analog calendar | Sun position, calculated (no data); MODIS snow; JAXA temperature normals; MERRA-2 dust; monthly CERES cloud for clear sky, if approved | Earthdata, JAXA Earth API |
| 3 | Fidelity card + export | Reuses 1 and 2. The export runs in the browser. | — |
| 4 | Campaign odds | MERRA-2 and CERES (table below) | Earthdata |
| 5 | Check my site | Reuses 1–4. Map click, coordinates and file upload run in the browser. | — |

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
  - Feature 5 shows campaign odds only for sites in that set. For any other site it says the odds were not calculated. Covering every high-latitude land cell is possible, but the download size has not been estimated.
- **The §3 results came from NASA POWER.** POWER uses the same two datasets, so the findings should hold. Recalculate them from MERRA-2 and CERES before they go into the pitch. The hourly cloud check may change the numbers.

**Source outside the official list**

| Source | Used for | Status |
|---|---|---|
| USGS *Known Terrestrial Analog Sites* | "New site" flag (Feature 1), pick a site by name (Feature 5), validation check 1 in `04` | Free and public, but from USGS. Open decision (§11). Fallback: our own short list of known analog sites from NASA pages. |

**If the team wants NASA-only data** (the official list also includes ESA, CSA and JAXA resources):
- Replace the JAXA Earth API temperature normals with MODIS land surface temperature from Earthdata.
- Replace the Copernicus DEM with ASTER GDEM (`ASTGTM` v003, 83°S–82°N). Do not use NASADEM: it covers only 56°S–60°N, which leaves out every high-latitude lighting site in §3.

**Not yet confirmed:** whether the challenge rules allow free sources outside the official list. The challenge page could not be read. Check its Resources tab or FAQ.

## 9. Changes to the proposal if approved
- **`04_Proposed_Solution.md`:** the feature list grows from three to five. The USP becomes: "Where and when on Earth should we test this, how faithful will it be, and how many usable days will we get?"
- **Clear sky becomes a seasonal condition** in the calendar. We recommend this even if Feature 4 is not approved, because §3 shows the lighting result is wrong without it.
- **Build order:** features 1–3 first. Then 5, which reuses the same engine. Then 4, which needs MERRA-2 and CERES data prepared in advance.
- **Scope guard:** five features is the limit. Everything else stays in the backlog.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Five features is more than the "three well-built features" rule | Build in the order above. Features 4 and 5 can be dropped without breaking 1–3. |
| Coarse weather data gives wrong odds for sites with local weather | State the grid size on every result. Check one or two sites against station records. |
| Strict limits return "0 usable days" almost everywhere | Show strict and relaxed results. Let the user set the limits. |
| Gap-fillers suggest sites that are unreachable | Flag extreme cold and polar night. The travel-time ranking is first in the backlog. |
| Preparing 25 years of MERRA-2 and CERES data takes longer than planned | Test the download route before the hackathon. Start with the five sites in §3. |
| Campaign odds exist only for sites calculated in advance | Say so on the page. Add more sites if time allows. |

## 11. Decisions for the team
1. Approve features 4 and 5, or swap one for a backlog candidate (§4).
2. Agree the default limits for a usable day (cloud, wind, precipitation, temperature).
3. Approve adding clear sky as a seasonal condition.
4. Confirm the build order in §9.
5. Keep the USGS known-sites list, which is outside the official list, or replace it with our own list (§8).
6. Check whether the challenge rules allow free sources outside the official list (§8).

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
- *Seasonal and Annual Variability of Svalbard Cloud Cover*: https://openpolar.no/Record/ftdoajarticles:oai:doaj.org%2Farticle:0d423a07e3f245edb4be8a13c5229491
- The Planetary Society, *Canadian Mars Analogue Mission: Field Report, Week 1* (2014): https://www.planetary.org/articles/0820-canadian-mars-analogue-mission-week-1
- DMI Report 19-15, weather windows in Southwest Greenland: https://www.dmi.dk/fileadmin/user_upload/Rapporter/TR/2019/DMIRep19-15.pdf
- Gintautas & Sørensen 2017, weather window prediction for offshore operations: https://www.mdpi.com/2077-1312/5/2/20
- USGS OFR 2024-1042, *Assessing Community Needs for Terrestrial Analog Studies*: https://pubs.usgs.gov/publication/ofr20241042
- NASA analog missions fact sheet: https://www.nasa.gov/wp-content/uploads/2015/06/541196main_analogfactsheet.pdf
- NASA, *10 Things to Know About Planetary Analogs*: https://science.nasa.gov/solar-system/planetary-analogs/10-things-to-know-about-planetary-analogs
- Foucher et al. 2021, *Definition and use of functional analogues in planetary exploration*: https://hal.archives-ouvertes.fr/hal-03130725
- Nelson et al. 2019, *Travel time to cities and ports in the year 2015*: https://figshare.com/articles/Travel_time_to_cities_and_ports_in_the_year_2015/7638134
