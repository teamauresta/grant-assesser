/**
 * The home hero's contour lines (still "aurora" in code): their strength and the remembered pause.
 * Small and in the home page's first download (HeroAurora needs the pause before the shader loads).
 * The shader itself lives in lib/aurora-shader.ts, which only the lazily loaded canvas imports.
 */

/** Strongest a contour line may paint over --bg, per theme. tests/lib/tokens.test.ts keeps text AA on it. */
export const AURORA_ALPHA = { light: 0.25, dark: 0.22 } as const;

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
