/**
 * GLSL for the globes. The globe mesh is never moved, so model space is world
 * space: the normal at a surface point is its position on the unit sphere.
 *
 * Both bodies colour the low-sun band: the places where the Sun's elevation
 * over a flat horizon is between `bandLo` and `bandHi` degrees (geometric).
 */

export const SURFACE_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Helpers shared by both bodies. Texture coordinates come from the exact
 * direction of each fragment, not from the mesh UVs: near a pole the mesh's
 * triangle fans bend interpolated UVs by up to a degree. Mip levels use the
 * mesh UV derivatives, which stay smooth across the date line.
 */
const RING = /* glsl */ `
const float D = 57.29577951;
const float PI = 3.14159265;
vec2 sphereUv(vec3 n) {
  return vec2(atan(-n.z, n.x) / (2.0 * PI) + 0.5, asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5);
}
vec4 tex(sampler2D t, vec2 uv) { return textureGrad(t, uv, dFdx(vUv), dFdy(vUv)); }
vec4 texScaled(sampler2D t, vec2 uv, vec2 k) { return textureGrad(t, uv, dFdx(vUv) * k, dFdy(vUv) * k); }
const vec3 GOLD = vec3(0.965, 0.714, 0.353);
const vec3 EDGE = vec3(1.0, 0.86, 0.6);

float inBand(float el, float lo, float hi, float aa) {
  return smoothstep(lo - aa, lo + aa, el) * (1.0 - smoothstep(hi - aa, hi + aa, el));
}
float edges(float el, float lo, float hi, float aa) {
  return (1.0 - smoothstep(0.0, aa * 1.6, abs(el - lo))) + (1.0 - smoothstep(0.0, aa * 1.6, abs(el - hi)));
}
float latLine(float lat, float at) {
  float w = max(fwidth(lat), 0.01);
  return 1.0 - smoothstep(0.0, w * 1.2, abs(lat - at));
}
`;

