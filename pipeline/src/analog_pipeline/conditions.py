"""Monthly conditions, scores and match levels for the seasonal calendar and the fidelity card.

Match levels for conditions measured as a share of days or hours:
- match: the condition holds on at least 80% of them
- partial: 20% to 80%
- breaks_down: under 20%
Snow-covered ground counts as breaks_down for a lunar target, because snow hides
the terrain and is far brighter than lunar regolith.

Terrain compares the slope distributions of the target and the site
(Kolmogorov-Smirnov distance, see fetch_terrain):
- match: they differ by at most 0.2 (20 percentage points) at any slope
- partial: up to 0.5
- breaks_down: more than 0.5
"""

from __future__ import annotations

import numpy as np

from .analysis import SiteDays
from .odds import best_window, month_and_year, monthly_odds
from .rules import PRECIP_MAX_MM, PRESETS, SNOW_COVERED_PCT, WINDOW_MIN_H, Preset

MATCH_SHARE = 0.8
PARTIAL_SHARE = 0.2
SNOW_FREE_PCT = 10.0
CLOUD_LIMITS = sorted({p.cloud_max_pct for p in PRESETS})
WIND_CHILL_LIMITS = sorted({p.wind_chill_min_c for p in PRESETS})
POLAR_NIGHT_SHARE = 0.5
EXTREME_COLD_C = -40.0
TERRAIN_MATCH_KS = 0.2
TERRAIN_PARTIAL_KS = 0.5
MONTHS = range(1, 13)


def _r(x, nd: int = 2):
    if x is None:
        return None
    x = float(x)
    return None if np.isnan(x) else round(x, nd)


def terrain_level(ks: float | None) -> str:
    if ks is None or np.isnan(ks):
        return "not_calculated"
    if ks <= TERRAIN_MATCH_KS:
        return "match"
    if ks <= TERRAIN_PARTIAL_KS:
        return "partial"
    return "breaks_down"


def level_from_share(share: float | None) -> str:
    if share is None or np.isnan(share):
        return "not_calculated"
    if share >= MATCH_SHARE:
        return "match"
    if share >= PARTIAL_SHARE:
        return "partial"
    return "breaks_down"


def snow_class(pct: float | None) -> str | None:
    if pct is None or np.isnan(pct):
        return None
    if pct < SNOW_FREE_PCT:
        return "snow_free"
    if pct < SNOW_COVERED_PCT:
        return "patchy"
    return "snow_covered"


GROUND_LEVEL = {"snow_free": "match", "patchy": "partial", "snow_covered": "breaks_down", None: "not_calculated"}


def years_of(sd: SiteDays) -> list[int]:
    _, year = month_and_year(sd.dates)
    return sorted({int(y) for y in year})


def site_months(sd: SiteDays) -> list[dict]:
    """Target-independent conditions for each calendar month."""
    month, _ = month_and_year(sd.dates)
    years = years_of(sd)
    out = []
    for mo in MONTHS:
        d = month == mo
        wc = sd.wchill[d].ravel()
        snow_years = [sd.weather.snow_pct.get(f"{y}-{mo:02d}") for y in years]
        measured = [v for v in snow_years if v is not None]
        snow_median = float(np.median(measured)) if measured else None
        polar_night = float((sd.sun_max[d] < 0).mean())
        wc_median = float(np.nanmedian(wc))
        flags = []
        if polar_night >= POLAR_NIGHT_SHARE:
            flags.append("polar_night")
        if wc_median < EXTREME_COLD_C:
            flags.append("extreme_cold")
        out.append({
            "month": mo,
            "sun_min_deg": _r(sd.sun_min[d].mean(), 1),
            "sun_max_deg": _r(sd.sun_max[d].mean(), 1),
            "polar_night_share": _r(polar_night, 3),
            "cloud_mean_pct": _r(np.nanmean(sd.cloud[d]), 1),
            "clear_hours_share": {f"{c:g}": _r((sd.cloud[d] <= c).mean(), 3) for c in CLOUD_LIMITS},
            "dry_days_share": _r((sd.precip_mm[d] < PRECIP_MAX_MM).mean(), 3),
            "t2m_mean_c": _r(np.nanmean(sd.t2m[d]), 1),
            "wind_mean_ms": _r(np.nanmean(sd.wind[d]), 1),
            "wind_chill_median_c": _r(wc_median, 1),
            "wind_chill_p10_c": _r(np.nanpercentile(wc, 10), 1),
            "wind_chill_ok_share": {f"{c:g}": _r((wc >= c).mean(), 3) for c in WIND_CHILL_LIMITS},
            "snow_pct": _r(snow_median, 1),
            "snow_class": snow_class(snow_median),
            "snow_years": [_r(v, 1) for v in snow_years],
            "flags": flags,
        })
    return out


def target_months(sd: SiteDays, target_id: str) -> list[dict]:
    """Sun-band conditions for one target in each calendar month."""
    td = sd.targets[target_id]
    month, _ = month_and_year(sd.dates)
    out = []
    for mo in MONTHS:
        d = month == mo
        window_share = float((td.longest_min[d] >= WINDOW_MIN_H * 60).mean())
        rates = td.az_rate[d]
        out.append({
            "month": mo,
            "band_hours": _r(td.band_min[d].mean() / 60, 2),
            "longest_window_hours": _r(td.longest_min[d].mean() / 60, 2),
            "window_days_share": _r(window_share, 3),
            "sun_rate_deg_per_h": _r(np.nanmean(rates), 1) if np.isfinite(rates).any() else None,
            "level": level_from_share(window_share),
        })
    return out


def preset_result(sd: SiteDays, target_id: str, preset: Preset, sites_m: list[dict], target_m: list[dict]) -> dict:
    """Usable days, campaign odds, score and fidelity levels for one target and preset."""
    usable = sd.targets[target_id].usable[preset.id]
    month, _ = month_and_year(sd.dates)
    odds = monthly_odds(sd.dates, usable, years_of(sd))
    months = []
    for i, mo in enumerate(MONTHS):
        share = float(usable[month == mo].mean())
        s, t = sites_m[i], target_m[i]
        months.append({
            "month": mo,
            "usable_share": _r(share, 3),
            "score": _r(share, 3),
            "odds": odds[i],
            "levels": {
                "sun_band": t["level"],
                "clear_sky": level_from_share(s["clear_hours_share"][f"{preset.cloud_max_pct:g}"]),
                "ground": GROUND_LEVEL[s["snow_class"]],
                "wind_chill": level_from_share(s["wind_chill_ok_share"][f"{preset.wind_chill_min_c:g}"]),
                "sun_motion": "breaks_down",
                "sky_light": "breaks_down",
            },
        })
    return {"months": months, "best_window": best_window(sd.dates, usable)}
