# 01 · Problem Space: How Earth Analogs Are Chosen Today

Research date: 14 Nov 2026. This file looks only at the **problem**: the field, its current pain points, how often they occur, what they cost and where current solutions fall short. Solutions are discussed in `03` and `04`.

## 1. The field
**Planetary analog research and mission preparation.** Earth sites are used to:
- train crews
- test hardware and operations (rovers, EVA, navigation, landing sensors, ISRU)
- study processes before and during Moon and Mars missions.

| Who does this work | Examples |
|---|---|
| Space agencies | NASA Joint EVA Test Team (JETT), ARDVARC, Desert RATS heritage; CSA Analogue Terrain; ESA training programmes |
| Commercial teams | NASA Lunar Terrain Vehicle (LTV) providers, CLPS rover and lander companies |
| Science teams | NASA-funded analog field research (PSTAR and its predecessors ASTEP and MMAMA), university groups, graduate students |

**Why it matters now:**
- NASA plans the **first crewed landing near the lunar South Pole in early 2028 (Artemis IV)**, with two crew members spending about a week on the surface.
- A ~US$30 billion Moon Base plan targets a **permanent presence at the South Pole by 2036**.
- Every surface system needs Earth testing before then.

## 2. What makes the South Pole different
- **Low sun.** It stays about **1–7° above the horizon** at the candidate landing regions, never more than about 7°. Apollo crews worked at about 8–50°.
- **Long shadows.** At a 1.5–2° sun angle, a shadow is about **27 times the object's height**. Mountains up to **120 km away** cast shadows on the landing area.
- **Hard to drive.** In NASA's virtual lighting study, astronauts found driving toward the Sun hard. They preferred tacking ±20–30° off-sun, and judged slope and depth poorly in shadowed craters, so they drove more slowly.
- **A known safety risk.** NASA lists ambient lighting as an EVA risk: glare, the sun in the field of view, and extreme contrast.

## 3. The problems

### Problem 1: Sites are chosen by familiarity and logistics, not measured fidelity
The best evidence is the USGS survey of the analog community (Open-File Report 2024-1042). It had 248 respondents: 62% were involved in active mission work and 74% were NASA-funded.

| Finding | Number |
|---|---|
| Researchers work at sites they already know and rarely start projects at new ones (Finding 11) | 60% visit a site before starting a formal project there |
| Some think relevant sites are hard to reach and don't know of closer alternatives (Finding 10) | 50% of those who rank proximity as important say sites are "too difficult to get to" |
| Not knowing the relevant sites is the 2nd most common barrier to fieldwork, after funding | 12% (funding: 33%) |
| Graduate students don't know where relevant field sites are | **40%** |
| Graduate students and early-career researchers don't know where to find relevant field data | 32% |

The USGS's own recommendations name the gap:
- **Rec. 10/11A:** "develop a database of planetary analog field locations, searchable by relevant processes and planetary bodies … some of which may be in closer proximity … than previously recognized."
- **Rec. 10/11B:** "**A community standard for criteria to define what makes a good analog is needed.**"

The Artemis-era practice matches this:
- The ARDVARC campaign chose Arizona's Cinder Lake Crater Field on five criteria: topography, logistical access, vegetation, phone signal and geologic diversity. Only the first is about Moon-likeness. The field was built in 1967 for Apollo training.
- A 2026 study describes analog site identification as relying on "logistical convenience, qualitative geomorphological similarity, and the availability of field infrastructure."

### Problem 2: Fidelity depends on the test, but analogs are catalogued as generic places
- Foucher et al. (2021) argue that analog fidelity is **relative to the intended use**: a "functional analogue" is chosen for the specific properties a test needs to reproduce. A good site for rover mobility may be poor for ISRU or for lighting.
- Lee (2008) lists "aspect(s) of interest" and "application(s)" as the first factors in choosing an analog.
- Existing catalogues describe **places**, not how well they suit a test (see §5).

### Problem 3: Conditions change over time, but analogs are treated as static
Lunar polar lighting is the clearest case, and today it is **faked with artificial light**:
- **JETT3** used a lighting cart to mimic South Pole sun angles.
- **JETT5** (13–17 May 2024, San Francisco Volcanic Field, Arizona) ran EVAs at night with a portable spotlight standing in for the Sun.
- **CSA Analogue Terrain** (120 m × 60 m) is lit by an 18 kW "sun gun" at night.
- **NASA Ames POLAR datasets** were captured in a lab with lamps at four low positions.
- NASA's driving studies used a **virtual** simulation.

