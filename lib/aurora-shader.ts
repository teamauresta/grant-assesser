/**
 * The hero's WebGL side: the contour shader, the flow clock and the theme colours as uniforms. Only
 * components/home/aurora-canvas.tsx imports this, so the GLSL stays out of the home page's first
 * download (scripts/js-size.mjs fails the build check if it slips back in).
 */
import { AURORA_ALPHA } from './aurora';

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

export type AuroraColours = { bg: number[]; line: number[]; alpha: number };

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Any CSS colour as #rrggbb, via a 2D context's fillStyle (the browser normalises it), so a token a
 * minifier rewrote as a name or another form still reads. Black for an invalid colour; the raw
 * value where there is no 2D context.
 */
function normalise(value: string): string {
  if (probe === undefined) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return value;
  probe.fillStyle = '#000000';
  probe.fillStyle = value.trim();
  return String(probe.fillStyle);
}

/** The current theme's colours, read from the CSS tokens (the theme lives on <html data-theme>). */
export function readAuroraColours(): AuroraColours {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const read = (name: string) => hexToRgb(normalise(style.getPropertyValue(name)));
  return {
    bg: read('--bg'),
    line: read('--brand'),
    alpha: AURORA_ALPHA[root.dataset.theme === 'dark' ? 'dark' : 'light'],
  };
}

/** Canvas pixels per CSS pixel above dpr 1: lines need sharper pixels than a soft field did. */
const SCALE = 0.75;

/**
 * Canvas pixels per CSS pixel for a device pixel ratio: one per device pixel up to dpr 1 (never more
 * than the device has when zoomed out), so lines stay crisp on standard screens; above that the ratio
 * capped at 1.5, times SCALE, but never below 1. At most 1.125: crisp on retina, and the cost stays low.
 */
export function canvasScale(dpr: number): number {
  return Math.min(dpr, Math.max(1, Math.min(dpr, 1.5) * SCALE));
}

/** Flow units per second at full pace (through zero): how fast the field drifts. */
const FLOW_SPEED = 0.06;
/** The flow clock turns back at plus and minus this (a turn about every 14 minutes). */
export const FLOW_MAX = 16;

/**
 * The shader's clock, from seconds of play: a slow sine between -FLOW_MAX and FLOW_MAX. A 16-bit
 * float (mediump on GPUs without highp) keeps about three significant digits, so raw seconds would
 * make the drift step after a while; this stays small forever. The noise played backwards is as
 * continuous as forwards, and the sine eases into each turn, so the field slows to a stop and drifts
 * back rather than rewinding. It starts at full pace through zero. On mediump-only GPUs (rare; most
 * phones expose highp) the drift moves in ticks of 1/128 to 1/64 once |flow| passes about 8,
 * slowest near the turns.
 */
export function auroraFlow(seconds: number): number {
  return FLOW_MAX * Math.sin((seconds * FLOW_SPEED) / FLOW_MAX);
}

export const AURORA_VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Topographic contour lines over a slowly drifting height field (domain-warped value noise). Lines
 * are one to two canvas pixels wide whatever the slope (fwidth, from OES_standard_derivatives), every
 * fifth one stronger like an index contour on a survey map. The pointer raises a soft hill, so lines
 * bend around it. Strongest to the right (the text column is on the left) and fading out at the top
 * and bottom so the hero has no visible edge. Output never paints more than uAlpha of uLine over uBg
 * (the dither is under half a level). highp where the GPU has it: the sin() hash breaks into blocks
 * at 16-bit precision on phones.
 */
export const AURORA_FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uFlow;
uniform vec2 uPointer;
uniform vec3 uBg;
uniform vec3 uLine;
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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = turn * p * 2.03 + vec2(1.7, 9.2); a *= 0.42; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.15;
  float t = uFlow;

  // Terrain: gentle warping keeps the lines flowing, never noisy.
  vec2 w = vec2(fbm(p + vec2(0.0, t * 0.4)), fbm(p + vec2(5.2, 1.3) - t * 0.35));
  float h = fbm(p + 0.9 * w + vec2(t * 0.15, 0.0));

  // The pointer raises a soft hill.
  vec2 d = (uv - uPointer) * vec2(aspect, 1.0);
  h += 0.07 * exp(-dot(d, d) * 7.0);

  // Contours: distance to the nearest level, in pixels.
  float v = h * 18.0;
  float f = fract(v);
  float px = min(f, 1.0 - f) / max(fwidth(v), 1e-4);
  // Every fifth level, by distance to the nearest multiple of five: a GLSL modulo can return 5.0 on some GPUs.
  float n = floor(v + 0.5);
  float index = 1.0 - step(0.1, abs(n - 5.0 * floor(n / 5.0 + 0.5)));
  float line = (1.0 - smoothstep(0.4, 1.3, px)) * mix(0.5, 1.0, index);

  // Strongest on the right, fading behind the text column and at the top and bottom.
  float mass = smoothstep(0.25, 0.75, uv.x + 0.15 * (w.x - 0.5));
  float strength = mix(0.2, 1.0, mass) * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.8, uv.y);

  float a = uAlpha * clamp(line * strength, 0.0, 1.0);
  vec3 dither = vec3((hash(gl_FragCoord.xy + fract(uFlow * 50.0)) - 0.5) / 255.0);
  gl_FragColor = vec4(mix(uBg, uLine, a) + dither, 1.0);
}
`;
