"""Terrain slope: the slope method, the LOLA map projection, tile names, match levels and the stored results."""

import json
import math

import numpy as np
import pytest

from analog_pipeline.build import TERRAIN_FILE
from analog_pipeline.conditions import terrain_level
from analog_pipeline.fetch_terrain import (
    LOLA_OFFSET_PX,
    cop_tile_names,
    horn_slope_deg,
    ks_distance,
    lola_pixel,
    slope_stats,
    stereo_spacing_m,
)
from analog_pipeline.sites import load_sites, load_targets


def test_horn_slope_of_a_plane():
    x = np.arange(20) * 40.0
    for deg in (0.0, 5.0, 10.0, 30.0):
        z = np.tile(x * math.tan(math.radians(deg)), (20, 1))
        s = horn_slope_deg(z, 40.0)
        assert s.shape == (18, 18)
        assert np.allclose(s, deg)
        # The same plane tilted along the other axis.
        assert np.allclose(horn_slope_deg(z.T, 40.0), deg)


def test_slope_skips_pixels_next_to_the_sea():
    z = np.tile(np.arange(10) * 4.0, (10, 1))
    z[:, :3] = np.nan
    stats, valid = slope_stats(z, 40.0)
    assert valid.size == 8 * 5  # interior columns 1-8 minus those touching NaN
    assert stats["land_share"] == round(40 / 64, 3)
    assert stats["median_slope_deg"] == round(math.degrees(math.atan(0.1)), 1)


def test_ks_distance():
    a = np.linspace(0, 10, 1001)
    assert ks_distance(a, a) == 0
    assert ks_distance(a, a + 100) == 1
    assert abs(ks_distance(a, a + 5) - 0.5) < 0.01


def test_lola_projection():
    # The pole is the centre of the map.
    line, sample = lola_pixel(-90.0, 0.0)
    assert (line, sample) == (LOLA_OFFSET_PX, LOLA_OFFSET_PX)
    # Malapert lies towards 0° E, which is up the map (lower line numbers).
    line, sample = lola_pixel(-85.98, -1.67)
    assert round(line, 1) == 4552.0
    assert round(sample, 1) == 7510.7
    # 90° E is to the right.
    line, sample = lola_pixel(-85.0, 90.0)
    assert round(line, 3) == LOLA_OFFSET_PX
    assert sample > LOLA_OFFSET_PX
    assert stereo_spacing_m(-90.0) == 40.0
    assert 39.9 < stereo_spacing_m(-84.6) < 40.0


def test_copernicus_tile_names():
    assert cop_tile_names(80.9, 81.1, -75.2, -74.8) == [
        "Copernicus_DSM_COG_10_N80_00_W076_00_DEM",
        "Copernicus_DSM_COG_10_N80_00_W075_00_DEM",
        "Copernicus_DSM_COG_10_N81_00_W076_00_DEM",
        "Copernicus_DSM_COG_10_N81_00_W075_00_DEM",
    ]
    assert cop_tile_names(-77.7, -77.5, 162.4, 162.6) == ["Copernicus_DSM_COG_10_S78_00_E162_00_DEM"]


def test_terrain_levels():
    assert terrain_level(0.0) == "match"
    assert terrain_level(0.2) == "match"
    assert terrain_level(0.21) == "partial"
    assert terrain_level(0.5) == "partial"
    assert terrain_level(0.51) == "breaks_down"
    assert terrain_level(None) == "not_calculated"


@pytest.mark.skipif(not TERRAIN_FILE.exists(), reason="terrain not fetched")
def test_stored_terrain():
    t = json.loads(TERRAIN_FILE.read_text())
    targets, sites = load_targets(), load_sites()
    assert set(t["targets"]) == {x.id for x in targets}
    assert set(t["sites"]) == {s.id for s in sites}
    for x in targets:
        assert t["targets"][x.id]["land_share"] == 1.0
        assert set(t["ks"][x.id]) == {s.id for s in sites}
    for s in sites:
        st = t["sites"][s.id]
        assert 0.2 < st["land_share"] <= 1.0
        assert 0 <= st["median_slope_deg"] <= st["p90_slope_deg"]
        assert abs(sum(st["hist_share"]) - 1) < 1e-3
    # Malapert is a massif summit, Mons Mouton a flat-topped plateau.
    assert t["targets"]["mons-malapert"]["median_slope_deg"] > 2 * t["targets"]["mons-mouton"]["median_slope_deg"]
    # Roadmap validation check 2: Arizona matches on terrain while it fails on lighting.
    assert terrain_level(t["ks"]["mons-mouton"]["sf-volcanic-field"]) == "match"
