/**
 * Globe geometry and camera orbit: texture alignment, marker projection and
 * a camera that can centre points at and across the poles.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { PerspectiveCamera, SphereGeometry, Vector3 } from "three";

import {
  centralAngle,
  distanceKm,
  latLonToVector,
  lookAtQuaternion,
  Orbit,
  screenPoint,
  vectorToLatLon,
} from "./orbit.ts";

const W = 1200;
const H = 800;

function cameraFor(orbit: Orbit): PerspectiveCamera {
  const camera = new PerspectiveCamera(30, W / H, 0.01, 100);
  orbit.applyTo(camera);
  camera.updateProjectionMatrix();
  return camera;
}

const close = (a: number, b: number, eps: number, msg?: string) =>
  assert.ok(Math.abs(a - b) < eps, `${msg ?? ""} ${a} vs ${b}`);

describe("texture alignment", () => {
  test("latLonToVector matches SphereGeometry vertices for their UVs", () => {
    const g = new SphereGeometry(1, 72, 36);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      const lon = uv.getX(i) * 360 - 180;
      const lat = uv.getY(i) * 180 - 90;
      const v = latLonToVector(lat, lon);
      close(v.distanceTo(new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))), 0, 1e-6, `vertex ${i}`);
    }
  });

  test("vectorToLatLon inverts latLonToVector", () => {
    for (const [lat, lon] of [
      [0, 0],
      [81, -75],
      [-84.6, 31],
      [-89.67, 129.78],
      [35.35, -111.5],
      [10, 179.9],
    ]) {
      const ll = vectorToLatLon(latLonToVector(lat, lon, 3));
      close(ll.lat, lat, 1e-9);
      close(ll.lon, lon, 1e-9);
    }
  });

  test("distances", () => {
    close(centralAngle({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }), 90, 1e-9);
    close(centralAngle({ lat: 89, lon: 0 }, { lat: 89, lon: 180 }), 2, 1e-9);
    close(distanceKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 111.19, 0.01);
  });
});

describe("markers sit on their projected point", () => {
  test("the centred point projects to the middle of the screen", () => {
    for (const [lat, lon] of [
      [81, -75],
      [35.35, -111.5],
      [-77.6, 162.5],
    ]) {
      const orbit = new Orbit({ lat, lon, dist: 2.5 });
      const camera = cameraFor(orbit);
      const p = screenPoint(camera, latLonToVector(lat, lon, 1.002), W, H);
      close(p.x, W / 2, 1e-6, "x");
      close(p.y, H / 2, 1e-6, "y");
      assert.equal(p.behind, false);
    }
  });

  test("screenPoint agrees with Vector3.project", () => {
    const orbit = new Orbit({ lat: 60, lon: -70, dist: 3.9 });
    const camera = cameraFor(orbit);
    const v = latLonToVector(74.7, -94.9, 1.002);
    const ndc = v.clone().project(camera);
    const p = screenPoint(camera, v, W, H);
    close(p.x, ((ndc.x + 1) / 2) * W, 1e-9);
    close(p.y, ((1 - ndc.y) / 2) * H, 1e-9);
  });

  test("north is up and east is right", () => {
    const orbit = new Orbit({ lat: 40, lon: 10, dist: 3 });
    const camera = cameraFor(orbit);
    const c = screenPoint(camera, latLonToVector(40, 10), W, H);
    const n = screenPoint(camera, latLonToVector(45, 10), W, H);
    const e = screenPoint(camera, latLonToVector(40, 15), W, H);
    assert.ok(n.y < c.y && Math.abs(n.x - c.x) < 1e-6);
    assert.ok(e.x > c.x);
  });

  test("points on the far side are behind", () => {
    const orbit = new Orbit({ lat: 0, lon: 0, dist: 3 });
    const camera = cameraFor(orbit);
    assert.equal(screenPoint(camera, latLonToVector(0, 180, 1.002), W, H).behind, true);
    assert.equal(screenPoint(camera, latLonToVector(0, 60, 1.002), W, H).behind, false);
  });
});

describe("the camera reaches and crosses the poles", () => {
  test("Shackleton crater, 0.33° from the South Pole, can be centred", () => {
    const orbit = new Orbit({ lat: -89.67, lon: 129.78, dist: 1.5 });
    const c = orbit.center();
    close(c.lat, -89.67, 1e-9);
    close(c.lon, 129.78, 1e-6);
    const camera = cameraFor(orbit);
    const p = screenPoint(camera, latLonToVector(-89.67, 129.78, 1.002), W, H);
    close(p.x, W / 2, 1e-6);
    close(p.y, H / 2, 1e-6);
  });

  test("the exact pole uses the fallback roll", () => {
    const q = lookAtQuaternion(-90, 0);
    assert.ok(Number.isFinite(q.x + q.y + q.z + q.w));
    const orbit = new Orbit({ lat: 0, lon: 0, dist: 2 });
    orbit.q.copy(q);
    close(orbit.center().lat, -90, 1e-9);
  });

  test("dragging straight down carries the view over the South Pole", () => {
    const orbit = new Orbit({ lat: -80, lon: 30, dist: 2 });
    // Dragging the ground up moves the view south.
    const steps = 40;
    for (let i = 0; i < steps; i++) orbit.rotate(0, (-20 * Math.PI) / 180 / steps);
    const c = orbit.center();
    close(c.lat, -80, 1e-6, "lat");
    close(Math.abs(c.lon - -150), 0, 1e-6, "lon");
  });

  test("a horizontal drag away from the poles keeps the latitude and north up", () => {
    const orbit = new Orbit({ lat: 50, lon: 0, dist: 3 });
    orbit.rotate((10 * Math.PI) / 180, 0);
    const c = orbit.center();
    close(c.lat, 50, 1e-9);
    assert.ok(c.lon < 0, "dragging the ground right shows places further west");
    const up = orbit.up();
    const north = new Vector3(0, 1, 0);
    const pos = orbit.position().normalize();
    const tangentNorth = north.addScaledVector(pos, -pos.y).normalize();
    close(up.dot(tangentNorth), 1, 1e-9);
  });

  test("zoom stays inside its limits", () => {
    const orbit = new Orbit({ lat: 0, lon: 0, dist: 2 }, 1.2, 9);
    orbit.zoom(0.01);
    assert.equal(orbit.dist, 1.2);
    orbit.zoom(100);
    assert.equal(orbit.dist, 9);
  });
});
