# 02 · Target User

The answer must be specific, not "everyone interested in space". It is based on the evidence in `01_Problem_Space.md`.

## Primary user: the field-test lead for lunar South Pole surface systems
**Who:** the engineer or operations lead who decides **where and when** a field test of a South Pole surface system takes place. Examples:

| Organisation type | Example role |
|---|---|
| Space agency | EVA or rover test lead at NASA (JETT-style tests) or CSA (Analogue Terrain tests) |
| Commercial | Test engineer at an LTV or CLPS rover or lander company: mobility, navigation cameras, hazard detection |
| University / research | Lead of a rover or autonomy team preparing a field campaign |

**Their job:**
1. Pick a site and a date window for a test campaign of 1–3 weeks.
2. Justify the choice to managers, reviewers or funders: "Why here? How Moon-like is it for *this* test?"
3. Write the test plan and know beforehand which results will carry over to the Moon and which won't.

**How often:** one or more campaigns per programme per year, across many programmes, and the Moon Base plan to 2036 increases this.

**Skills and limits:**
- Strong engineers, but usually **not remote-sensing or GIS specialists**.
- They don't have days to download and process satellite data to compare sites.
- They work with test plans, spreadsheets and slides, so results must fit into those.

### Their current journey and friction
| Step | Today | Friction |
|---|---|---|
| 1. Shortlist sites | Reuse familiar or precedent sites; ask colleagues | Biased toward the familiar (USGS Finding 11); better or closer sites go unnoticed |
| 2. Judge fidelity | Visual similarity, expert opinion | No numbers; can't compare sites fairly; depends on who you ask |
| 3. Reproduce lighting | Spotlights at night, lab lamps, virtual simulation | Small lit areas, artificial setups, no natural terrain lit by real low sun |
| 4. Choose dates | Logistics and the field season | Nobody checks *when* a site best matches the target |
| 5. Write justification | Prose in the test plan or proposal | Limits are found in the field, not before |

### What they need from us
- A **shortlist** of Earth sites ranked for *their test* and *their target region* (e.g. Mons Mouton or Malapert Massif).
- The **best date and time windows** at each site.
- An honest, numeric **fidelity report**: what matches, what partly matches, and what Earth can't reproduce.
- **Export** they can paste into a test plan or proposal: a table, map file or printable card.
- **No accounts, no downloads, no GIS skills.**

## Secondary user: the planetary scientist or student choosing an analog site
- **Who:** researchers and graduate students choosing a Moon or Mars field site.
- **Why:** the USGS survey found **40% of graduate students don't know where relevant field sites are**. It also found researchers stick to familiar locations.
- **How we serve them:** the same engine with **science objectives** (e.g. Mars mineralogy or hyperaridity) instead of engineering tests. This covers the Mars side of the challenge without a second product.

## Who we are *not* designing for (for now)
- **The general public / education.** Valuable, but it would pull the design toward storytelling instead of decisions. It can be a later mode.
- **Mission planners choosing landing sites on the Moon or Mars.** That is a different problem. We take the target site as an input.

## Design rules that follow from this user
1. **Start from the test, not the map.** The first question is "What do you want to test, and for which target?"
2. **Show evidence, not just a score.** Every ranking opens into per-dimension numbers with sources.
3. **Time is part of the answer.** "Where" is always given with "when".
4. **Say the limits up front.** Every result lists what will *not* carry over to the Moon or Mars.
5. **Fit their workflow.** One-click export to CSV, GeoJSON and a printable card.

## To confirm with the team
- Is this primary user agreed, or do we lead with the science user?
- Can we reach one real test engineer or analog researcher (mentor, local event, university contact) to check this journey before building?
