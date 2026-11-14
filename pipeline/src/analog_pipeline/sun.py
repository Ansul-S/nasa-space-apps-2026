"""Sun position on Earth with the NOAA solar calculator algorithm (after Meeus).

All functions are vectorised with NumPy. Times are UTC as numpy datetime64.
Accuracy of the geometric elevation is about 0.01 deg for current dates, and
apparent elevation adds NOAA's refraction approximation, which is what a test
team on the ground sees.

Reference: NOAA Global Monitoring Laboratory, Solar Calculation Details,
https://gml.noaa.gov/grad/solcalc/calcdetails.html
"""

from __future__ import annotations

import numpy as np

_UNIX_EPOCH_JD = 2440587.5


def _julian_century(times: np.ndarray) -> np.ndarray:
    seconds = (times.astype("datetime64[s]") - np.datetime64("1970-01-01T00:00:00", "s")).astype(np.float64)
    jd = seconds / 86400.0 + _UNIX_EPOCH_JD
    return (jd - 2451545.0) / 36525.0


def _declination_and_eot(jc: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return solar declination (rad) and equation of time (minutes)."""
    l0 = np.mod(280.46646 + jc * (36000.76983 + jc * 0.0003032), 360.0)
    m = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
    e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
    m_r = np.radians(m)
    c = (
        np.sin(m_r) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
        + np.sin(2 * m_r) * (0.019993 - 0.000101 * jc)
        + np.sin(3 * m_r) * 0.000289
    )
    omega = np.radians(125.04 - 1934.136 * jc)
    app_long = l0 + c - 0.00569 - 0.00478 * np.sin(omega)
    seconds = 21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))
    obliq = 23.0 + (26.0 + seconds / 60.0) / 60.0 + 0.00256 * np.cos(omega)
    obliq_r = np.radians(obliq)
    decl = np.arcsin(np.sin(obliq_r) * np.sin(np.radians(app_long)))
    y = np.tan(obliq_r / 2.0) ** 2
    l0_r = np.radians(l0)
    eot = 4.0 * np.degrees(
        y * np.sin(2 * l0_r)
        - 2 * e * np.sin(m_r)
        + 4 * e * y * np.sin(m_r) * np.cos(2 * l0_r)
        - 0.5 * y * y * np.sin(4 * l0_r)
        - 1.25 * e * e * np.sin(2 * m_r)
    )
    return decl, eot


def refraction(elevation_deg: np.ndarray) -> np.ndarray:
    """NOAA's approximate atmospheric refraction correction in degrees."""
    e = np.asarray(elevation_deg, dtype=np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        t = np.tan(np.radians(e))
        high = (58.1 / t - 0.07 / t**3 + 0.000086 / t**5) / 3600.0
        near = (1735.0 + e * (-518.2 + e * (103.4 + e * (-12.79 + e * 0.711)))) / 3600.0
        below = (-20.772 / t) / 3600.0
    return np.where(e > 85.0, 0.0, np.where(e > 5.0, high, np.where(e > -0.575, near, below)))


def solar_position(times, lat_deg: float, lon_deg: float) -> dict[str, np.ndarray]:
    """Return geometric elevation, apparent elevation and azimuth (degrees, azimuth clockwise from north)."""
    times = np.asarray(times, dtype="datetime64[s]")
    jc = _julian_century(times)
    decl, eot = _declination_and_eot(jc)
    minutes = (times - times.astype("datetime64[D]")).astype(np.float64) / 60.0
    true_solar = np.mod(minutes + eot + 4.0 * lon_deg, 1440.0)
    hour_angle = np.radians(true_solar / 4.0 - 180.0)
    lat = np.radians(lat_deg)
    cos_zen = np.clip(np.sin(lat) * np.sin(decl) + np.cos(lat) * np.cos(decl) * np.cos(hour_angle), -1.0, 1.0)
    zen = np.arccos(cos_zen)
    elevation = 90.0 - np.degrees(zen)
    with np.errstate(divide="ignore", invalid="ignore"):
        cos_az = (np.sin(lat) * np.cos(zen) - np.sin(decl)) / (np.cos(lat) * np.sin(zen))
    az0 = np.degrees(np.arccos(np.clip(cos_az, -1.0, 1.0)))
    azimuth = np.where(hour_angle > 0, np.mod(az0 + 180.0, 360.0), np.mod(540.0 - az0, 360.0))
    return {
        "elevation": elevation,
        "apparent_elevation": elevation + refraction(elevation),
        "azimuth": azimuth,
    }
