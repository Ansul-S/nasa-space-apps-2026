"""Unit tests for wind chill, run detection and the usable-day rule on synthetic weather."""

import numpy as np
import pytest

from analog_pipeline.analysis import N_DAYS, STEPS_PER_DAY, analyse_site
from analog_pipeline.odds import month_and_year
from analog_pipeline.rules import PRESETS, Preset, longest_run_per_day, stretch_days, wind_chill
from analog_pipeline.sites import load_sites, load_targets
from analog_pipeline.weather import N_HOURS, Weather

SITES = {s.id: s for s in load_sites()}
TARGET = load_targets()[0]


def f_to_c(f):
    return (f - 32.0) * 5.0 / 9.0


def c_to_f(c):
    return c * 9.0 / 5.0 + 32.0


@pytest.mark.parametrize(
    "t_f, wind_mph, chart_f",
    [(10, 10, -4), (0, 15, -19), (-20, 30, -53), (-10, 5, -22)],
)
def test_wind_chill_matches_nws_chart(t_f, wind_mph, chart_f):
    """Values from the US National Weather Service wind chill chart, which is rounded to whole deg F."""
    wc = wind_chill(f_to_c(t_f), wind_mph * 0.44704)
    assert abs(c_to_f(float(wc)) - chart_f) <= 0.6


def test_wind_chill_outside_formula_range_is_air_temperature():
    assert float(wind_chill(15.0, 10.0)) == 15.0  # warmer than 10 deg C
    assert float(wind_chill(-20.0, 1.0)) == -20.0  # under 4.8 km/h


def test_stretch_needs_two_unbroken_hours():
    day = 288
    ok = np.zeros(3 * day, dtype=bool)
    ok[10:33] = True  # 23 steps = 115 min, too short
    ok[day + 100 : day + 124] = True  # 24 steps = 120 min
    assert stretch_days(ok, day).tolist() == [False, True, False]


def test_stretch_belongs_to_the_day_of_its_midpoint():
    day = 288
    ok = np.zeros(3 * day, dtype=bool)
    ok[day - 10 : day + 30] = True  # crosses midnight, midpoint after it
    assert stretch_days(ok, day).tolist() == [False, True, False]
    assert longest_run_per_day(ok, day).tolist() == [0, 40, 0]


def synthetic_weather(t=-5.0, wind=2.0, cloud=0.0, precip=0.0, snow=0.0):
    snow_pct = {f"{y}-{m:02d}": snow for y in range(2016, 2026) for m in range(1, 13)}

    def full(v):
        return np.full(N_HOURS, float(v))

    return Weather(full(t), full(wind), full(cloud), full(precip), snow_pct, None)


def april_usable(site_id, preset=PRESETS[0], **weather):
    sd = analyse_site(SITES[site_id], [TARGET], (preset,), synthetic_weather(**weather))
    month, _ = month_and_year(sd.dates)
    return sd.targets[TARGET.id].usable[preset.id][month == 4].mean()


def test_perfect_weather_gives_usable_april_days_in_the_high_arctic():
    assert april_usable("ellesmere-inland") == 1.0


def test_arizona_never_qualifies_even_in_perfect_weather():
    sd = analyse_site(SITES["sf-volcanic-field"], [TARGET], PRESETS[:1], synthetic_weather())
    assert not sd.targets[TARGET.id].usable[PRESETS[0].id].any()
    assert sd.targets[TARGET.id].longest_min.max() < 60


@pytest.mark.parametrize(
    "weather, expected",
    [
        ({"cloud": 31.0}, 0.0),  # above the strict 30% limit
        ({"cloud": 30.0}, 1.0),
        ({"wind": 9.0, "snow": 100.0}, 0.0),  # over snow the limit is 7.7 m/s
        ({"wind": 9.0, "snow": 0.0}, 1.0),  # over bare ground the limit is 10 m/s
        ({"wind": 9.0, "snow": None}, 0.0),  # unknown snow takes the stricter limit
        ({"precip": 0.05}, 0.0),  # 1.2 mm per day
        ({"precip": 0.04}, 1.0),  # 0.96 mm per day
        ({"t": -30.0}, 0.0),  # wind chill about -37 deg C, below -28
    ],
)
def test_each_limit_of_the_rule(weather, expected):
    assert april_usable("ellesmere-inland", **weather) == expected


def test_cold_limit_follows_the_preset():
    relaxed_cold = Preset("test-40", "test", 30.0, -40.0)
    assert april_usable("ellesmere-inland", relaxed_cold, t=-30.0) == 1.0


def test_day_grid_shape():
    sd = analyse_site(SITES["svalbard"], [TARGET], PRESETS[:1], synthetic_weather())
    assert sd.dates.size == N_DAYS
    assert sd.wchill.shape == (N_DAYS, STEPS_PER_DAY)
    assert str(sd.dates[0]) == "2016-01-02" and str(sd.dates[-1]) == "2025-12-30"
