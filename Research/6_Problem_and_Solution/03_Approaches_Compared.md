# 03 · Approaches Compared

Six approaches were assessed against the project principles (real problem, specific user, clear USP, essential features only) and the Space Apps judging criteria (Impact, Creativity, Validity, Relevance, Presentation).

## The candidates
| # | Approach | Core idea |
|---|---|---|
| A | **Generic global similarity map** | Score every Earth cell against Moon/Mars sites on many dimensions and show a heat map |
| B | **Visual / image similarity** | Rank Earth sites by how much satellite imagery *looks* like the Moon or Mars |
| C | **ML terrain embeddings** | Train a model on DEM patches from three bodies; find look-alike terrain |
| D | **Radar twins** | Compare Earth compact-pol radar (RCM) with lunar Mini-RF radar |
| E | **Process analogs** | Match dust storms and dune migration between Earth and Mars |
| F | **Test-first, time-aware analog planner** | The user picks a target and a test. The tool ranks Earth **sites and date windows** for that test, with a numeric fidelity report |

## Assessment
✅ strong · 🟡 partial · ❌ weak

| Criterion | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Solves the documented problem (`01`) | 🟡 finds sites, ignores purpose and time | ❌ | 🟡 | 🟡 | 🟡 | ✅ purpose, time and limits |
| Specific target user (`02`) | ❌ "anyone" | ❌ | ❌ | 🟡 radar specialists | 🟡 scientists | ✅ test lead / analog researcher |
| USP / novelty | 🟡 obvious, many teams will build it | ❌ already published (NHSJS 2026) | 🟡 | ✅ | 🟡 | ✅ time windows are new; we found no prior tool |
| Beyond visual similarity (judging signal) | ✅ | ❌ explicitly discouraged | 🟡 | ✅ | ✅ | ✅ |
| States where the analogy breaks | 🟡 | ❌ | ❌ black box | 🟡 | 🟡 | ✅ built into every result |
| Practical applications (challenge item 4) | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ✅ the test *is* the input |
| Moon **and** Mars | ✅ | ✅ | ✅ | ❌ Moon only | ❌ Mars only | ✅ same engine, different tests |
| Feasible in a hackathon | ✅ | ✅ | ❌ high risk | ❌ heavy SAR processing | 🟡 | ✅ the lighting part is plain astronomy maths |
| Credible validation | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ✅ can explain why NASA uses spotlights in Arizona |

## Why F, and what it keeps from the others
- **F contains A** as its engine. The global per-dimension scoring is still there, but each test sets the weights, and time is added as a dimension. So it still meets the challenge's "map, compare, rank, explain".
- It **drops B and C**. Visual similarity is discouraged by the challenge, and ML here would be technology for show, against principle 3.
- It **defers D and E**. Radar twins and process analogs are possible later extensions, not core features.

## The key insight behind F
> **An analog is a site, a time window and a test, not just a site.**
> The same site can be a strong analog for rover navigation in late August and a poor one in June. It can be excellent for terrain and useless for ISRU.

Today nobody answers "where **and when** should I test **this**?" with numbers.
