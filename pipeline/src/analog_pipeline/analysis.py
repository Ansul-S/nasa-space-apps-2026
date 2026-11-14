"""Daily analysis for one site: sun windows in each target band and the usable-day rule for each preset.

Every day is a local mean solar day (UTC + longitude / 15 h), so a window around
local midnight or local noon is never split by the UTC date line. The Sun and the
rule are evaluated at 5-minute steps; each step uses the hourly weather of the
hour that contains it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .rules import (
    BAND_MIN_DEG,
    PRECIP_MAX_MM,
    PRESETS,
    SNOW_COVERED_PCT,
    STEP_MIN,
    WIND_MAX_BARE_MS,
    WIND_MAX_SNOW_MS,
    Preset,
    longest_run_per_day,
    stretch_days,
    wind_chill,
)
from .sites import Site, Target
from .sun import solar_position
from .weather import N_HOURS, START, Weather, load_weather

STEPS_PER_HOUR = 60 // STEP_MIN
STEPS_PER_DAY = 24 * STEPS_PER_HOUR
# Local days fully covered by the UTC record for any longitude: 2016-01-02 to 2025-12-30.
FIRST_DAY = START.astype("datetime64[D]") + 1
N_DAYS = N_HOURS // 24 - 2
DATES = FIRST_DAY + np.arange(N_DAYS)


@dataclass
class TargetDays:
    band_min: np.ndarray  # minutes per day with the Sun in the band
    longest_min: np.ndarray  # longest unbroken stretch in the band, minutes
    az_rate: np.ndarray  # mean azimuth speed of the Sun while in the band, deg/h (NaN without band time)
    usable: dict[str, np.ndarray]  # preset id -> usable day


@dataclass
class SiteDays:
    site: Site
    weather: Weather
    dates: np.ndarray  # local solar dates, datetime64[D]
    sun_min: np.ndarray  # daily lowest apparent sun elevation, deg
    sun_max: np.ndarray  # daily highest apparent sun elevation, deg
    cloud: np.ndarray  # (day, step) cloud amount, %
    precip_mm: np.ndarray  # daily precipitation, mm
    snow_pct: np.ndarray  # monthly snow cover for the day's month, % (NaN when not measured)
    t2m: np.ndarray  # (day, step) air temperature, deg C
    wind: np.ndarray  # (day, step) wind speed, m/s
    wchill: np.ndarray  # (day, step) wind chill, deg C
    targets: dict[str, TargetDays]


def first_step(lon: float) -> int:
    """Index of the first 5-minute step whose midpoint falls in local day 1 (2016-01-02)."""
    day_start_min = 1440.0 - 4.0 * lon
    return int(np.ceil((day_start_min - STEP_MIN / 2) / STEP_MIN))


def daily_snow(weather: Weather, dates: np.ndarray) -> np.ndarray:
    """Snow cover for each day's month. A missing month takes the median of the same month in other years."""
    months = dates.astype("datetime64[M]")
    values = {k: v for k, v in weather.snow_pct.items() if v is not None}
    clim: dict[int, float] = {}
    for mo in range(1, 13):
        same = [v for k, v in values.items() if int(k[5:7]) == mo]
        clim[mo] = float(np.median(same)) if same else np.nan
    out = np.empty(dates.size)
    for key in np.unique(months):
        label = str(key)
        v = values.get(label, clim[int(label[5:7])])
        out[months == key] = v
    return out


def analyse_site(site: Site, targets: list[Target], presets: tuple[Preset, ...] = PRESETS,
                 weather: Weather | None = None) -> SiteDays:
    w = weather if weather is not None else load_weather(site)
    k = first_step(site.lon) + np.arange(N_DAYS * STEPS_PER_DAY)
    hour = k // STEPS_PER_HOUR
    times = START.astype("datetime64[s]") + (k * STEP_MIN * 60 + STEP_MIN * 30).astype("timedelta64[s]")
    sun = solar_position(times, site.lat, site.lon)
    elev, az = sun["apparent_elevation"], sun["azimuth"]
    shape = (N_DAYS, STEPS_PER_DAY)

    wc_hourly = wind_chill(w.t2m_c, w.wind_ms)
    t2m, wind, wchill = w.t2m_c[hour], w.wind_ms[hour], wc_hourly[hour]
    cloud, precip = w.cloud_pct[hour], w.precip_mm[hour]

    day_precip = precip.reshape(shape).sum(axis=1) / STEPS_PER_HOUR
    snow = daily_snow(w, DATES)
    # Unknown snow (NaN) fails the "< threshold" test, so the stricter snow limit applies.
    wind_max = np.where(snow < SNOW_COVERED_PCT, WIND_MAX_BARE_MS, WIND_MAX_SNOW_MS)
    base_ok = (wind <= np.repeat(wind_max, STEPS_PER_DAY)) & np.repeat(day_precip < PRECIP_MAX_MM, STEPS_PER_DAY)

    daz = np.diff(az, append=az[-1])
    rate = np.abs((daz + 180.0) % 360.0 - 180.0) * STEPS_PER_HOUR

    result: dict[str, TargetDays] = {}
    for t in targets:
        band = (elev >= BAND_MIN_DEG) & (elev <= t.band_max_deg)
        band_steps = band.reshape(shape).sum(axis=1)
        with np.errstate(invalid="ignore", divide="ignore"):
            az_rate = (rate * band).reshape(shape).sum(axis=1) / band_steps
        usable = {}
        for p in presets:
            ok = band & base_ok & (cloud <= p.cloud_max_pct) & (wchill >= p.wind_chill_min_c)
            usable[p.id] = stretch_days(ok, STEPS_PER_DAY)
        result[t.id] = TargetDays(
            band_min=band_steps * STEP_MIN,
            longest_min=longest_run_per_day(band, STEPS_PER_DAY) * STEP_MIN,
            az_rate=az_rate,
            usable=usable,
        )

    return SiteDays(
        site=site,
        weather=w,
        dates=DATES,
        sun_min=elev.reshape(shape).min(axis=1),
        sun_max=elev.reshape(shape).max(axis=1),
        cloud=cloud.reshape(shape),
        precip_mm=day_precip,
        snow_pct=snow,
        t2m=t2m.reshape(shape),
        wind=wind.reshape(shape),
        wchill=wchill.reshape(shape),
        targets=result,
    )


def sun_day(site: Site, date: str, step_min: int = 10) -> dict[str, np.ndarray]:
    """Apparent elevation and azimuth over one local mean solar day, at `step_min` steps from local midnight."""
    minutes = np.arange(0, 1440, step_min)
    offset_s = (minutes * 60 - round(site.lon * 240)).astype("timedelta64[s]")
    times = np.datetime64(date, "s") + offset_s
    sun = solar_position(times, site.lat, site.lon)
    return {"minute": minutes, "elevation": sun["apparent_elevation"], "azimuth": sun["azimuth"]}
