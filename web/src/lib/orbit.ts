/**
 * Globe geometry and the camera orbit.
 *
 * Positions use the layout of three.js SphereGeometry, so a texture in plate
 * carrée (longitude −180° at the left edge) lines up with latitude and
 * longitude: x = cos φ cos λ, y = sin φ, z = −cos φ sin λ on a unit sphere.
 *
 * The camera orbit is a quaternion, not a latitude and longitude, so the
 * camera can pass over a pole and centre any point, including one a few
 * hundred metres from the pole. Horizontal drags turn the globe about its
 * axis away from the poles and about the screen's vertical axis near them.
 */
import { Matrix4, Quaternion, Vector3, type Camera } from "three";

import type { LatLon } from "./sun.ts";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const Y = new Vector3(0, 1, 0);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Point on a sphere of radius `r` for a latitude and longitude in degrees. */
export function latLonToVector(lat: number, lon: number, r = 1, out = new Vector3()): Vector3 {
  const la = lat * D2R;
  const lo = lon * D2R;
  return out.set(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
}

/** Latitude and longitude of the direction `v` (any length). */
export function vectorToLatLon(v: Vector3): LatLon {
  const n = v.length() || 1;
  return { lat: Math.asin(clamp(v.y / n, -1, 1)) * R2D, lon: wrap180(Math.atan2(-v.z, v.x) * R2D) };
}

/** Angle between two points on a sphere, degrees. */
export function centralAngle(a: LatLon, b: LatLon): number {
  const p1 = a.lat * D2R;
  const p2 = b.lat * D2R;
  const h =
    Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((b.lon - a.lon) * D2R) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * R2D;
}

/** Great-circle distance on Earth, km. */
export const distanceKm = (a: LatLon, b: LatLon) => centralAngle(a, b) * D2R * 6371;

/**
 * Orientation of a camera above (lat, lon) looking at the globe's centre with
 * north up. At a pole, where north is undefined, `fallbackUp` sets the roll.
 */
export function lookAtQuaternion(lat: number, lon: number, fallbackUp = new Vector3(0, 0, -1)): Quaternion {
  const z = latLonToVector(lat, lon);
  const tangent = (v: Vector3) => v.clone().addScaledVector(z, -z.dot(v));
  let up = tangent(Y);
  if (up.lengthSq() < 1e-12) up = tangent(fallbackUp);
  up.normalize();
  const x = new Vector3().crossVectors(up, z).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, up, z));
}

export interface OrbitView {
  lat: number;
  lon: number;
  dist: number;
}

/** Camera orbit around a unit globe: an orientation and a distance from the centre. */
export class Orbit {
  readonly q: Quaternion;
  dist: number;
  minDist: number;
  maxDist: number;

  constructor(view: OrbitView, minDist = 1.2, maxDist = 9) {
    this.q = lookAtQuaternion(view.lat, view.lon);
    this.dist = view.dist;
    this.minDist = minDist;
    this.maxDist = maxDist;
  }

  /** Camera position. */
  position(out = new Vector3()): Vector3 {
    return out.set(0, 0, this.dist).applyQuaternion(this.q);
  }

  /** Camera up direction. */
  up(out = new Vector3()): Vector3 {
    return out.set(0, 1, 0).applyQuaternion(this.q);
  }

  /** The point under the centre of the screen. */
  center(): LatLon {
    return vectorToLatLon(this.position());
  }

  /** Radians the view turns per pixel, so the ground follows the pointer. */
  radiansPerPixel(viewportHeight: number, fovDeg: number): number {
    return ((this.dist - 1) * fovDeg * D2R) / Math.max(200, viewportHeight);
  }

  /**
   * Turn the view by a pointer movement of (dx, dy) radians on screen.
   * Positive dx drags the ground to the right, positive dy drags it down.
   */
  rotate(dx: number, dy: number): void {
    if (dx) {
      const pos = this.position().normalize();
      const up = this.up();
      const nearPole = smoothstep(0.86, 0.97, Math.abs(pos.y));
      const sign = up.dot(Y) >= 0 ? 1 : -1;
      // Away from the poles, turn about the globe's axis so north stays up.
      const axis = Y.clone().multiplyScalar(sign).lerp(up, nearPole).normalize();
      const scale = 1 / Math.max(0.3, Math.sqrt(1 - pos.y * pos.y));
      const angle = -dx * (scale + (1 - scale) * nearPole);
      this.q.premultiply(new Quaternion().setFromAxisAngle(axis, angle)).normalize();
    }
    if (dy) {
      this.q.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -dy)).normalize();
    }
  }

  zoom(factor: number): void {
    this.dist = clamp(this.dist * factor, this.minDist, this.maxDist);
  }

  /** Apply the orbit to a three.js camera. */
  applyTo(camera: Camera): void {
    this.position(camera.position);
    camera.quaternion.copy(this.q);
    camera.updateMatrixWorld();
  }
}

/** Degrees between two orientations. */
export const orientationAngle = (a: Quaternion, b: Quaternion) => a.angleTo(b) * R2D;

/**
 * Screen position in CSS pixels of a world point, for a camera already set up
 * with `applyTo` and an up-to-date projection matrix. `behind` is true when the
 * point is on the far side of the globe from the camera.
 */
export function screenPoint(
  camera: Camera,
  point: Vector3,
  width: number,
  height: number,
): { x: number; y: number; behind: boolean } {
  const toCamera = camera.position.clone().sub(point);
  // Visible from outside a unit globe when the camera is above the point's horizon.
  const behind = point.dot(toCamera) <= 0.01 * point.length();
  const p = point.clone().project(camera);
  return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height, behind };
}
