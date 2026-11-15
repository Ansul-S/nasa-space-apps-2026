"""Calculate every site and write the static JSON files that the website reads.

Output (see pipeline/README.md for the full data contract):
- index.json: targets, objectives, presets, rule, sources, sites and the
  monthly scores used for the ranked list and the map
- sites/<site id>.json: monthly conditions, campaign odds by month and preset,
  per-year values, daily usable days, sun-window samples and fidelity levels

Usage:
    uv run python -m analog_pipeline.build [--out ../web/public/data]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import math
from functools import lru_cache
from pathlib import Path

import numpy as np

from .analysis import SiteDays, analyse_site, sun_day
from .conditions import (
    EXTREME_COLD_C,
    MATCH_SHARE,
    PARTIAL_SHARE,
    POLAR_NIGHT_SHARE,
    SNOW_FREE_PCT,
    TERRAIN_MATCH_KS,
    TERRAIN_PARTIAL_KS,
    preset_result,
    site_months,
    target_months,
    terrain_level,
    years_of,
)
from .odds import CAMPAIGN_DAYS, MIN_USABLE
from .rules import BAND_MIN_DEG, PRESETS, SNOW_COVERED_PCT, preset_dict, rule_dict, runs
from .sites import CONFIG_DIR, PIPELINE_DIR, Site, Target, load_sites, load_targets

log = logging.getLogger("build")

SCHEMA_VERSION = 1
DEFAULT_OUT = PIPELINE_DIR.parent / "web" / "public" / "data"
SAMPLE_YEAR = 2025
SAMPLE_DAY = 15
SAMPLE_STEP_MIN = 10
LUNAR_SYNODIC_DAY_H = 29.530589 * 24

# MERRA-2 grid, as in fetch_merra2: 0.5 deg latitude from -90, 0.625 deg longitude from -180.
MERRA2_DLAT, MERRA2_DLON = 0.5, 0.625

SOURCES = {
    "sun": {
        "name": "Calculated sun position (NOAA solar calculator algorithm, after Meeus)",
        "detail": "Apparent elevation with NOAA refraction, flat horizon, 5-minute steps. Checked against NREL SPA.",
        "url": "https://gml.noaa.gov/grad/solcalc/calcdetails.html",
    },
    "merra2_const": {
        "name": "MERRA-2 M2C0NXASM v5.12.4 (surface type fractions and height)",
        "detail": "Share of bare land, land ice, ocean and lake in each weather grid cell, and the cell's surface height.",
        "url": "https://doi.org/10.5067/ME5QX6Q5IGGU",
    },
    "merra2_slv": {
        "name": "MERRA-2 M2T1NXSLV v5.12.4 (T2M, U10M, V10M)",
        "detail": "Hourly 2 m air temperature and 10 m wind. Grid 0.5° × 0.625°. NASA GES DISC through Earthdata OPeNDAP.",
        "url": "https://doi.org/10.5067/VJAFPLI1CSIV",
    },
    "ceres_cloud": {
        "name": "CERES SYN1deg cloud amount, through the NASA POWER hourly API (CLOUD_AMT)",
        "detail": "Hourly total cloud amount. Grid 1°. Cloud detection over snow and ice is uncertain.",
        "url": "https://power.larc.nasa.gov/docs/services/api/temporal/hourly/",
    },
    "merra2_precip": {
        "name": "MERRA-2 bias-corrected precipitation, through the NASA POWER hourly API (PRECTOTCORR)",
        "detail": "Hourly precipitation. Grid 0.5° × 0.625°. Poleward of 62.5° this is model output without gauge correction.",
        "url": "https://doi.org/10.5067/7MCPBJ41Y0K6",
    },
    "modis_snow": {
        "name": "MODIS/Terra Snow Cover Monthly L3 Global 0.05° CMG (MOD10CM) v061",
        "detail": "Mean snow cover of the 5 × 5 pixels (about 25 km) around the site. Antarctica is mapped as snow by design, so it is not measured there.",
        "url": "https://doi.org/10.5067/MODIS/MOD10CM.061",
    },
}

LEVELS = {
    "match": f"Holds on at least {MATCH_SHARE:.0%} of days or hours. Terrain: the slope distributions differ "
    f"by at most {TERRAIN_MATCH_KS * 100:.0f} points at any slope",
    "partial": f"Holds on {PARTIAL_SHARE:.0%} to {MATCH_SHARE:.0%}. Terrain: the slope distributions differ "
    f"by at most {TERRAIN_PARTIAL_KS * 100:.0f} points",
    "breaks_down": f"Holds on under {PARTIAL_SHARE:.0%}, or differs in kind from the target. Terrain: the slope "
    f"distributions differ by more than {TERRAIN_PARTIAL_KS * 100:.0f} points",
    "impossible": "Cannot be reproduced on Earth",
    "not_calculated": "Not calculated for this site",
}

# Fidelity card rows. Rows with a fixed level are the same for every site and month.
FIDELITY_ROWS = [
    {"id": "sun_band", "label": "Sun elevation in the target band", "kind": "fidelity", "source": "sun"},
    {"id": "sun_motion", "label": "Speed of the Sun across the sky", "kind": "fidelity", "source": "sun",
     "level": "breaks_down", "note": "The Sun moves about 15° per hour on Earth and about 0.5° per hour on the Moon, so shadows turn about 30 times faster."},
    {"id": "sky_light", "label": "Black sky, no light in shadows", "kind": "fidelity", "level": "breaks_down",
     "note": "Earth's air scatters light into shadows and dims and reddens the low Sun. On the Moon shadows are black and the Sun is at full strength."},
    {"id": "ground", "label": "Bare ground (snow-free)", "kind": "fidelity", "source": "modis_snow"},
    {"id": "terrain", "label": "Slope and roughness", "kind": "fidelity", "level": "not_calculated",
     "note": "Terrain comparison from LOLA and the Copernicus DEM is not part of this version."},  # see fidelity_rows()
    {"id": "clear_sky", "label": "Clear sky for direct sunlight", "kind": "earth_only", "source": "ceres_cloud",
     "note": "The Moon has no cloud. On Earth a low-sun window needs a clear line of sight to the Sun."},
    {"id": "wind_chill", "label": "Wind chill within the crew limit", "kind": "operations", "source": "merra2_slv"},
    {"id": "gravity", "label": "Gravity (1/6 g)", "kind": "fidelity", "level": "impossible"},
    {"id": "vacuum", "label": "Vacuum", "kind": "fidelity", "level": "impossible"},
    {"id": "radiation", "label": "Radiation environment", "kind": "fidelity", "level": "impossible"},
]


TERRAIN_FILE = CONFIG_DIR / "terrain.json"


@lru_cache(maxsize=1)
def _terrain() -> dict | None:
    """Slope statistics written by fetch_terrain, or None before it has run."""
    return json.loads(TERRAIN_FILE.read_text()) if TERRAIN_FILE.exists() else None


def fidelity_rows() -> list[dict]:
    """The card's rows, with the terrain row filled in once fetch_terrain has run."""
    terrain = _terrain()
    if not terrain:
        return FIDELITY_ROWS
    row = {
        "id": "terrain",
        "label": "Terrain slope",
        "kind": "fidelity",
        "source": "copernicus_dem",
        "note": f"Slope on a {terrain['grid_m']:g} m grid in a {terrain['box_km']:g} km box: LOLA at the target, "
        f"the Copernicus DEM at the site. Match when the share of ground below any slope differs by "
        f"{TERRAIN_MATCH_KS * 100:.0f} points or less (partial: {TERRAIN_PARTIAL_KS * 100:.0f}). "
        "Roughness is not compared yet.",
    }
    return [row if r["id"] == "terrain" else r for r in FIDELITY_ROWS]


