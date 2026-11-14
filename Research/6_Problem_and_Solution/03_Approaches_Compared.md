# 03 · Approaches Compared

Six approaches were assessed against the project principles (real problem, specific user, clear USP, essential features only) and the Space Apps judging criteria (Impact, Creativity, Validity, Relevance, Presentation).

## The candidates
| # | Approach | Core idea |
|---|---|---|
| A | **Generic global similarity map** | Score every Earth cell against Moon/Mars sites on many dimensions and show one heat map |
| B | **Visual / image similarity** | Rank Earth sites by how much satellite imagery *looks* like the Moon or Mars |
| C | **ML terrain embeddings** | Train a model on DEM patches from three bodies; find look-alike terrain |
| D | **Radar twins** | Compare Earth compact-pol radar (RCM) with lunar Mini-RF radar |
| E | **Process analogs** | Match dust storms and dune migration between Earth and Mars |
| F | **Seasonal, test-first analog planner** | The user picks a target and a test. The tool ranks Earth sites **and the months (and, for lighting, the hours) when each site matches best**, with a numeric fidelity report |

## Assessment
✅ strong · 🟡 partial · ❌ weak

| Criterion | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Solves the documented problem (`01`) | 🟡 finds sites, ignores purpose and time | ❌ | 🟡 | 🟡 | 🟡 | ✅ purpose, season and limits |
| Specific target user (`02`) | ❌ "anyone" | ❌ | ❌ | 🟡 radar specialists | 🟡 scientists | ✅ test lead / analog researcher |
| Uses seasonal change | ❌ static | ❌ static | ❌ static | 🟡 radar time series possible | 🟡 seasonal processes | ✅ month by month for every condition |
| USP / novelty | 🟡 obvious, many teams will build it | ❌ already published (NHSJS 2026) | 🟡 | ✅ | 🟡 | ✅ seasonal analog windows; no month-by-month tool found |
| Beyond visual similarity (judging signal) | ✅ | ❌ explicitly discouraged | 🟡 | ✅ | ✅ | ✅ |
| States where the analogy breaks | 🟡 | ❌ | ❌ black box | 🟡 | 🟡 | ✅ built into every result |
| Practical applications (challenge item 4) | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ✅ the test *is* the input |
| Moon **and** Mars | ✅ | ✅ | ✅ | ❌ Moon only | ❌ Mars only | ✅ same engine, different tests |
| Feasible in a hackathon | ✅ | ✅ | ❌ high risk | ❌ heavy SAR processing | 🟡 | ✅ the Earth data is already monthly; lighting is plain astronomy maths |
| Credible validation | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ✅ can explain why NASA uses spotlights in Arizona |

## Why F, and what it keeps from the others
- **F contains A** as its engine. The global per-dimension scoring is still there, but each test sets the weights and **month** is added as a dimension. So it still meets the challenge's "map, compare, rank, explain".
- It **keeps part of E**. Seasonal processes such as dust seasons and ground freezing become monthly conditions inside the same engine.
- It **drops B and C**. Visual similarity is discouraged by the challenge, and ML here would be technology for show, against principle 3.
- It **defers D**. Radar twins are a possible later extension, not a core feature.

## The key insight behind F: seasonal analogs
> **An Earth analog is a place at the right time, for the right test.**

On Earth, the conditions that define a Moon or Mars environment change through the year: sun angle, darkness, cold, snow-free bare ground, frozen ground, dust. So a site can be a strong analog in some weeks and a weak one in others.

| Seasonal condition | Target | Earth candidate | Status |
|---|---|---|---|
| Sun 0–7° above the horizon for many hours | Moon South Pole (navigation, EVA) | Svalbard in August (~7.4 h/day), McMurdo Dry Valleys in February (~8.1 h/day). Flagstaff, AZ only ever gets ~1.2 h/day. | ✅ sun geometry calculated (`01`). ⚠️ Cloud cover cuts the usable days sharply: Svalbard in August drops to 0 of 14 days, while Ellesmere Island in March–April keeps 6–7 (`05`). |
| Snow-free bare ground | Moon and Mars terrain and mobility tests | High-latitude polar deserts in late summer | 🟡 to check with monthly snow data |
| Cold, with a large day–night temperature swing | Mars (mean ≈ −60 °C) | Polar and high-altitude deserts in their cold season | 🟡 to check with monthly temperature data |
| Dust activity | Mars dust season | Desert dust seasons | 🟡 to check with monthly dust data |
| Frozen, dry ground | Mars mid-latitude ground ice | Permafrost after the surface layer refreezes | 🟡 later version |
| Darkness and cold | Lunar permanently shadowed regions (PSRs) | Polar night. Small PSRs are dimly lit by scattered light, so twilight may match better than total darkness. | 🟡 later version |

**Fidelity still depends on the test.** The same site in the same month can suit a rover mobility test and be useless for an ISRU test.

## Is it new? (checked 14 Nov 2026)
| What exists | Why it is different |
|---|---|
| Campaigns choose a field season (Arctic summer, austral summer) | Chosen for **logistics and safety**, not to match the target body |
| Analog sites matched to periods of Mars's geological history | **Geological** time, not seasons |
| Static catalogues and rankings (ESA, Europlanet, USGS, NHSJS 2026) | One fixed answer per site, all year |
| Artificial lighting (spotlights, lab lamps, virtual simulation) | Reproduces **one** condition, at night or indoors, over a small area |

**Result:** our searches found no study or tool that maps analog fidelity **month by month across Earth**. That does not prove none exists. We should keep checking, for example by asking challenge mentors.

## Sources (new in this file)
- NBC News, *Earth looked at for clues into history of Mars* (analog sites matched to Mars's geological periods): https://www.nbcnews.com/id/wbna40605820
- Wagner et al. 2024, *The Not-Really-That-Dark Side of the Moon: Light Levels in Shadowed Craters*, LPSC 55, abstract 2513: https://www.hou.usra.edu/meetings/lpsc2024/pdf/2513.pdf
- NHSJS 2026, *Finding Earth's Best Testbeds for Moon and Mars Rovers*: https://nhsjs.com/2026/finding-earths-best-testbeds-for-moon-and-mars-rovers-a-quantitative-terrain-comparison/
- Low-sun hours: see the table and method in `01_Problem_Space.md` §3
