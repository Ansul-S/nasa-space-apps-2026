# Analog pipeline

Calculates, for each Earth site and lunar target, when the Sun sits in the target's low-sun band, how many usable test days a campaign can expect, and the monthly conditions for the seasonal calendar and the fidelity card. The output is a set of static JSON files that the website reads.

## Run
```sh
cd pipeline
uv sync
uv run python -m analog_pipeline.fetch_terrain   # writes config/terrain.json (about 1 minute)
uv run python -m analog_pipeline.build           # writes ../web/public/data
uv run pytest -q
```
The build reads the downloaded data in `data/raw/` (not in the repository). The download commands are in the docstrings of `fetch_merra2.py`, `fetch_power.py` and `fetch_snow.py`. The validation tests skip themselves when the raw data is missing. `fetch_terrain.py` needs no account; it caches its elevation patches in `data/raw/terrain/`, and the build reads its result from `config/terrain.json`.

## Data
| Condition | Source | Grid | Time step |
|---|---|---|---|
| Sun position | Calculated with the NOAA solar calculator algorithm, checked against NREL SPA | Exact point | 5 min |
| Air temperature (2 m), wind (10 m) | MERRA-2 `M2T1NXSLV` v5.12.4 | 0.5° × 0.625° | 1 h |
| Cloud amount | CERES SYN1deg, through the NASA POWER hourly API (`CLOUD_AMT`) | 1° | 1 h |
| Precipitation | MERRA-2 `PRECTOTCORR`, through the NASA POWER hourly API | 0.5° × 0.625° | 1 h |
| Snow cover | MODIS/Terra `MOD10CM` v061, mean of the 5 × 5 pixels around the site | 0.05° | 1 month |
| Surface type of each weather cell | MERRA-2 `M2C0NXASM` v5.12.4, stored in `config/merra2_cells.json` by `fetch_constants.py` | 0.5° × 0.625° | Fixed |
| Terrain at the lunar targets | LRO LOLA polar elevation model `LDEM_80S_40M` (PDS Geosciences Node), read by HTTP range request | 40 m | Fixed |
| Terrain at the Earth sites | Copernicus DEM GLO-30 (ESA; AWS Open Data copy of the cloud-optimised tiles), averaged onto a 40 m grid | 30 m | Fixed |

Record: 2016-01-02 to 2025-12-30 (10 years, 3,651 local days).

`MOD10CM` maps Antarctica as snow by design. Snow cover is therefore not measured at the Antarctic sites; the files say so and the ground row is "not calculated".

## Method
**Days.** Each day is a local mean solar day (UTC + longitude / 15 h). A window around local midnight or noon is never split by the UTC date. A stretch of time belongs to the day that holds its midpoint.

**Sun band.** Apparent sun elevation (with refraction, flat horizon) from 0° up to the target's `band_max_deg` = (90° − |target latitude|) + 1.5°.

**Usable day.** A day is usable when the Sun stays in the band for one unbroken stretch of at least 2 hours, and during that stretch:
- cloud amount is at or below the preset limit (30% strict, 50% relaxed), every hour;
- wind at 10 m is at most 7.7 m/s over snow or 10 m/s over bare ground, every hour (snow-covered means monthly snow cover of 50% or more; unknown snow counts as snow);
- wind chill is at or above the preset limit (−28 °C default, −40 °C option), every hour;
- precipitation for the day is below 1 mm.

Wind chill uses the Environment Canada / US National Weather Service formula. The rule is evaluated at 5-minute steps; each step uses the hourly values of the hour that contains it.

**Presets.**
| id | Cloud | Wind chill | Note |
|---|---|---|---|
| `strict-28` | ≤30% | ≥ −28 °C | Default |
| `relaxed-28` | ≤50% | ≥ −28 °C | |
| `strict-40` | ≤30% | ≥ −40 °C | Very high frostbite risk |
| `relaxed-40` | ≤50% | ≥ −40 °C | Very high frostbite risk |

**Campaign odds.** Every day of the record starts one 14-day campaign. The usable days in each campaign are grouped by start month: mean, median, 10th and 90th percentile, and the chance of at least 3 usable days. The per-year value is the median for the campaigns that start in that month of that year. Days are not assumed to be independent.

**Best window.** The calendar start day with the highest mean number of usable days, after a 7-day running mean over start days. Its statistics use all campaigns that start within 3 days of it (70 campaigns over 10 years). Choosing the best of 365 start days makes that mean too high, so `held_out_mean` is given next to it: the window is chosen without one year and scored on that year, for each year in turn. Quote `held_out_mean` as the expected number of usable days.

**Weather cell.** MERRA-2 gives one value per grid cell, weighted over the cell's surface types. Each site's cell is classed as `representative` (at least 50% bare land), `not_representative` (under 5% bare land and at least 75% land ice) or `mixed` (everything else). In a `not_representative` cell the temperature, wind chill and usable days describe the ice sheet next to the site and are too pessimistic.