def terrain_stats(kind: str, id_: str) -> dict | None:
    terrain = _terrain()
    return terrain[kind].get(id_) if terrain else None


def terrain_match(target_id: str, site_id: str) -> dict:
    terrain = _terrain()
    ks = terrain["ks"][target_id].get(site_id) if terrain else None
    return {"ks": ks, "level": terrain_level(ks)}


def _clean(x):
    """Make values JSON-safe: NumPy scalars to Python, NaN to None."""
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_clean(v) for v in x]
    if isinstance(x, np.generic):
        x = x.item()
    if isinstance(x, float) and math.isnan(x):
        return None
    return x


# Weather-cell classes. MERRA-2 gives one value per cell, weighted over its surface types.
CELL_BARE_LAND_MIN = 0.5  # "representative": at least half the cell is bare land
CELL_NO_LAND_MAX = 0.05  # "not_representative": under 5% bare land and
CELL_ICE_MIN = 0.75  # at least 75% land ice
CELL_NOTES = {
    "representative": "At least half of the weather grid cell is bare land.",
    "mixed": "Less than half of the weather grid cell is bare land; the rest is land ice or ocean. "
    "Temperature and wind can differ from the bare-ground site by a few degrees.",
    "not_representative": "The weather grid cell is ice sheet with no bare land. At the two Antarctic sites "
    "checked against stations it is 7–12 °C colder in summer than the bare-ground site. Temperature, wind chill "
    "and usable days describe the ice next to the site and are too pessimistic.",
}


