"""Validation checks from the roadmap, run on the downloaded data, and the shape of the JSON contract.

These tests need the raw data in pipeline/data/raw and are skipped without it.
"""

import json

import pytest

from analog_pipeline.build import SAMPLE_STEP_MIN, build_site
from analog_pipeline.rules import PRESETS
from analog_pipeline.sites import RAW_DIR, load_sites, load_targets

pytestmark = pytest.mark.skipif(
    not (RAW_DIR / "merra2" / "M2T1NXSLV").exists() or not (RAW_DIR / "power").exists(),
    reason="raw data not downloaded",
)

SITES = {s.id: s for s in load_sites()}
TARGETS = load_targets()
TARGET_IDS = [t.id for t in TARGETS]
PRESET_IDS = [p.id for p in PRESETS]
COLD_DEFAULT = [p.id for p in PRESETS if p.wind_chill_min_c == -28.0]


@pytest.fixture(scope="module")
def built():
    cache = {}

    def get(site_id):
        if site_id not in cache:
            cache[site_id] = build_site(SITES[site_id], TARGETS)
        return cache[site_id]

    return get


def months(doc, target, preset):
    return doc["targets"][target]["presets"][preset]["months"]


def test_arizona_has_no_usable_days_in_any_month(built):
    doc, _ = built("sf-volcanic-field")
    for t in TARGET_IDS:
        for p in PRESET_IDS:
            assert all(m["usable_share"] == 0 for m in months(doc, t, p)), (t, p)
            assert doc["targets"][t]["presets"][p]["best_window"] is None


def test_svalbard_august_has_no_usable_days_under_any_preset(built):
    doc, _ = built("svalbard")
    for t in TARGET_IDS:
        for p in PRESET_IDS:
            assert months(doc, t, p)[7]["odds"]["median"] == 0, (t, p)


@pytest.mark.parametrize("preset", COLD_DEFAULT)
def test_ellesmere_april_beats_march_at_minus_28(built, preset):
    doc, _ = built("ellesmere-inland")
    for t in TARGET_IDS:
        m = months(doc, t, preset)
        assert m[3]["odds"]["mean"] > m[2]["odds"]["mean"], t
        assert m[3]["usable_share"] > m[2]["usable_share"], t


def test_ellesmere_april_sun_window_crosses_local_midnight(built):
    doc, _ = built("ellesmere-inland")
    april = doc["sun_samples"]["months"][3]
    windows = april["windows"]["mons-mouton"]
    assert windows[0][0] == 0 and windows[-1][1] == 1440  # one window split at local midnight
    assert len(april["elevation"]) == 1440 // SAMPLE_STEP_MIN


def test_site_file_contract(built):
    doc, part = built("ellesmere-inland")
    json.dumps(doc, allow_nan=False)
    json.dumps(part, allow_nan=False)
    assert len(doc["months"]) == 12
    assert doc["period"]["days"] == len(doc["targets"]["mons-mouton"]["daily_usable"])
    for t in TARGET_IDS:
        target = doc["targets"][t]
        assert len(target["months"]) == 12
        assert set(target["presets"]) == set(PRESET_IDS)
        for p in PRESET_IDS:
            ms = target["presets"][p]["months"]
            assert len(ms) == 12
            assert all(len(m["odds"]["years"]) == len(doc["period"]["years"]) for m in ms)
            assert set(ms[0]["levels"]) >= {"sun_band", "clear_sky", "ground", "wind_chill"}
        assert set(part["scores"][t]) == set(PRESET_IDS)


def test_daily_usable_string_matches_monthly_shares(built):
    doc, _ = built("ellesmere-inland")
    t = "mons-mouton"
    daily = doc["targets"][t]["daily_usable"]
    usable_days = {p: sum((int(c, 16) >> i) & 1 for c in daily) for i, p in enumerate(PRESET_IDS)}
    assert usable_days["relaxed-40"] >= usable_days["strict-28"]
    assert usable_days["relaxed-28"] >= usable_days["strict-28"]
    assert usable_days["strict-40"] >= usable_days["strict-28"]
    assert usable_days["strict-28"] > 0


def test_antarctic_snow_is_not_measured(built):
    doc, _ = built("mcmurdo-dry-valleys")
    assert doc["snow_note"]
    assert all(m["snow_pct"] is None for m in doc["months"])
    assert all(m["levels"]["ground"] == "not_calculated" for m in months(doc, "mons-mouton", "strict-28"))


@pytest.mark.parametrize(
    "site_id, expected",
    [
        ("sf-volcanic-field", "representative"),
        ("devon-island", "representative"),
        ("ellesmere-inland", "mixed"),
        ("mcmurdo-dry-valleys", "not_representative"),
        ("schirmacher-oasis", "not_representative"),
    ],
)
def test_weather_cell_class(built, site_id, expected):
    doc, _ = built(site_id)
    cell = doc["grid"]["merra2_cell"]
    assert cell["class"] == expected
    assert doc["site"]["weather_cell_class"] == expected
    assert abs(cell["land"] + cell["land_ice"] + cell["ocean"] + cell["lake"] - 1.0) < 0.03


def test_best_window_has_a_held_out_mean(built):
    doc, _ = built("ellesmere-inland")
    bw = doc["targets"]["mons-mouton"]["presets"]["relaxed-28"]["best_window"]
    assert 0 < bw["held_out_mean"] <= bw["mean"] + 0.5
