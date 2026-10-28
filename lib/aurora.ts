/**
 * The home hero's aurora: a slow field of the Liftoff stops drawn by a WebGL shader
 * (components/home/aurora-canvas.tsx). Shader sources, strength and the remembered pause live here.
 */

/** Strongest the field may paint over --bg, per theme. tests/lib/tokens.test.ts keeps text AA on it. */
export const AURORA_ALPHA = { light: 0.3, dark: 0.18 } as const;

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

/** #rrggbb as 0..1 channels for a shader uniform; black for anything else. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
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
 * Domain-warped value noise mapped onto the three stops, blended over the page background and
 * strongest to the right (the text column is on the left). Fades out at the top and bottom edges
 * so the hero has no visible boundary. Output alpha never exceeds uAlpha.
 */
export const AURORA_FRAGMENT = `
precision mediump float;
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y) * 1.6;
  float t = uTime * 0.04;
  vec2 d = uv - uPointer;
  float pull = exp(-dot(d, d) * 18.0) * 0.35;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.3 + pull), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.5 * r);
  vec3 col = mix(uC1, uC2, smoothstep(0.2, 0.6, f));
  col = mix(col, uC3, smoothstep(0.5, 0.85, r.x));
  float reach = smoothstep(0.1, 0.85, uv.x) * (0.55 + 0.45 * f);
  reach *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
  gl_FragColor = vec4(mix(uBg, col, uAlpha * clamp(reach, 0.0, 1.0)), 1.0);
}
`;