@lru_cache(maxsize=1)
def _cells() -> dict:
    return json.loads((CONFIG_DIR / "merra2_cells.json").read_text())["cells"]


def weather_cell(site: Site) -> dict:
    """Surface type of the site's MERRA-2 cell and how well it represents a bare-ground site."""
    c = _cells()[site.id]
    if c["land"] >= CELL_BARE_LAND_MIN:
        cls = "representative"
    elif c["land"] < CELL_NO_LAND_MAX and c["land_ice"] >= CELL_ICE_MIN:
        cls = "not_representative"
    else:
        cls = "mixed"
    return {**c, "class": cls, "note": CELL_NOTES[cls]}


def daily_usable_string(sd: SiteDays, target_id: str) -> str:
    """One hex digit per day; bit i is set when the day is usable under PRESETS[i]."""
    code = np.zeros(sd.dates.size, dtype=np.int64)
    for i, p in enumerate(PRESETS):
        code |= sd.targets[target_id].usable[p.id].astype(np.int64) << i
    return "".join("0123456789abcdef"[c] for c in code)


def sun_samples(site: Site, targets: list[Target]) -> dict:
    """Sun elevation and azimuth on the 15th of each month, with each target's band windows that day."""
    months = []
    for mo in range(1, 13):
        date = f"{SAMPLE_YEAR}-{mo:02d}-{SAMPLE_DAY:02d}"
        coarse = sun_day(site, date, SAMPLE_STEP_MIN)
        fine = sun_day(site, date, 1)
        windows = {}
        for t in targets:
            band = (fine["elevation"] >= BAND_MIN_DEG) & (fine["elevation"] <= t.band_max_deg)
            starts, ends = runs(band)
            windows[t.id] = [[int(a), int(b)] for a, b in zip(starts, ends)]
        months.append({
            "date": date,
            "elevation": [round(float(v), 1) for v in coarse["elevation"]],
            "azimuth": [round(float(v), 1) for v in coarse["azimuth"]],
            "windows": windows,
        })
    return {
        "time": "local mean solar time, minutes after local midnight (UTC + longitude / 15 h)",
        "step_min": SAMPLE_STEP_MIN,
        "months": months,
    }


def site_record(site: Site) -> dict:
    return {
        "id": site.id,
        "name": site.name,
        "region": site.region,
        "lat": site.lat,
        "lon": site.lon,
        "role": site.role,
        "known_analog": site.known_analog,
        "utc_offset_solar_h": round(site.lon / 15.0, 2),
        "weather_cell_class": weather_cell(site)["class"],
        "terrain": terrain_stats("sites", site.id),
    }


def build_site(site: Site, targets: list[Target]) -> tuple[dict, dict]:
    """Return the site file and the site's share of the index (scores and condition summary)."""
    sd = analyse_site(site, targets)
    sm = site_months(sd)
    per_target, index_part = {}, {"scores": {}, "conditions": {}}
    for t in targets:
        tm = target_months(sd, t.id)
        presets = {p.id: preset_result(sd, t.id, p, sm, tm) for p in PRESETS}
        terrain = terrain_match(t.id, site.id)
        for r in presets.values():
            for m in r["months"]:
                m["levels"]["terrain"] = terrain["level"]
        per_target[t.id] = {
            "months": tm,
            "presets": presets,
            "daily_usable": daily_usable_string(sd, t.id),
            "terrain": terrain,
        }
        index_part["scores"][t.id] = {
            pid: {
                "score": [m["score"] for m in r["months"]],
                "median": [m["odds"]["median"] for m in r["months"]],
                "p10": [m["odds"]["p10"] for m in r["months"]],
                "p90": [m["odds"]["p90"] for m in r["months"]],
                "p_at_least": [m["odds"]["p_at_least"] for m in r["months"]],
                "best_window": r["best_window"],
            }
            for pid, r in presets.items()
        }
        index_part["conditions"][t.id] = {
            "band_hours": [m["band_hours"] for m in tm],
            "window_days_share": [m["window_days_share"] for m in tm],
        }
    index_part["site_conditions"] = {
        "cloud_mean_pct": [m["cloud_mean_pct"] for m in sm],
        "snow_pct": [m["snow_pct"] for m in sm],
        "wind_chill_median_c": [m["wind_chill_median_c"] for m in sm],
        "flags": [m["flags"] for m in sm],
    }
    doc = {
        "schema_version": SCHEMA_VERSION,
        "site": site_record(site),
        "grid": {
            "merra2_cell": weather_cell(site),
            "merra2_deg": [MERRA2_DLAT, MERRA2_DLON],
            "ceres_deg": 1.0,
            "modis_window_km": 25,
        },
        "snow_note": sd.weather.snow_note,
        "period": period(sd),
        "months": sm,
        "targets": per_target,
        "sun_samples": sun_samples(site, targets),
    }
    return _clean(doc), _clean(index_part)