export const EARTH_FS = /* glsl */ `
uniform sampler2D dayTex;
uniform sampler2D nightTex;
uniform sampler2D patchTex;
uniform vec4 patchBox;   // centre lat, centre lon, half lat, half lon (degrees)
uniform float patchOn;
uniform vec3 sunDir;
uniform float bandLo;
uniform float bandHi;
uniform float ringOn;
uniform float ringTint;
varying vec2 vUv;
varying vec3 vN;
${RING}
void main() {
  vec3 n = normalize(vN);
  float s = dot(n, sunDir);
  float el = asin(clamp(s, -1.0, 1.0)) * D;
  float lat = asin(clamp(n.y, -1.0, 1.0)) * D;

  vec2 uv = sphereUv(n);
  vec3 day = tex(dayTex, uv).rgb;
  if (patchOn > 0.0) {
    float lon = atan(-n.z, n.x) * D;
    vec2 d = vec2(mod(lon - patchBox.y + 540.0, 360.0) - 180.0, lat - patchBox.x) / patchBox.wz;
    vec2 puv = d * 0.5 + 0.5;
    vec2 inside = smoothstep(vec2(0.0), vec2(0.06), puv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - puv);
    float k = inside.x * inside.y * patchOn;
    if (k > 0.0) day = mix(day, texture2D(patchTex, puv).rgb, k);
  }
  float g = dot(day, vec3(0.299, 0.587, 0.114));
  day = mix(vec3(g), day, 0.8) * 0.95;
  vec3 lit = day * (0.16 + 0.95 * pow(clamp(s, 0.0, 1.0), 0.55));
  vec3 night = tex(nightTex, uv).rgb;
  vec3 dark = night * vec3(0.85, 0.85, 1.0) * 1.05 + vec3(0.004, 0.007, 0.014);
  vec3 col = mix(dark, lit, smoothstep(-7.0, 2.5, el));
  col += vec3(0.22, 0.09, 0.03) * exp(-pow((el - 1.0) / 5.5, 2.0)) * 0.32;

  float aa = max(fwidth(el), 0.02);
  float band = inBand(el, bandLo, bandHi, aa);
  col = mix(col, col * vec3(1.2, 1.0, 0.62) + GOLD * 0.40, band * ringOn * ringTint);
  col += EDGE * edges(el, bandLo, bandHi, aa) * 0.55 * ringOn;
  float off = max(bandLo - el, el - bandHi);
  col += vec3(1.0, 0.54, 0.24) * exp(-pow(max(off, 0.0) / 2.4, 2.0)) * (1.0 - band) * 0.14 * ringOn * ringTint;

  col += vec3(0.55, 0.6, 0.7) * latLine(abs(lat), 66.563) * 0.16;
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * Moon surface: LROC colour lit by the Lommel–Seeliger law, which keeps the
 * full Moon evenly bright and darkens towards the terminator like the real
 * regolith. LOLA slopes tilt the normal to shade the relief; a 16 pixel per
 * degree cap takes over south of 70.5° S.
 */
export const MOON_FS = /* glsl */ `
uniform sampler2D colTex;
uniform sampler2D slopeTex;
uniform sampler2D capTex;
uniform vec3 sunDir;
uniform float bandLo;
uniform float bandHi;
uniform float ringOn;
uniform float ringTint;
varying vec2 vUv;
varying vec3 vN;
${RING}
vec2 decodeSlope(vec4 c) { return (c.rg * 255.0 - 128.0) / 200.0; }
void main() {
  vec3 n = normalize(vN);
  float lat = asin(clamp(n.y, -1.0, 1.0)) * D;
  vec3 e = cross(vec3(0.0, 1.0, 0.0), n);
  vec3 east = length(e) > 1e-6 ? normalize(e) : vec3(1.0, 0.0, 0.0);
  vec3 north = cross(n, east);

  vec2 uv = sphereUv(n);
  vec2 sg = decodeSlope(tex(slopeTex, uv));
  if (lat < -70.0) {
    // The cap covers 70° S (v = 1) to the pole (v = 0).
    vec2 sc = decodeSlope(texScaled(capTex, vec2(uv.x, clamp(uv.y * 9.0, 0.0, 1.0)), vec2(1.0, 9.0)));
    sg = mix(sg, sc, smoothstep(70.5, 71.5, -lat));
  }
  float relief = mix(1.6, 1.05, smoothstep(65.0, 78.0, abs(lat))) * (1.0 - smoothstep(89.9, 89.98, abs(lat)));
  vec3 nr = normalize(n - (sg.x * east + sg.y * north) * relief);

  float el = asin(clamp(dot(n, sunDir), -1.0, 1.0)) * D;
  float mu0 = dot(nr, sunDir);
  float mu = max(dot(nr, normalize(cameraPosition - n)), 0.0);
  float i0 = max(mu0, 0.0);
  float ls = min(2.0 * i0 / (i0 + mu + 1e-3), 1.6);
  // Soften relief shadow edges a little; the Sun is a disc, not a point.
  ls *= smoothstep(-0.015, 0.02, mu0);
  float vis = smoothstep(-0.9, 0.4, el);

  vec3 alb = tex(colTex, uv).rgb;
  vec3 col = alb * ls * vis * 1.18 + alb * vec3(0.018, 0.02, 0.026);

  float aa = max(fwidth(el), 0.02);
  float band = inBand(el, bandLo, bandHi, aa);
  col = mix(col, col * vec3(1.12, 1.0, 0.82) + GOLD * 0.06, band * ringOn * ringTint * 0.85);
  col += EDGE * edges(el, bandLo, bandHi, aa) * 0.4 * ringOn;
  gl_FragColor = vec4(col, 1.0);
}`;

export const ATMOSPHERE_VS = /* glsl */ `
varying vec3 vNv;
varying vec3 vNw;
void main() {
  vNv = normalize(normalMatrix * normal);
  vNw = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const ATMOSPHERE_FS = /* glsl */ `
uniform vec3 sunDir;
varying vec3 vNv;
varying vec3 vNw;
void main() {
  float i = pow(clamp(0.74 - dot(vNv, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.2);
  float d = dot(vNw, sunDir);
  vec3 c = mix(vec3(0.06, 0.08, 0.16), vec3(0.34, 0.52, 0.95), smoothstep(-0.25, 0.35, d));
  c += vec3(0.9, 0.45, 0.15) * exp(-pow(d / 0.16, 2.0)) * 0.35;
  gl_FragColor = vec4(c * i * 0.62, 1.0);
}`;

export const STARS_VS = /* glsl */ `
attribute float brightness;
uniform float pointSize;
varying float vB;
void main() {
  vB = brightness;
  gl_PointSize = pointSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const STARS_FS = /* glsl */ `
varying float vB;
void main() {
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * vB * 0.8, 1.0);
}`;