**Our feasibility check.** Hours per day the Sun spends in the Artemis 0–7° band:
- **Method:** geometric sun position at mid-month, flat horizon, no refraction.
- **Purpose:** a first estimate of feasibility, not a final result.

| Site | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flagstaff, AZ (JETT/ARDVARC area) 35.3°N | 1.3 | 1.2 | 1.2 | 1.1 | 1.2 | 1.3 | 1.3 | 1.1 | 1.2 | 1.2 | 1.3 | 1.3 |
| Iceland highlands 64.8°N | 4.6 | 3.0 | 2.3 | 2.3 | 2.9 | 3.9 | 3.3 | 2.4 | 2.2 | 2.6 | 5.6 | 3.2 |
| Devon Island (Haughton) 75.4°N | 0 | 3.3 | 4.2 | 4.2 | 5.0 | 0 | 0.9 | 5.9 | 3.8 | 6.6 | 0 | 0 |
| Svalbard 78.2°N | 0 | 0 | 5.7 | 5.6 | 0.4 | 0 | 0 | 7.4 | 4.7 | 4.8 | 0 | 0 |
| Ellesmere / N. Greenland 81.0°N | 0 | 0 | 9.6 | 10.0 | 0 | 0 | 0 | 5.6 | 6.2 | 0 | 0 | 0 |
| McMurdo Dry Valleys 77.5°S | 0 | 8.1 | 4.3 | 5.6 | 0 | 0 | 0 | 0 | 5.0 | 5.1 | 1.9 | 0 |

**What the table shows:**
- **Flagstaff:** about 1.2 h a day, split into two ~39-minute windows at dawn and dusk, all year. This explains why NASA tests there at night with a spotlight.
- **High-latitude polar deserts:** **5–10 hours a day in specific months.** One unbroken window around local midnight, e.g. Svalbard mid-August, 20:17–03:44 solar time.
- **Combined conditions vary too.** Snow cover, frozen ground and temperature change by month. A site may meet the lighting condition only in weeks when it's also snow-free, or never.
- **No prior field work found.** We found no published study that tested rover cameras or navigation at a high-latitude site timed to these low-sun windows.

### Problem 4: The limits of a site are rarely measured or stated
The challenge asks teams to say where an analogy breaks down. In practice the limits are given in prose, if at all. Some limits can be measured:

| Limit | Status |
|---|---|
| Gravity, vacuum, radiation | Earth cannot reproduce them at all |
| Sun motion | It moves around the sky about **28 times faster** on Earth than on the Moon (~15°/h vs ~0.5°/h). In Svalbard's 7.5-hour August window it sweeps ~108° of azimuth; on the Moon it would sweep ~4°. A given shadow layout lasts minutes on Earth but hours on the Moon. |
| Shadow darkness | Earth's sky lights up shadows, so they are never as black as on the Moon |

## 4. How often, how much it matters, what it costs
| Question | What we found |
|---|---|
| **How often?** | Each campaign makes a site decision, and campaigns are frequent: the JETT series, ARDVARC, LTV testing, recurring NASA analog-research calls, and student campaigns (e.g. MAHINA 2026). The Moon Base plan will add many more. |
| **How much does it matter?** | A poorly matched site gives results that may not carry over to the Moon. Lighting is a **named crew-safety risk** for Artemis. A wrong date at a good site wastes the trip. |
| **What does it cost?** | Remote sites need multi-leg travel and charter flights, e.g. Devon Island via Iqaluit, Resolute and a charter. The USGS notes that finding suitable sites closer to home "reduc[es] costs associated with large field expeditions." We found no public per-campaign budgets, so we don't claim a dollar figure. |