def period(sd: SiteDays) -> dict:
    return {
        "start": str(sd.dates[0]),
        "end": str(sd.dates[-1]),
        "days": int(sd.dates.size),
        "years": years_of(sd),
    }


def target_record(t: Target) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "body": t.body,
        "lat": t.lat,
        "lon": t.lon,
        "band_min_deg": BAND_MIN_DEG,
        "band_max_deg": t.band_max_deg,
        "sun_rate_deg_per_h": round(360.0 / LUNAR_SYNODIC_DAY_H, 3),
        "terrain": terrain_stats("targets", t.id),
    }


def terrain_meta() -> dict | None:
    """Grid, box and histogram bins of the terrain statistics, for the methods page and charts."""
    terrain = _terrain()
    if not terrain:
        return None
    keys = ("method", "grid_m", "box_km", "steep_deg", "hist_edges_deg")
    return {k: terrain[k] for k in keys}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--sites", default="", help="comma-separated site ids (default: all)")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    targets = load_targets()
    sites = load_sites()
    if args.sites:
        wanted = set(args.sites.split(","))
        sites = [s for s in sites if s.id in wanted]
    config = json.loads((CONFIG_DIR / "targets.json").read_text())

    (args.out / "sites").mkdir(parents=True, exist_ok=True)
    scores, conditions, site_conditions, record_period = {}, {}, {}, None
    for s in sites:
        doc, part = build_site(s, targets)
        (args.out / "sites" / f"{s.id}.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
        for tid, v in part["scores"].items():
            for pid, row in v.items():
                scores.setdefault(tid, {}).setdefault(pid, {})[s.id] = row
        for tid, v in part["conditions"].items():
            conditions.setdefault(tid, {})[s.id] = v
        site_conditions[s.id] = part["site_conditions"]
        record_period = doc["period"]
        log.info("%s done", s.id)

    index = {
        "schema_version": SCHEMA_VERSION,
        "generated": dt.date.today().isoformat(),
        "period": record_period,
        "campaign_days": CAMPAIGN_DAYS,
        "min_usable_days": MIN_USABLE,
        "targets": [target_record(t) for t in targets],
        "objectives": config["objectives"],
        "presets": [preset_dict(pr) for pr in PRESETS],
        "rule": rule_dict(),
        "thresholds": {
            "match_share": MATCH_SHARE,
            "partial_share": PARTIAL_SHARE,
            "snow_free_pct": SNOW_FREE_PCT,
            "snow_covered_pct": SNOW_COVERED_PCT,
            "polar_night_share": POLAR_NIGHT_SHARE,
            "extreme_cold_wind_chill_c": EXTREME_COLD_C,
            "terrain_match_ks": TERRAIN_MATCH_KS,
            "terrain_partial_ks": TERRAIN_PARTIAL_KS,
        },
        "levels": LEVELS,
        "weather_cell_classes": CELL_NOTES,
        "fidelity_rows": fidelity_rows(),
        "sources": {**SOURCES, **(_terrain() or {}).get("sources", {})},
        "terrain": terrain_meta(),
        "sites": [site_record(s) for s in sites],
        "scores": scores,
        "conditions": conditions,
        "site_conditions": site_conditions,
    }
    (args.out / "index.json").write_text(json.dumps(_clean(index), ensure_ascii=False, indent=1))
    log.info("wrote %s", args.out)


if __name__ == "__main__":
    main()