**Score.** The share of usable days in the calendar month, from 0 to 1, for one target and preset. The ranked list sorts by it.

**Terrain slope.** A 10 km × 10 km box is centred on each target and site and sampled on a 40 m grid: the LOLA polar stereographic grid on the Moon (pixel size corrected for the projection scale, under 0.2% at these latitudes), and on Earth the Copernicus DEM averaged into a 40 m azimuthal equidistant grid centred on the site. Sea pixels (0.5 m or lower) are removed. Slope uses Horn's 3 × 3 method, so both bodies are measured at the same baseline. Each box gives the median and 90th-percentile slope, the share steeper than 15°, the relief and a 2° histogram. The site and target distributions are compared with the Kolmogorov-Smirnov distance: the largest difference, over all slopes, between the shares of ground below that slope.

**Match levels.** For conditions measured as a share of days or hours: `match` at 80% or more, `partial` from 20% to 80%, `breaks_down` under 20%. Ground: snow-free (under 10% snow) is `match`, patchy (10–50%) is `partial`, snow-covered (50% or more) is `breaks_down`. Terrain: `match` when the Kolmogorov-Smirnov distance is 0.2 or less, `partial` up to 0.5, `breaks_down` above; the level is the same in every month. Sun motion and sky light are always `breaks_down`. Gravity, vacuum and radiation are always `impossible`.

**Flags.** `polar_night`: the Sun stays below the horizon all day on at least half the days of the month. `extreme_cold`: the median hourly wind chill of the month is below −40 °C.

## Data contract (schema version 1)
All monthly arrays have 12 entries, January first. Missing values are `null`.

### `index.json`
| Key | Content |
|---|---|
| `period` | `start`, `end`, `days`, `years` of the record |
| `campaign_days`, `min_usable_days` | 14 and 3 |
| `targets[]` | `id`, `name`, `body`, `lat`, `lon`, `band_min_deg`, `band_max_deg`, `sun_rate_deg_per_h` (on the Moon), `terrain` (see below) |
| `objectives[]` | From `config/targets.json` |
| `presets[]` | `id`, `label`, `cloud_max_pct`, `wind_chill_min_c`, `default`, `warning` |
| `rule`, `thresholds`, `levels` | The rule and threshold values above, and a description of each match level |
| `fidelity_rows[]` | Card rows in display order: `id`, `label`, `kind` (`fidelity`, `earth_only`, `operations`), optional `source`, fixed `level` and `note` |
| `sources` | Source id → `name`, `detail` (including the grid), `url` |
| `terrain` | `method`, `grid_m`, `box_km`, `steep_deg`, `hist_edges_deg`, or `null` before `fetch_terrain` has run |
| `sites[]` | `id`, `name`, `region`, `lat`, `lon`, `role` (`validation` or `candidate`), `known_analog`, `utc_offset_solar_h`, `weather_cell_class`, `terrain` |
| `weather_cell_classes` | Class → text to show with the result |
| `scores[target][preset][site]` | `score`, `median`, `p10`, `p90`, `p_at_least` (monthly arrays) and `best_window` |
| `conditions[target][site]` | `band_hours`, `window_days_share` (monthly arrays) |
| `site_conditions[site]` | `cloud_mean_pct`, `snow_pct`, `wind_chill_median_c`, `flags` (monthly arrays) |

`terrain` on a target or site: `land_share`, `median_slope_deg`, `p90_slope_deg`, `steep_share` (steeper than `steep_deg`), `relief_m`, `hist_share` (share in each 2° bin from `hist_edges_deg`, then one bin above 40°), or `null`.

### `sites/<site id>.json`
| Key | Content |
|---|---|
| `site`, `period` | As in the index |
| `grid` | `merra2_cell` {`lat`, `lon`, `land`, `land_ice`, `ocean`, `lake` (fractions), `elevation_m`, `class`, `note`}, `merra2_deg`, `ceres_deg`, `modis_window_km` |
| `snow_note` | Why snow is not measured, or `null` |
| `months[]` | Site conditions per month: `sun_min_deg`, `sun_max_deg` (mean daily extremes), `polar_night_share`, `cloud_mean_pct`, `clear_hours_share` {"30", "50"}, `dry_days_share`, `t2m_mean_c`, `wind_mean_ms`, `wind_chill_median_c`, `wind_chill_p10_c`, `wind_chill_ok_share` {"-28", "-40"}, `snow_pct` (median of the years), `snow_class` (`snow_free`, `patchy`, `snow_covered` or `null`), `snow_years` (one value per year), `flags` |
| `targets[target].months[]` | `band_hours` (mean hours per day in the band), `longest_window_hours`, `window_days_share` (days with a stretch of 2 h or more), `sun_rate_deg_per_h` (mean azimuth speed in the band), `level` (sun band match level) |
| `targets[target].presets[preset].months[]` | `usable_share`, `score`, `odds` {`mean`, `median`, `p10`, `p90`, `p_at_least`, `n`, `years`}, `levels` {`sun_band`, `clear_sky`, `ground`, `wind_chill`, `sun_motion`, `sky_light`, `terrain`} |
| `targets[target].presets[preset].best_window` | `start`, `end` ("MM-DD"), `mean`, `median`, `p10`, `p90`, `p_at_least`, `n`, `held_out_mean`, or `null` |
| `targets[target].terrain` | `ks` (Kolmogorov-Smirnov distance between the site's and the target's slope distributions) and `level` |
| `targets[target].daily_usable` | One hex digit per day from `period.start`; bit *i* is set when the day is usable under `presets[i]` (index order). Other campaign lengths and start dates can be computed from it; the website does not use it yet. |
| `sun_samples` | For the 15th of each month of 2025: `elevation` and `azimuth` every `step_min` minutes from local solar midnight, and `windows[target]` as [start, end) minute pairs in the band |