## 5. Current solutions and where they fall short
| Existing option | What it does | Where it falls short |
|---|---|---|
| ESA *Catalogue of Planetary Analogues* (CAFE study, Open University) | Descriptive catalogue of sites on all continents | Qualitative; not searchable by test; no ranking; no time dimension |
| Europlanet TA1 field sites | Funded access to 5 sites (Iceland, Rio Tinto, Danakil, Kangerlussuaq, Makgadikgadi) | A fixed short list, not a search |
| USGS *Known Terrestrial Analog Sites* (DOI 10.5066/P9J72921) | Point layer: `Name`, `AnalogType`, `Lat`, `Lon`, `AnalogBody` | Its stated purpose is "for identification of research areas, **not for analysis**." No fidelity scores. |
| USGS Planetary Aeolian Analog Database | Dune-field analog database | One process only |
| Quantitative image study (NHSJS, 2026) | Ranks 10 well-known sites by image texture vs Moon/Mars | Visual only; admits illumination distorts results; no test purpose; no time; known sites only |
| Spotlights, lab lamps and virtual simulation | Reproduce low-sun lighting | Small areas or no real terrain; night-time only; no natural regolith-scale scenery |
| Expert knowledge and precedent | Teams reuse familiar sites | Not transparent or reproducible; biased toward the familiar (USGS Finding 11) |

## 6. The problem in one sentence
> Teams that test Moon and Mars systems on Earth choose sites by familiarity and logistics. They have no measured way to know how faithful a site is **for their specific test**, or **when** it is most faithful. Meanwhile the defining South Pole condition, low-angle sunlight, is reproduced with spotlights at night.

## Sources
- USGS OFR 2024-1042, *Assessing Community Needs for Terrestrial Analog Studies*: https://pubs.usgs.gov/publication/ofr20241042
- Foucher et al. 2021, *Definition and use of functional analogues in planetary exploration*, PSS 197, 105162: https://hal.archives-ouvertes.fr/hal-03130725
- Lee et al. 2008, *Terrestrial Analogs for Lunar Science and Exploration: A Systematic Approach*: https://ri.cmu.edu/?p=10114
- ARDVARC campaign, LPSC 2024 abstract 2463: https://www.hou.usra.edu/meetings/lpsc2024/pdf/2463.pdf
- USGS, Artemis III mission tests in the San Francisco Volcanic Field (JETT5): https://www.usgs.gov/centers/astrogeology-science-center/news/artemis-iii-mission-tests-san-francisco-volcanic-field
- NASA, *A Moonlit Moonwalk* (JETT5 night EVA): https://www.nasa.gov/image-article/a-moonlit-moonwalk
- Litaker et al. 2025, *South Pole Lunar Lighting Studies for Driving Exploration on the Lunar Surface* (IEEE Aerospace): https://ntrs.nasa.gov/citations/20240011393
- NASA OCHMO, *Artemis Lighting Considerations* technical brief: https://www.nasa.gov/wp-content/uploads/2023/03/artemis-lighting-considerations-overview-technical-brief-ochmo.pdf
- NASA, IAASS 2023 paper on EVA risks from ambient lighting: https://ntrs.nasa.gov/citations/20230006313
- Lunar rover field test at the CSA Analogue Terrain ("sun gun"), arXiv 2601.03371: https://arxiv.org/abs/2601.03371
- NASA Ames POLAR Stereo / Traverse datasets: https://ti.arc.nasa.gov/dataset/PolarTrav/
- ESA, *Cataloguing otherworldly landscapes on Earth*: https://www.esa.int/Our_Activities/Preparing_for_the_Future/Discovery_and_Preparation/Cataloguing_otherworldly_landscapes_on_Earth
- Europlanet TA1 Planetary Field Analogues: https://europlanet-society.org/?p=8693
- USGS, Known Terrestrial Analog Sites for Planetary Science: https://www.usgs.gov/data/known-terrestrial-analog-sites-planetary-science
- USGS, PAAD Planetary Aeolian Analog Database: https://www.usgs.gov/data/paad-planetary-aeolian-analog-database
- NHSJS 2026, *Finding Earth's Best Testbeds for Moon and Mars Rovers*: https://nhsjs.com/2026/finding-earths-best-testbeds-for-moon-and-mars-rovers-a-quantitative-terrain-comparison/
- NASA, Artemis IV: https://www.nasa.gov/mission/artemis-iv/
- Scientific American, *NASA unveils ambitious new moon base plans*: https://www.scientificamerican.com/article/nasa-unveils-new-ambitious-moon-base-plans/
- NASA Ames Mission blog (Devon Island access route), Aug 2014: https://blogs.nasa.gov/mission-ames/2014/08
