/**
 * An interactive globe for Earth or the Moon in three.js: day/night lighting
 * from a subsolar point, the low-sun band, HTML markers, drag/zoom/fly-to and
 * click-to-pick. It renders only when something changes.
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  LinearMipmapLinearFilter,
  Mesh,
  PerspectiveCamera,
  Points,
  Quaternion,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type IUniform,
  type Texture,
} from "three";

import { latLonToVector, lookAtQuaternion, Orbit, orientationAngle, screenPoint, vectorToLatLon, type OrbitView } from "@/lib/orbit";
import type { LatLon } from "@/lib/sun";

import { ATMOSPHERE_FS, ATMOSPHERE_VS, EARTH_FS, MOON_FS, STARS_FS, STARS_VS, SURFACE_VS } from "./shaders";

export type GlobeBody = "earth" | "moon";
export type MarkerKind = "site" | "place" | "moon-target" | "moon-feature";

export interface MarkerSpec {
  id: string;
  lat: number;
  lon: number;
  label: string;
  kind: MarkerKind;
  /** Dot colour; zero-valued sites draw an empty ring instead. */
  color?: string;
  /** Glow strength, 0–1. */
  glow?: number;
  zero?: boolean;
  showLabel?: boolean;
  selected?: boolean;
  /** Accessible name; defaults to the label. */
  description?: string;
  /** Labels that would overlap are dropped, lowest priority first. */
  priority?: number;
}

export interface PatchSpec {
  url: string;
  lat: number;
  lon: number;
  halfLat: number;
  halfLon: number;
}

export interface GlobeTextures {
  /** Earth: day, night. Moon: color, slope, cap. */
  [name: string]: string;
}

export interface GlobeOptions {
  body: GlobeBody;
  textures: GlobeTextures;
  view: OrbitView;
  minDist?: number;
  maxDist?: number;
  reducedMotion?: boolean;
  onMarker?: (id: string) => void;
  /** A click on the surface that is not a drag. */
  onPick?: (point: LatLon) => void;
  /** All base textures have loaded. */
  onReady?: () => void;
  /** A base texture could not be loaded. */
  onError?: () => void;
}

const FOV = 30;
const MARKER_R = 1.002;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

interface Fly {
  q0: Quaternion;
  q1: Quaternion;
  d0: number;
  d1: number;
  bump: number;
  t0: number;
  dur: number;
}

interface MarkerEntry {
  spec: MarkerSpec;
  el: HTMLButtonElement;
  dot: HTMLSpanElement;
  label: HTMLSpanElement;
  v: Vector3;
  labelWidth: number;
}

