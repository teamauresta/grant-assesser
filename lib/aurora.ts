/**
 * The home hero's aurora: a slow field of the Liftoff stops drawn by a WebGL shader
 * (components/home/aurora-canvas.tsx). Shader sources, strength and the remembered pause live here.
 */

/** Strongest the field may paint over --bg, per theme. tests/lib/tokens.test.ts keeps text AA on it. */
export const AURORA_ALPHA = { light: 0.3, dark: 0.24 } as const;

export const AURORA_KEY = 'gn-aurora';

/** True when the person paused the aurora on an earlier visit. Blocked storage reads as playing. */
export function readAuroraPaused(): boolean {
  try { return window.localStorage.getItem(AURORA_KEY) === 'paused'; } catch { return false; }
}

export function writeAuroraPaused(paused: boolean): void {
  try {
    if (paused) window.localStorage.setItem(AURORA_KEY, 'paused');
    else window.localStorage.removeItem(AURORA_KEY);
  } catch { /* blocked storage: the choice lasts for this page only */ }
}

/**
 * #rrggbb or #rgb as 0..1 channels for a shader uniform; black for anything else. The short form
 * matters: the CSS minifier turns `--bg: #ffffff` into `#fff` in the build.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const digits = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const n = parseInt(digits, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type AuroraColours = { bg: number[]; stops: number[][]; alpha: number };

/** The current theme's colours, read from the CSS tokens (the theme lives on <html data-theme>). */
export function readAuroraColours(): AuroraColours {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const read = (name: string) => hexToRgb(style.getPropertyValue(name));
  return {
    bg: read('--bg'),
    stops: ['--lift-1', '--lift-2', '--lift-3'].map(read),
    alpha: AURORA_ALPHA[root.dataset.theme === 'dark' ? 'dark' : 'light'],
  };
}

export const AURORA_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Domain-warped value noise. Colour runs along the three stops (teal, blue, violet: never a muddy
 * three-way mix); strength gathers into soft folds with background between them, strongest to the
 * right (the text column is on the left) and fading out at the top and bottom so the hero has no
 * visible edge. The pointer swirls the flow nearby. Output never paints more than uAlpha of a stop
 * over uBg (the dither is under half a level). highp where the GPU has it: the sin() hash breaks
 * into blocks at 16-bit precision on phones.
 */
export const AURORA_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uBg;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uAlpha;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = turn * p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
vec3 ramp(float h) {
  return mix(mix(uC1, uC2, smoothstep(0.0, 0.55, h)), uC3, smoothstep(0.45, 1.0, h));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  // Stretched along a gentle diagonal, so the forms flow as long ribbons rather than blotches.
  vec2 p = mat2(0.94, -0.34, 0.34, 0.94) * vec2(uv.x * aspect, uv.y) * vec2(0.8, 1.35);
  float t = uTime * 0.06;

  vec2 d = (uv - uPointer) * vec2(aspect, 1.0);
  p += exp(-dot(d, d) * 4.0) * 0.3 * vec2(-d.y, d.x);

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.8));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p + 2.0 * r);

  // fbm clusters around 0.5, so stretch it: whole regions of teal, blue and violet drift past,
  // with teal leaning to the lower left (it tints white grey) and violet to the upper right.
  vec3 col = ramp(clamp(0.6 + 3.0 * (r.y - 0.5) + 0.5 * (uv.x - 0.5) + 0.35 * (uv.y - 0.5), 0.0, 1.0));
  float folds = smoothstep(0.3, 0.7, f);

  // A mass of colour on the right, near full strength, with folds moving through it; wisps elsewhere.
  vec2 c = (uv - vec2(0.8, 0.52)) * vec2(aspect * 0.55, 1.0);
  float mass = 1.0 - smoothstep(0.12, 0.85, length(c) + 0.3 * (q.x - 0.5));
  float strength = mix(0.25 * folds, mix(0.7, 1.0, folds), mass);
  strength *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.8, uv.y);

  float a = uAlpha * clamp(strength, 0.0, 1.0);
  vec3 dither = vec3((hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0);
  gl_FragColor = vec4(mix(uBg, col, a) + dither, 1.0);
}
`;
