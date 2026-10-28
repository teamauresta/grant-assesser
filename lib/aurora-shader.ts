/**
 * The aurora's WebGL side: shader sources, the flow clock and the theme colours as uniforms. Only
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

export type AuroraColours = { bg: number[]; stops: number[][]; alpha: number };

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
    stops: ['--lift-1', '--lift-2', '--lift-3'].map(read),
    alpha: AURORA_ALPHA[root.dataset.theme === 'dark' ? 'dark' : 'light'],
  };
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
uniform float uFlow;
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
  float t = uFlow;

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
  vec3 dither = vec3((hash(gl_FragCoord.xy + fract(uFlow * 50.0)) - 0.5) / 255.0);
  gl_FragColor = vec4(mix(uBg, col, a) + dither, 1.0);
}
`;