export class Globe {
  readonly body: GlobeBody;
  private host: HTMLElement;
  private canvas: HTMLCanvasElement;
  private layer: HTMLElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 0.005, 200);
  private orbit: Orbit;
  private uniforms: Record<string, IUniform>;
  private textures: Texture[] = [];
  private disposables: { dispose(): void }[] = [];
  private markers = new Map<string, MarkerEntry>();
  private opts: GlobeOptions;
  private w = 0;
  private h = 0;
  private raf = 0;
  private fly: Fly | null = null;
  private vel = { x: 0, y: 0 };
  private patchFade: { from: number; to: number; t0: number } | null = null;
  private patchUrl: string | null = null;
  private ro: ResizeObserver;
  private disposed = false;
  private active = true;
  private fitted = false;
  private offsetX = 0;
  private cleanups: (() => void)[] = [];

  constructor(host: HTMLElement, canvas: HTMLCanvasElement, layer: HTMLElement, opts: GlobeOptions) {
    this.host = host;
    this.canvas = canvas;
    this.layer = layer;
    this.opts = opts;
    this.body = opts.body;
    this.orbit = new Orbit(opts.view, opts.minDist ?? (opts.body === "moon" ? 1.35 : 1.3), opts.maxDist ?? 9);

    const r = (this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x05070a, 1);

    this.uniforms = {
      sunDir: { value: new Vector3(1, 0, 0) },
      bandLo: { value: 0 },
      bandHi: { value: 6.9 },
      ringOn: { value: 1 },
      ringTint: { value: 1 },
    };
    this.buildSurface();
    this.buildStars();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.bindInput();
    this.resize();
  }

  /* ---------- scene ---------- */

  private loadTextures(urls: string[], onAll: () => void): Texture[] {
    const loader = new TextureLoader();
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    let pending = urls.length;
    return urls.map((url) => {
      const t = loader.load(
        url,
        () => {
          this.invalidate();
          if (--pending === 0) onAll();
        },
        undefined,
        () => {
          if (!this.disposed) this.opts.onError?.();
        },
      );
      t.anisotropy = maxAniso;
      t.wrapS = RepeatWrapping;
      t.minFilter = LinearMipmapLinearFilter;
      this.textures.push(t);
      return t;
    });
  }

  private buildSurface() {
    const tex = this.opts.textures;
    const ready = () => this.opts.onReady?.();
    let material: ShaderMaterial;
    if (this.body === "moon") {
      const [col, slope, cap] = this.loadTextures([tex.color, tex.slope, tex.cap], ready);
      Object.assign(this.uniforms, { colTex: { value: col }, slopeTex: { value: slope }, capTex: { value: cap } });
      material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: SURFACE_VS, fragmentShader: MOON_FS });
    } else {
      const [day, night] = this.loadTextures([tex.day, tex.night], ready);
      Object.assign(this.uniforms, {
        dayTex: { value: day },
        nightTex: { value: night },
        patchTex: { value: day },
        patchBox: { value: [0, 0, 1, 1] },
        patchOn: { value: 0 },
      });
      material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: SURFACE_VS, fragmentShader: EARTH_FS });
      const atmGeo = new SphereGeometry(1.1, 96, 48);
      const atmMat = new ShaderMaterial({
        uniforms: { sunDir: this.uniforms.sunDir },
        vertexShader: ATMOSPHERE_VS,
        fragmentShader: ATMOSPHERE_FS,
        side: BackSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      this.scene.add(new Mesh(atmGeo, atmMat));
      this.disposables.push(atmGeo, atmMat);
    }
    const geo = new SphereGeometry(1, 256, 128);
    this.scene.add(new Mesh(geo, material));
    this.disposables.push(geo, material);
  }

  private buildStars() {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    const bright = new Float32Array(n);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const sq = Math.sqrt(1 - u * u);
      pos.set([60 * sq * Math.cos(th), 60 * u, 60 * sq * Math.sin(th)], i * 3);
      bright[i] = 0.25 + rand() ** 3 * 0.75;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("brightness", new BufferAttribute(bright, 1));
    const mat = new ShaderMaterial({
      uniforms: { pointSize: { value: 1.3 * Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: STARS_VS,
      fragmentShader: STARS_FS,
      depthWrite: false,
    });
    this.scene.add(new Points(geo, mat));
    this.disposables.push(geo, mat);
  }

  /* ---------- public API ---------- */

  /** Light the globe from the point with the Sun overhead. */
  setSubsolar(p: LatLon) {
    latLonToVector(p.lat, p.lon, 1, this.uniforms.sunDir.value as Vector3);
    this.invalidate();
  }

  /** Geometric sun-elevation limits of the band, degrees. */
  setBand(lower: number, upper: number) {
    this.uniforms.bandLo.value = lower;
    this.uniforms.bandHi.value = upper;
    this.invalidate();
  }

  setRingVisible(on: boolean) {
    this.uniforms.ringOn.value = on ? 1 : 0;
    this.invalidate();
  }

  /** Sharper imagery around one place for close zoom (Earth only). */
  setPatch(patch: PatchSpec | null) {
    if (this.body !== "earth") return;
    if (!patch) {
      this.patchUrl = null;
      this.fadePatch(0);
      return;
    }
    if (patch.url === this.patchUrl) return;
    this.patchUrl = patch.url;
    new TextureLoader().load(patch.url, (t) => {
      if (this.disposed || this.patchUrl !== patch.url) return t.dispose();
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      t.minFilter = LinearMipmapLinearFilter;
      const old = this.uniforms.patchTex.value as Texture;
      if (old !== this.uniforms.dayTex.value) old.dispose();
      this.uniforms.patchTex.value = t;
      this.uniforms.patchBox.value = [patch.lat, patch.lon, patch.halfLat, patch.halfLon];
      this.uniforms.patchOn.value = 0;
      this.fadePatch(1);
    });
  }

  private fadePatch(to: number) {
    this.patchFade = { from: this.uniforms.patchOn.value as number, to, t0: performance.now() };
    this.invalidate();
  }

  /** Fly the camera to centre (lat, lon), north up, at `dist` globe radii from the centre. */
  flyTo(lat: number, lon: number, dist = this.orbit.dist, duration?: number) {
    const q1 = lookAtQuaternion(lat, lon, this.orbit.up());
    const angle = orientationAngle(this.orbit.q, q1);
    const d1 = clamp(dist === this.orbit.dist ? dist : 1 + (dist - 1) * this.distScale(), this.orbit.minDist, this.orbit.maxDist);
    const dur = this.opts.reducedMotion ? 0 : (duration ?? clamp(800 + angle * 12, 800, 2400));
    this.vel = { x: 0, y: 0 };
    this.fly = { q0: this.orbit.q.clone(), q1, d0: this.orbit.dist, d1, bump: clamp(angle / 90, 0, 1), t0: performance.now(), dur };
    this.invalidate();
  }

  /** Turn the view back to north up without moving its centre. */
  northUp() {
    const c = this.orbit.center();
    this.flyTo(c.lat, c.lon, this.orbit.dist, 600);
  }

  zoomBy(factor: number) {
    this.fly = null;
    this.orbit.zoom(factor);
    this.invalidate();
  }

  setMarkers(specs: MarkerSpec[]) {
    const keep = new Set(specs.map((s) => s.id));
    for (const [id, m] of this.markers) {
      if (!keep.has(id)) {
        m.el.remove();
        this.markers.delete(id);
      }
    }
    for (const spec of specs) {
      let m = this.markers.get(spec.id);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "gm";
        const dot = document.createElement("span");
        dot.className = "gm-dot";
        const label = document.createElement("span");
        label.className = "gm-label";
        el.append(dot, label);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.opts.onMarker?.(spec.id);
        });
        this.layer.appendChild(el);
        m = { spec, el, dot, label, v: new Vector3(), labelWidth: 0 };
        this.markers.set(spec.id, m);
      }
      m.spec = spec;
      latLonToVector(spec.lat, spec.lon, MARKER_R, m.v);
      m.el.dataset.kind = spec.kind;
      m.el.classList.toggle("is-zero", !!spec.zero);
      m.el.classList.toggle("is-shown", !!spec.showLabel || !!spec.selected);
      m.el.classList.toggle("is-sel", !!spec.selected);
      m.el.setAttribute("aria-label", spec.description ?? spec.label);
      m.el.setAttribute("aria-pressed", spec.selected ? "true" : "false");
      if (m.label.textContent !== spec.label) {
        m.label.textContent = spec.label;
        m.labelWidth = 0;
      }
      m.dot.style.setProperty("--c", spec.color ?? "");
      m.dot.style.setProperty("--glow", String(spec.glow ?? 0));
    }
    for (const m of this.markers.values()) if (!m.labelWidth) m.labelWidth = m.label.offsetWidth;
    this.invalidate();
  }

  /** Latitude and longitude under a point of the viewport, or null off the globe. */
  pick(clientX: number, clientY: number): LatLon | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector3(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1, 0.5);
    const origin = this.camera.position.clone();
    const dir = ndc.unproject(this.camera).sub(origin).normalize();
    // Ray–unit-sphere intersection.
    const b = origin.dot(dir);
    const c = origin.lengthSq() - 1;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    return vectorToLatLon(origin.addScaledVector(dir, t));
  }

  resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyOffset();
    if (!this.fitted) {
      // Narrow screens see less of the globe at the same distance; start further out.
      this.fitted = true;
      this.orbit.dist = clamp(this.orbit.dist * this.distScale(), this.orbit.minDist, this.orbit.maxDist);
    }
    this.invalidate();
  }

  /**
   * Move the point under the camera `px` CSS pixels to the left of the middle,
   * so a panel on the right does not hide it.
   */
  setCenterOffset(px: number) {
    if (px === this.offsetX) return;
    this.offsetX = px;
    this.applyOffset();
    this.invalidate();
  }

  private applyOffset() {
    if (this.offsetX && this.w) this.camera.setViewOffset(this.w, this.h, this.offsetX, 0, this.w, this.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Distance multiplier that keeps the same width of globe in view on portrait screens. */
  private distScale(): number {
    return clamp(1.1 / (this.camera.aspect || 1), 1, 1.8);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    for (const fn of this.cleanups) fn();
    for (const m of this.markers.values()) m.el.remove();
    this.markers.clear();
    for (const d of this.disposables) d.dispose();
    for (const t of this.textures) t.dispose();
    const patch = this.uniforms.patchTex?.value as Texture | undefined;
    if (patch && !this.textures.includes(patch)) patch.dispose();
    this.renderer.dispose();
  }

  /* ---------- loop ---------- */

  invalidate() {
    if (!this.raf && !this.disposed && this.active) this.raf = requestAnimationFrame(this.tick);
  }

  /** A hidden globe skips rendering until it is shown again. */
  setActive(active: boolean) {
    this.active = active;
    if (active) {
      this.resize();
      this.invalidate();
    }
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const animating = this.step(now);
    this.render();
    if (animating) this.invalidate();
  };

  private step(now: number): boolean {
    let animating = false;
    if (this.fly) {
      const f = this.fly;
      const t = f.dur ? clamp((now - f.t0) / f.dur, 0, 1) : 1;
      const e = ease(t);
      this.orbit.q.slerpQuaternions(f.q0, f.q1, e);
      this.orbit.dist = f.d0 + (f.d1 - f.d0) * e + f.bump * Math.sin(Math.PI * e);
      if (t >= 1) this.fly = null;
      else animating = true;
    } else if (Math.abs(this.vel.x) + Math.abs(this.vel.y) > 1e-5) {
      this.orbit.rotate(this.vel.x, this.vel.y);
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
      animating = true;
    }
    if (this.patchFade) {
      const p = this.patchFade;
      const t = this.opts.reducedMotion ? 1 : clamp((now - p.t0) / 500, 0, 1);
      this.uniforms.patchOn.value = p.from + (p.to - p.from) * t;
      if (t >= 1) this.patchFade = null;
      else animating = true;
    }
    return animating;
  }

  private render() {
    if (!this.w) return;
    this.orbit.applyTo(this.camera);
    // Close up, the band is wider than the view: tint it lightly so the ground stays readable.
    const z = clamp((this.orbit.dist - 1.35) / (2.4 - 1.35), 0, 1);
    this.uniforms.ringTint.value = 0.3 + 0.7 * z * z * (3 - 2 * z);
    this.renderer.render(this.scene, this.camera);
    const labelled: { m: MarkerEntry; x: number; y: number }[] = [];
    for (const m of this.markers.values()) {
      const p = screenPoint(this.camera, m.v, this.w, this.h);
      if (p.behind) {
        m.el.style.visibility = "hidden";
        continue;
      }
      m.el.style.visibility = "";
      m.el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
      m.el.classList.toggle("is-flip", p.x > this.w - 190);
      if (m.spec.showLabel || m.spec.selected) labelled.push({ m, x: p.x, y: p.y });
      else m.el.classList.remove("is-crowded");
    }
    // Show the most important labels first and drop any that would overlap them.
    labelled.sort((a, b) => (b.m.spec.priority ?? 0) - (a.m.spec.priority ?? 0));
    const placed: [number, number, number, number][] = [];
    for (const { m, x, y } of labelled) {
      const w = m.labelWidth || 120;
      const flip = x > this.w - 190;
      const box: [number, number, number, number] = flip ? [x - 12 - w, y - 12, x + 7, y + 12] : [x - 7, y - 12, x + 12 + w, y + 12];
      const hit = placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      m.el.classList.toggle("is-crowded", hit);
      if (!hit) placed.push(box);
    }
  }

  /* ---------- input ---------- */

  private bindInput() {
    const el = this.host;
    const pts = new Map<number, { x: number; y: number }>();
    let last = { x: 0, y: 0, t: 0 };
    let pinch: { d: number; dist: number } | null = null;
    let moved = 0;
    let downAt = 0;

    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      el.addEventListener(type, fn, options);
      this.cleanups.push(() => el.removeEventListener(type, fn, options));
    };

    on("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".gm") || e.button > 0) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.fly = null;
      this.vel = { x: 0, y: 0 };
      moved = 0;
      downAt = performance.now();
      last = { x: e.clientX, y: e.clientY, t: downAt };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.orbit.dist };
      }
    });

    on("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.orbit.dist = clamp((pinch.dist * pinch.d) / Math.max(d, 1), this.orbit.minDist, this.orbit.maxDist);
        moved += 10;
        this.invalidate();
        return;
      }
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const k = this.orbit.radiansPerPixel(this.h, FOV);
      moved += Math.abs(dx) + Math.abs(dy);
      this.orbit.rotate(dx * k, dy * k);
      const now = performance.now();
      const dt = Math.max(1, now - last.t);
      this.vel = { x: ((dx * k) / dt) * 16, y: ((dy * k) / dt) * 16 };
      last = { x: e.clientX, y: e.clientY, t: now };
      this.invalidate();
    });

    const up = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      const idle = performance.now() - last.t > 80;
      if (this.opts.reducedMotion || idle) this.vel = { x: 0, y: 0 };
      if (e.type === "pointerup" && moved < 5 && performance.now() - downAt < 500 && pts.size === 0) {
        const p = this.pick(e.clientX, e.clientY);
        if (p) this.opts.onPick?.(p);
      }
      this.invalidate();
    };
    on("pointerup", up);
    on("pointercancel", up);

    on(
      "wheel",
      (e) => {
        e.preventDefault();
        this.fly = null;
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        this.orbit.zoom(Math.exp(delta * (e.ctrlKey ? 0.01 : 0.0012)));
        this.invalidate();
      },
      { passive: false },
    );

    on("dblclick", (e) => {
      if ((e.target as HTMLElement).closest(".gm")) return;
      const p = this.pick(e.clientX, e.clientY);
      if (p) this.flyTo(p.lat, p.lon, Math.max(this.orbit.minDist, this.orbit.dist * 0.6), 700);
    });

    on("keydown", (e) => {
      if (e.target !== el) return;
      const k = this.orbit.radiansPerPixel(this.h, FOV) * 40;
      const keys: Record<string, () => void> = {
        ArrowLeft: () => this.orbit.rotate(k, 0),
        ArrowRight: () => this.orbit.rotate(-k, 0),
        ArrowUp: () => this.orbit.rotate(0, k),
        ArrowDown: () => this.orbit.rotate(0, -k),
        "+": () => this.orbit.zoom(0.85),
        "=": () => this.orbit.zoom(0.85),
        "-": () => this.orbit.zoom(1 / 0.85),
        n: () => this.northUp(),
      };
      const fn = keys[e.key];
      if (!fn) return;
      e.preventDefault();
      this.fly = null;
      fn();
      this.invalidate();
    });
  }
}
