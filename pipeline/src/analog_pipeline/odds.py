"""Campaign odds: usable days in every N-day campaign over the record.

Each day of the record starts one campaign. The counts are grouped by the month
in which the campaign starts. Consecutive days are not assumed to be
independent; the spread comes from the record itself, as in weather window
analysis for offshore operations.
"""

from __future__ import annotations

import numpy as np

CAMPAIGN_DAYS = 14
MIN_USABLE = 3  # "chance of at least 3 usable days"
BEST_SMOOTH_DAYS = 7  # running mean over start days when looking for the best window

_MONTH_START = np.cumsum([0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30])


def campaign_counts(usable: np.ndarray, n: int = CAMPAIGN_DAYS) -> np.ndarray:
    """Usable days in the campaign that starts on each day; the last n - 1 days start no full campaign."""
    c = np.concatenate(([0], np.cumsum(np.asarray(usable, dtype=np.int64))))
    return c[n:] - c[:-n]


def summary(counts: np.ndarray, at_least: int = MIN_USABLE) -> dict | None:
    if counts.size == 0:
        return None
    p10, p50, p90 = np.percentile(counts, [10, 50, 90])
    return {
        "mean": round(float(counts.mean()), 2),
        "median": round(float(p50), 1),
        "p10": round(float(p10), 1),
        "p90": round(float(p90), 1),
        "p_at_least": round(float((counts >= at_least).mean()), 3),
        "n": int(counts.size),
    }


def month_and_year(dates: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    m = dates.astype("datetime64[M]").astype(np.int64)
    return m % 12 + 1, m // 12 + 1970


def monthly_odds(dates: np.ndarray, usable: np.ndarray, years: list[int], n: int = CAMPAIGN_DAYS) -> list[dict]:
    """Odds for campaigns that start in each calendar month, with the median for each year."""
    counts = campaign_counts(usable, n)
    month, year = month_and_year(dates[: counts.size])
    out = []
    for mo in range(1, 13):
        sel = month == mo
        s = summary(counts[sel])
        per_year = []
        for y in years:
            c = counts[sel & (year == y)]
            per_year.append(round(float(np.median(c)), 1) if c.size else None)
        out.append({**s, "years": per_year})
    return out


def _doy(dates: np.ndarray) -> np.ndarray:
    """Day of a 365-day year (0-364); 29 February counts as 28 February."""
    month, _ = month_and_year(dates)
    day = (dates - dates.astype("datetime64[M]")).astype(np.int64) + 1
    day = np.where((month == 2) & (day == 29), 28, day)
    return _MONTH_START[month - 1] + day - 1


def _label(doy: int) -> str:
    d = np.datetime64("2001-01-01") + int(doy % 365)
    return str(d)[5:]


def _best_start(doy: np.ndarray, counts: np.ndarray) -> tuple[int, float]:
    """Start day of year with the highest mean count after a running mean, and that mean."""
    total = np.bincount(doy, weights=counts, minlength=365)
    num = np.bincount(doy, minlength=365)
    mean = np.where(num > 0, total / np.maximum(num, 1), 0.0)
    half = BEST_SMOOTH_DAYS // 2
    padded = np.concatenate((mean[-half:], mean, mean[:half]))
    smooth = np.convolve(padded, np.ones(BEST_SMOOTH_DAYS) / BEST_SMOOTH_DAYS, mode="valid")
    best = int(np.argmax(smooth))
    return best, float(smooth[best])


def _near(doy: np.ndarray, best: int) -> np.ndarray:
    dist = np.abs(doy - best)
    return np.minimum(dist, 365 - dist) <= BEST_SMOOTH_DAYS // 2


def best_window(dates: np.ndarray, usable: np.ndarray, n: int = CAMPAIGN_DAYS) -> dict | None:
    """The calendar start day with the most usable days on average, smoothed over a week of start days.

    Choosing the best of 365 start days makes its own mean too high. `held_out_mean`
    corrects for that: the window is chosen without one year and scored on that
    year, for each year in turn, and the scores are averaged.
    Returns None when no campaign in the record has a usable day.
    """
    counts = campaign_counts(usable, n)
    doy = _doy(dates[: counts.size])
    _, year = month_and_year(dates[: counts.size])
    best, top = _best_start(doy, counts)
    if top <= 0:
        return None
    held_out = []
    for y in np.unique(year):
        train = year != y
        b, _ = _best_start(doy[train], counts[train])
        test = _near(doy, b) & ~train
        if test.any():
            held_out.append(counts[test].mean())
    return {
        "start": _label(best),
        "end": _label(best + n - 1),
        **summary(counts[_near(doy, best)]),
        "held_out_mean": round(float(np.mean(held_out)), 2) if held_out else None,
    }
