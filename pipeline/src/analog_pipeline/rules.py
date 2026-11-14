"""The usable-day rule: limits, the four presets and wind chill.

A day is usable when the Sun stays in the target's elevation band for one
unbroken stretch of at least 2 hours, and every limit below holds during that
stretch. The limits and their basis are set out in
Research/6_Problem_and_Solution/05_Additional_Features.md, section 5.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np

STEP_MIN = 5  # time step of the sun and window calculation, minutes
WINDOW_MIN_H = 2.0  # shortest unbroken usable stretch, hours
WIND_MAX_SNOW_MS = 7.7  # blowing dry snow starts at 7.7 m/s on average (Li & Pomeroy 1997)
WIND_MAX_BARE_MS = 10.0
PRECIP_MAX_MM = 1.0  # a day is dry below 1 mm (ETCCDI)
SNOW_COVERED_PCT = 50.0  # monthly MODIS snow cover at or above this counts as "over snow"
BAND_MIN_DEG = 0.0  # lower edge of the sun band (apparent elevation, flat horizon)

WINDOW_MIN_STEPS = int(WINDOW_MIN_H * 60 / STEP_MIN)


@dataclass(frozen=True)
class Preset:
    id: str
    label: str
    cloud_max_pct: float
    wind_chill_min_c: float
    default: bool = False
    warning: str | None = None


FROSTBITE_WARNING = (
    "Very high frostbite risk: Environment Canada warns that exposed skin can freeze "
    "in 5–10 minutes at a wind chill of −40 °C."
)

PRESETS: tuple[Preset, ...] = (
    Preset("strict-28", "Cloud ≤30%, wind chill ≥ −28 °C", 30.0, -28.0, default=True),
    Preset("relaxed-28", "Cloud ≤50%, wind chill ≥ −28 °C", 50.0, -28.0),
    Preset("strict-40", "Cloud ≤30%, wind chill ≥ −40 °C", 30.0, -40.0, warning=FROSTBITE_WARNING),
    Preset("relaxed-40", "Cloud ≤50%, wind chill ≥ −40 °C", 50.0, -40.0, warning=FROSTBITE_WARNING),
)


def preset_dict(p: Preset) -> dict:
    return asdict(p)


def rule_dict() -> dict:
    return {
        "step_min": STEP_MIN,
        "window_min_h": WINDOW_MIN_H,
        "band_min_deg": BAND_MIN_DEG,
        "band_max": "target band_max_deg = (90 - |target latitude|) + 1.5",
        "sun_elevation": "apparent (with refraction), flat horizon",
        "wind_max_snow_ms": WIND_MAX_SNOW_MS,
        "wind_max_bare_ms": WIND_MAX_BARE_MS,
        "snow_covered_pct": SNOW_COVERED_PCT,
        "snow_unknown": "treated as snow-covered, so the stricter wind limit applies",
        "precip_max_mm_per_day": PRECIP_MAX_MM,
        "day": "local mean solar day (UTC + longitude / 15 h); a stretch belongs to the day that holds its midpoint",
        "wind_chill": "Environment Canada / US NWS formula, 2 m air temperature and 10 m wind",
    }


def wind_chill(t_c, wind_ms):
    """Wind chill (deg C) after Environment Canada and the US National Weather Service.

    The formula applies at 10 deg C or colder and at 4.8 km/h of wind or more.
    Outside that range the air temperature is returned.
    """
    t = np.asarray(t_c, dtype=np.float64)
    v = np.asarray(wind_ms, dtype=np.float64) * 3.6
    p = np.power(np.maximum(v, 0.0), 0.16)
    wc = 13.12 + 0.6215 * t - 11.37 * p + 0.3965 * t * p
    return np.where((t <= 10.0) & (v >= 4.8), wc, t)


def runs(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Start and end (exclusive) indices of each run of True values in a 1-D mask."""
    m = np.concatenate(([0], np.asarray(mask, dtype=np.int8), [0]))
    d = np.diff(m)
    return np.flatnonzero(d == 1), np.flatnonzero(d == -1)


def stretch_days(ok: np.ndarray, steps_per_day: int, min_steps: int = WINDOW_MIN_STEPS) -> np.ndarray:
    """Mark the days that hold the midpoint of at least one run of `ok` that is `min_steps` long or longer.

    `ok` is a flat mask of consecutive days, `steps_per_day` samples each.
    """
    n_days = ok.size // steps_per_day
    starts, ends = runs(ok)
    long = (ends - starts) >= min_steps
    mid_day = ((starts[long] + ends[long] - 1) // 2) // steps_per_day
    out = np.zeros(n_days, dtype=bool)
    out[mid_day[mid_day < n_days]] = True
    return out


def longest_run_per_day(mask: np.ndarray, steps_per_day: int) -> np.ndarray:
    """Length (in steps) of the longest run of True per day; a run belongs to the day of its midpoint."""
    n_days = mask.size // steps_per_day
    starts, ends = runs(mask)
    mid_day = ((starts + ends - 1) // 2) // steps_per_day
    out = np.zeros(n_days, dtype=np.int64)
    keep = mid_day < n_days
    np.maximum.at(out, mid_day[keep], (ends - starts)[keep])
    return out
