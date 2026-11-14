/**
 * Sun position on the Moon from the astronomy-engine ephemeris.
 *
 * The Sun's direction is taken from the Moon's centre and rotated into the
 * Moon's body-fixed frame with the IAU (WGCCRE) rotation model: the pole
 * direction and prime-meridian angle from `RotationAxis`. That frame matches
 * the mean-Earth/polar-axis frame of the LOLA and LROC maps to well under a
 * kilometre. Longitudes are east-positive, from −180° to 180°. There is no
 * atmosphere, so elevations are geometric over a flat horizon.
 */
import { Body, GeoMoon, GeoVector, RotationAxis } from "astronomy-engine";

import type { LatLon } from "./sun.ts";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const MS_PER_HOUR = 3_600_000;

/** Mean length of the lunar day (synodic month), in hours. */
export const LUNAR_DAY_HOURS = 29.530589 * 24;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Unit vector from the Moon's centre to the Sun in the Moon's body-fixed frame. */
export function moonSunDirection(ms: number): [number, number, number] {
  const date = new Date(ms);
  const sun = GeoVector(Body.Sun, date, false);
  const moon = GeoMoon(date);
  let x = sun.x - moon.x;
  let y = sun.y - moon.y;
  let z = sun.z - moon.z;

  // EQJ → body-fixed: Rz(W) · Rx(90° − δ0) · Rz(90° + α0), as passive rotations.
  const axis = RotationAxis(Body.Moon, date);
  const a = (axis.ra * 15 + 90) * D2R;
  const b = (90 - axis.dec) * D2R;
  const w = axis.spin * D2R;
  [x, y] = [Math.cos(a) * x + Math.sin(a) * y, -Math.sin(a) * x + Math.cos(a) * y];
  [y, z] = [Math.cos(b) * y + Math.sin(b) * z, -Math.sin(b) * y + Math.cos(b) * z];
  [x, y] = [Math.cos(w) * x + Math.sin(w) * y, -Math.sin(w) * x + Math.cos(w) * y];

  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
}

/** The point on the Moon with the Sun straight overhead. */
export function moonSubsolarPoint(ms: number): LatLon {
  const [x, y, z] = moonSunDirection(ms);
  return { lat: Math.asin(clamp(z, -1, 1)) * R2D, lon: wrap180(Math.atan2(y, x) * R2D) };
}

/** Sun elevation above a flat horizon at a point on the Moon, from its subsolar point. */
export function moonElevationFrom(subsolar: LatLon, lat: number, lon: number): number {
  const a = lat * D2R;
  const b = subsolar.lat * D2R;
  const cos = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos((lon - subsolar.lon) * D2R);
  return Math.asin(clamp(cos, -1, 1)) * R2D;
}

/** Sun elevation above a flat horizon at a point on the Moon. */
export const moonSunElevation = (ms: number, lat: number, lon: number) =>
  moonElevationFrom(moonSubsolarPoint(ms), lat, lon);

export interface MoonLight {
  /** Share of the time with the Sun inside the band. */
  bandShare: number;
  /** Share of the time with the Sun above the horizon. */
  upShare: number;
  /** Highest Sun over the period, degrees. */
  maxElevation: number;
}

/**
 * Lighting at a point on the Moon over one lunar day from `startMs`, sampled hourly.
 * The subsolar points are cached per start time so several places can share them.
 */
export function moonLight(lat: number, lon: number, bandMax: number, startMs: number, bandMin = 0): MoonLight {
  const track = subsolarTrack(startMs);
  let band = 0;
  let up = 0;
  let max = -90;
  for (const s of track) {
    const e = moonElevationFrom(s, lat, lon);
    if (e >= 0) up++;
    if (e >= bandMin && e <= bandMax) band++;
    max = Math.max(max, e);
  }
  return { bandShare: band / track.length, upShare: up / track.length, maxElevation: max };
}

const tracks = new Map<number, LatLon[]>();

function subsolarTrack(startMs: number): LatLon[] {
  let track = tracks.get(startMs);
  if (!track) {
    const n = Math.round(LUNAR_DAY_HOURS);
    track = Array.from({ length: n }, (_, i) => moonSubsolarPoint(startMs + i * MS_PER_HOUR));
    if (tracks.size > 24) tracks.clear();
    tracks.set(startMs, track);
  }
  return track;
}