## Checks and findings
Checks run on the results (14 Nov 2026):
- Repeated on 15 Nov 2026 for all ten years at four sites with separate code (NREL SPA at 1-minute steps): Peary Land differs on 1 of 3,651 days, Devon Island on 7, Vestfold Hills on 6, and Kronprins Christian Land (Malapert, relaxed cloud, −40 °C) on 4. The best windows start within 2 days of the published ones. A rebuild from the raw data reproduces the published site files byte for byte.
- An independent calculation with NREL SPA sun positions at 1-minute steps gives the same usable days for Ellesmere Island in 2020 under all four presets, and differs on 1 to 3 marginal days at Vestfold Hills.
- Hours with the Sun in the band are not less cloudy than other hours of the same month, so the cloud data shows no low-sun bias in favour of the result.
- Requiring the Sun to be at least 1° or 2° up lowers the best-window means by 0.1 to 0.6 days of 14 and does not change the ranking.
- MERRA-2 is within about 2 to 4 °C of station normals at the Arctic sites checked, and 7 to 12 °C too cold in summer at the two Antarctic sites classed `not_representative`.

Terrain (15 Nov 2026). Mons Mouton's plateau top has a median slope of 5.9° (90% under 10.9°); Malapert's summit 18.9° (90% under 25.6°). Against Mons Mouton, the San Francisco Volcanic Field matches on terrain (distance 0.19) while it fails on lighting in every month, as the roadmap's Arizona check expects. Peary Land (0.14) and Vestfold Hills (0.17) also match; the flat coastal plains at Station Nord and Cape Baranov break down. No site matches Malapert; the mountainous sites (Svalbard, Axel Heiberg, Ellesmere, McMurdo) are partial.

Spring and autumn in the High Arctic, at the −28 °C wind chill limit (Ellesmere Island, usable days in April against 15 September to 14 October):
- **Relaxed cloud:** autumn is better. It has more usable days in 10 of 10 years (122 against 76 in total).
- **Strict cloud:** the two are comparable. Autumn has more usable days in 6 of 10 years (68 against 46), and April draws level if the air is 3 °C warmer than MERRA-2.
- **At the −40 °C limit** April is better.

## Limits
- A weather grid cell that is mostly ice sheet or ocean does not describe a bare-ground site inside it. Each site file gives the cell's surface fractions and a class.
- The cloud data could not be compared with ground observations, and its accuracy is lowest when the Sun is near the horizon.
- The 80% and 20% match-level thresholds are a design choice, not a published standard.
- Cloud comes from a 1° grid and weather from a 0.5° × 0.625° grid, so local effects such as valley fog are missed.
- Cloud detection over snow and ice is uncertain, and near the horizon the line of sight crosses more sky than the cloud fraction suggests, so the cloud limit is optimistic.
- Precipitation poleward of 62.5° is model output without rain-gauge correction.
- 10 years give 10 seasons, so the 10th and 90th percentiles are uncertain.
- Flat horizon: local terrain can block the low Sun.
- The band's upper edge uses 1.5° for the Moon's tilt. An ephemeris check (astronomy-engine, 2020–2039) puts the Sun up to 1.59° from the lunar equator, so the highest Sun at the centre of Mons Mouton is 6.98° and at Malapert Massif 5.61°, up to 0.1° above the band.
- Usable days do not depend on snow, apart from the wind limit. In every Arctic best window at the default settings the ground is snow-covered (76% to 100% monthly snow cover), which the ground row rates `breaks_down`. The best snow-free month is August on Cornwallis Island (2% snow cover): 0.6 expected usable days of 14 at the default settings and 2.1 with relaxed cloud.
- `known_analog` is our own short list from a literature search, not the USGS known-sites layer.
- Terrain compares slope only, in one 10 km box per place. Roughness, rocks and boulders at scales finer than 40 m are not compared.
- The LOLA grid is interpolated between altimeter tracks, which can smooth slopes on the Moon side.
- The Copernicus DEM is a surface model: glacier and snow surfaces count as terrain. At Station Nord, Hayes Island and Cape Baranov less than half of the box is land.
