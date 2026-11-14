"""Unit tests for campaign odds."""

import numpy as np

from analog_pipeline.odds import best_window, campaign_counts, monthly_odds, summary

DATES = np.arange(np.datetime64("2016-01-02"), np.datetime64("2025-12-31"))


def test_campaign_counts_are_a_rolling_sum():
    usable = np.array([1, 0, 1, 1, 0, 0, 1], dtype=bool)
    assert campaign_counts(usable, 3).tolist() == [2, 2, 2, 1, 1]


def test_summary_statistics():
    s = summary(np.array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    assert s["median"] == 4.5
    assert s["p_at_least"] == 0.7
    assert s["p10"] == 0.9 and s["p90"] == 8.1
    assert s["n"] == 10


def test_monthly_odds_and_per_year_values():
    month = DATES.astype("datetime64[M]").astype(int) % 12 + 1
    year = DATES.astype("datetime64[Y]").astype(int) + 1970
    usable = (month == 4) & (year == 2020)  # only April 2020 is usable
    odds = monthly_odds(DATES, usable, list(range(2016, 2026)))
    april = odds[3]
    assert april["years"][4] == 14.0  # campaigns that start in early April 2020 are fully usable
    assert all(v == 0.0 for i, v in enumerate(april["years"]) if i != 4)
    assert odds[6]["mean"] == 0.0  # July


def test_best_window_finds_the_usable_season():
    doy = (DATES - DATES.astype("datetime64[Y]")).astype(int)
    usable = (doy >= 99) & (doy < 113)  # about 9-22 April every year
    bw = best_window(DATES, usable)
    assert bw["start"] in {"04-08", "04-09", "04-10"}
    assert bw["median"] >= 12


def test_best_window_is_none_without_usable_days():
    assert best_window(DATES, np.zeros(DATES.size, dtype=bool)) is None


def test_held_out_mean_is_lower_for_noise():
    """With random usable days the best window is luck, so the held-out mean falls back to the average."""
    rng = np.random.default_rng(1)
    usable = rng.random(DATES.size) < 0.2
    bw = best_window(DATES, usable)
    assert bw["held_out_mean"] < bw["mean"]
    assert abs(bw["held_out_mean"] - 0.2 * 14) < 0.6


def test_held_out_mean_keeps_a_real_season():
    doy = (DATES - DATES.astype("datetime64[Y]")).astype(int)
    bw = best_window(DATES, (doy >= 99) & (doy < 113))
    assert bw["held_out_mean"] >= 12
