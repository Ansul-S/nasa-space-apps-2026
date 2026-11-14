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
- **Data:** NASA POWER daily values, 1 Jan 2001 to 31 Dec 2025 (9,131 days per site, none missing).
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
- **Daily means.** The cloud value is for the whole day, not for the hours of the low-sun window.
- **Cloud over snow and ice is hard to detect from space.** A study of three Svalbard stations found that reanalysis overestimates cloudiness compared with observations.
- **Flat horizon.** Local terrain is not yet included.

## 4. Candidates and the feature check
| Candidate | Who uses it | Solves the core problem? | Essential? | Extra cost | Decision |
|---|---|---|---|---|---|
| **Campaign odds**: usable test days to expect | Test lead setting dates and campaign length | Yes. Without it "when" can be wrong (§3). | Yes | One new data source (NASA POWER), for shortlisted sites only | ✅ **Feature 4** |
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
| **User sets** | Site, month or start date, campaign length (default 14 days), and limits: cloud, wind, precipitation, lowest workable temperature, shortest useful low-sun window |
| **User gets** | Typical usable days (median); a bad-year and a good-year value (10th and 90th percentile); the chance of at least N usable days; a 12-month odds strip; usable days for each past year |
| **Method** | Count usable days in every N-day period over 25 years of daily data. No assumption that days are independent. The same idea is used as "weather window analysis" for offshore operations. |
| **Data** | NASA POWER daily API. No login or key, and it allows requests straight from a browser (checked 14 Nov 2026). Cloud from CERES SYN1deg, weather from MERRA-2. |
| **Defaults per test** | Lighting tests need a clear sky and a low-sun window. Mobility tests need only wind, precipitation and temperature limits. |
| **Limits shown to the user** | Coarse grid, daily means, uncertain cloud detection over snow and ice, past years do not guarantee future ones |

## 6. Feature 5: Check my site
**What it answers:** "How good is the site I already use (or plan to use) for this test, and where do I get what it lacks?"

| | |
|---|---|
| **User gives** | A site: click the map, type coordinates, pick a name from the USGS known analog sites, or upload a test-area file (GeoJSON or KML) |
| **User gets** | The fidelity card, seasonal calendar and campaign odds for that site, plus **gap-fillers** |
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

## 8. Changes to the proposal if approved
- **`04_Proposed_Solution.md`:** the feature list grows from three to five. The USP becomes: "Where and when on Earth should we test this, how faithful will it be, and how many usable days will we get?"
- **Clear sky becomes a seasonal condition** in the calendar. We recommend this even if Feature 4 is not approved, because §3 shows the lighting result is wrong without it.
- **Build order:** features 1–3 first. Then 5, which reuses the same engine. Then 4, which needs one new data source.
- **Scope guard:** five features is the limit. Everything else stays in the backlog.

## 9. Risks
| Risk | Mitigation |
|---|---|
| Five features is more than the "three well-built features" rule | Build in the order above. Features 4 and 5 can be dropped without breaking 1–3. |
| Coarse weather data gives wrong odds for sites with local weather | State the grid size on every result. Check one or two sites against station records. |
| Strict limits return "0 usable days" almost everywhere | Show strict and relaxed results. Let the user set the limits. |
| Gap-fillers suggest sites that are unreachable | Flag extreme cold and polar night. The travel-time ranking is first in the backlog. |

## 10. Decisions for the team
1. Approve features 4 and 5, or swap one for a backlog candidate (§4).
2. Agree the default limits for a usable day (cloud, wind, precipitation, temperature).
3. Approve adding clear sky as a seasonal condition.
4. Confirm the build order in §8.

## Sources
- NASA POWER daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA POWER overview: https://www.earthdata.nasa.gov/learn/articles/power-overview
- *Seasonal and Annual Variability of Svalbard Cloud Cover*: https://openpolar.no/Record/ftdoajarticles:oai:doaj.org%2Farticle:0d423a07e3f245edb4be8a13c5229491
- The Planetary Society, *Canadian Mars Analogue Mission: Field Report, Week 1* (2014): https://www.planetary.org/articles/0820-canadian-mars-analogue-mission-week-1
- DMI Report 19-15, weather windows in Southwest Greenland: https://www.dmi.dk/fileadmin/user_upload/Rapporter/TR/2019/DMIRep19-15.pdf
- Gintautas & Sørensen 2017, weather window prediction for offshore operations: https://www.mdpi.com/2077-1312/5/2/20
- USGS OFR 2024-1042, *Assessing Community Needs for Terrestrial Analog Studies*: https://pubs.usgs.gov/publication/ofr20241042
- NASA analog missions fact sheet: https://www.nasa.gov/wp-content/uploads/2015/06/541196main_analogfactsheet.pdf
- NASA, *10 Things to Know About Planetary Analogs*: https://science.nasa.gov/solar-system/planetary-analogs/10-things-to-know-about-planetary-analogs
- Foucher et al. 2021, *Definition and use of functional analogues in planetary exploration*: https://hal.archives-ouvertes.fr/hal-03130725
- Nelson et al. 2019, *Travel time to cities and ports in the year 2015*: https://figshare.com/articles/Travel_time_to_cities_and_ports_in_the_year_2015/7638134
