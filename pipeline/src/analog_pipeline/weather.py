"""Load the downloaded hourly weather and monthly snow cover for one site on a common UTC time axis.

Hourly values cover the hour that starts at their timestamp: index h holds the
mean from START + h hours to START + h + 1 hours. MERRA-2 and the NASA POWER
series use this convention, and a comparison of POWER PRECTOTCORR with
MERRA-2 M2T1NXFLX for the same days aligns at zero offset.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from .sites import RAW_DIR, Site, load_sites

START = np.datetime64("2016-01-01T00", "h")
END = np.datetime64("2026-01-01T00", "h")  # exclusive
N_HOURS = int((END - START) // np.timedelta64(1, "h"))

# MOD10CM sets every Antarctic land pixel to 100% snow on purpose (file attribute
# "Antarctica deliberately mapped as snow"), so it does not measure snow there.
ANTARCTIC_LAT = -60.0
ANTARCTIC_SNOW_NOTE = "MOD10CM maps Antarctica as snow by design, so snow cover is not measured at this site."


@dataclass(frozen=True)
class Weather:
    t2m_c: np.ndarray  # 2 m air temperature, deg C
    wind_ms: np.ndarray  # 10 m wind speed, m/s
    cloud_pct: np.ndarray  # cloud amount, %
    precip_mm: np.ndarray  # precipitation in the hour, mm
    snow_pct: dict[str, float | None]  # "YYYY-MM" -> monthly snow cover %, None when not measured
    snow_note: str | None


@lru_cache(maxsize=1)
def _merra2_slv() -> dict[str, dict[str, np.ndarray]]:
    """Read every daily M2T1NXSLV file once and return per-site hourly arrays."""
    folder = RAW_DIR / "merra2" / "M2T1NXSLV"
    ids = [s.id for s in load_sites()]
    data = {k: np.full((len(ids), N_HOURS), np.nan) for k in ("T2M", "U10M", "V10M")}
    days = np.arange(START.astype("datetime64[D]"), END.astype("datetime64[D]"))
    for i, day in enumerate(days):
        path = folder / f"{str(day).replace('-', '')}.npz"
        if not path.exists():
            continue
        with np.load(path) as z:
            file_ids = list(z["sites"])
            order = [file_ids.index(sid) for sid in ids]
            for k, arr in data.items():
                arr[:, i * 24 : (i + 1) * 24] = z[k][order]
    return {
        sid: {
            "t2m_c": data["T2M"][n] - 273.15,
            "wind_ms": np.hypot(data["U10M"][n], data["V10M"][n]),
        }
        for n, sid in enumerate(ids)
    }


def _power(parameter: str, site_id: str) -> np.ndarray:
    raw = json.loads((RAW_DIR / "power" / parameter / f"{site_id}.json").read_text())
    series: dict[str, float] = raw[parameter]
    stamps = np.array([f"{k[:4]}-{k[4:6]}-{k[6:8]}T{k[8:10]}" for k in series], dtype="datetime64[h]")
    idx = ((stamps - START) // np.timedelta64(1, "h")).astype(np.int64)
    values = np.array(list(series.values()), dtype=np.float64)
    fill = raw.get("fill_value")
    if fill is not None:
        values[values == fill] = np.nan
    out = np.full(N_HOURS, np.nan)
    keep = (idx >= 0) & (idx < N_HOURS)
    out[idx[keep]] = values[keep]
    return out


@lru_cache(maxsize=1)
def _modis_snow() -> dict[str, dict[str, dict]]:
    return json.loads((RAW_DIR / "modis" / "MOD10CM_sites.json").read_text())["sites"]


def load_weather(site: Site) -> Weather:
    slv = _merra2_slv()[site.id]
    if site.lat < ANTARCTIC_LAT:
        snow: dict[str, float | None] = {}
        note: str | None = ANTARCTIC_SNOW_NOTE
    else:
        snow = {month: v["snow_pct"] for month, v in _modis_snow()[site.id].items()}
        note = None
    return Weather(
        t2m_c=slv["t2m_c"],
        wind_ms=slv["wind_ms"],
        cloud_pct=_power("CLOUD_AMT", site.id),
        precip_mm=_power("PRECTOTCORR", site.id),
        snow_pct=snow,
        snow_note=note,
    )
