"""Check the NOAA sun-position engine against NREL's Solar Position Algorithm (SPA).

SPA (Reda & Andreas 2004, accuracy about 0.0003 deg) is an independent
implementation, run here through pvlib.
"""

import numpy as np
import pandas as pd
import pytest
from pvlib import solarposition

from analog_pipeline.sun import solar_position

SITES = {
    "sf-volcanic-field": (35.35, -111.50),
    "ellesmere-inland": (81.00, -75.00),
    "mcmurdo-dry-valleys": (-77.60, 162.50),
}


@pytest.fixture(scope="module")
def hourly_2024():
    return pd.date_range("2024-01-01", "2024-12-31 23:00", freq="h", tz="UTC")


@pytest.mark.parametrize("site", SITES)
def test_elevation_matches_spa(site, hourly_2024):
    lat, lon = SITES[site]
    ref = solarposition.spa_python(hourly_2024, lat, lon)
    ours = solar_position(hourly_2024.tz_convert(None).to_numpy(), lat, lon)
    diff = np.abs(ours["elevation"] - ref["elevation"].to_numpy())
    assert diff.max() < 0.02, f"max elevation difference {diff.max():.4f} deg"


@pytest.mark.parametrize("site", SITES)
def test_azimuth_matches_spa_when_sun_is_up(site, hourly_2024):
    lat, lon = SITES[site]
    ref = solarposition.spa_python(hourly_2024, lat, lon)
    ours = solar_position(hourly_2024.tz_convert(None).to_numpy(), lat, lon)
    up = ref["elevation"].to_numpy() > 0
    d = np.abs(ours["azimuth"][up] - ref["azimuth"].to_numpy()[up])
    d = np.minimum(d, 360 - d)
    assert d.max() < 0.1, f"max azimuth difference {d.max():.4f} deg"


@pytest.mark.parametrize("site", SITES)
def test_apparent_elevation_in_low_sun_band(site, hourly_2024):
    """Refraction models differ most near the horizon; inside the 0-7 deg band they agree within 0.1 deg."""
    lat, lon = SITES[site]
    ref = solarposition.spa_python(hourly_2024, lat, lon)
    ours = solar_position(hourly_2024.tz_convert(None).to_numpy(), lat, lon)
    band = (ref["apparent_elevation"].to_numpy() > 0.5) & (ref["apparent_elevation"].to_numpy() < 7.5)
    assert band.sum() > 0
    diff = np.abs(ours["apparent_elevation"][band] - ref["apparent_elevation"].to_numpy()[band])
    assert diff.max() < 0.1, f"max apparent elevation difference {diff.max():.4f} deg"
