"""Load the frozen lunar targets and Earth sites from the config folder."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parents[2]
CONFIG_DIR = PIPELINE_DIR / "config"
RAW_DIR = PIPELINE_DIR / "data" / "raw"


@dataclass(frozen=True)
class Site:
    id: str
    name: str
    region: str
    lat: float
    lon: float
    role: str
    known_analog: bool


@dataclass(frozen=True)
class Target:
    id: str
    name: str
    body: str
    lat: float
    lon: float
    band_max_deg: float


def load_sites() -> list[Site]:
    data = json.loads((CONFIG_DIR / "sites.json").read_text())
    return [Site(**s) for s in data["sites"]]


def load_targets() -> list[Target]:
    data = json.loads((CONFIG_DIR / "targets.json").read_text())
    return [
        Target(**{k: t[k] for k in ("id", "name", "body", "lat", "lon", "band_max_deg")})
        for t in data["targets"]
    ]
