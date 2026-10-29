// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AURORA_FRAGMENT, FLOW_MAX, auroraFlow, hexToRgb, readAuroraColours } from '@/lib/aurora-shader';
import { AURORA_ALPHA } from '@/lib/aurora';

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
  delete document.documentElement.dataset.theme;
});

describe('hexToRgb', () => {
  it('turns #rrggbb into 0..1 channels', () => {
    expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
  });
  // The CSS minifier shortens tokens (the built light --bg is #fff), so the short form must work too.
  it('reads the short #rgb form', () => {
    expect(hexToRgb('#fff')).toEqual([1, 1, 1]);
    expect(hexToRgb(' #0a8 ')).toEqual([0, 170 / 255, 136 / 255]);
  });
  it('falls back to black for anything else, so a missing token never throws mid-frame', () => {
    expect(hexToRgb('')).toEqual([0, 0, 0]);
  });
});

describe('readAuroraColours', () => {
  it('normalises any CSS colour through a 2D context, so a minifier writing a name still works', () => {
    const root = document.documentElement;
    root.style.setProperty('--bg', 'white');
    root.style.setProperty('--brand', 'teal');
    root.dataset.theme = 'dark';
    const names: Record<string, string> = { white: '#ffffff', teal: '#008080' };
    // jsdom has no canvas: a stand-in that behaves like the browser's fillStyle (normalised, and an
    // invalid value leaves the previous one).
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      let fill = '#000000';
      return {
        get fillStyle() { return fill; },
        set fillStyle(v: string) { const c = names[v.trim()] ?? (/^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : null); if (c) fill = c; },
      } as unknown as CanvasRenderingContext2D;
    } as never);
    expect(readAuroraColours()).toEqual({ bg: [1, 1, 1], line: [0, 128 / 255, 128 / 255], alpha: AURORA_ALPHA.dark });
  });
});

describe('AURORA_FRAGMENT', () => {
  // Lines about one pixel wide whatever the slope need screen-space derivatives.
  it('draws contour lines with fwidth, in one line colour', () => {
    expect(AURORA_FRAGMENT).toContain('#extension GL_OES_standard_derivatives : enable');
    expect(AURORA_FRAGMENT).toContain('fwidth(');
    expect(AURORA_FRAGMENT).toContain('uniform vec3 uLine;');
    for (const stop of ['uC1', 'uC2', 'uC3']) expect(AURORA_FRAGMENT).not.toContain(stop);
  });
});

describe('auroraFlow', () => {
  const speed = (s: number) => Math.abs(auroraFlow(s + 0.01) - auroraFlow(s)) / 0.01;
  it('starts at full pace (0.06 a second), so the first minute is as lively as the rest', () => {
    expect(auroraFlow(0)).toBe(0);
    expect(speed(0)).toBeCloseTo(0.06, 4);
    // The first frame (START_TIME in aurora-canvas.tsx, 12s) is the same moment as before the turns eased.
    expect(auroraFlow(12)).toBeCloseTo(0.72, 3);
  });
  // A 16-bit float only has about three significant digits, so the shader's time must stay small.
  it('stays within FLOW_MAX for hours, without a jump or a speed-up: it turns back at the ends', () => {
    let previous = auroraFlow(0);
    for (let s = 0.5; s < 4 * 3600; s += 0.5) {
      const v = auroraFlow(s);
      expect(Math.abs(v)).toBeLessThanOrEqual(FLOW_MAX);
      expect(Math.abs(v - previous)).toBeLessThanOrEqual(0.06 * 0.5 + 1e-9);
      previous = v;
    }
  });
  // A sudden reversal reads as the field rewinding: it must slow to a stop before it turns.
  it('slows to a stop at the turns', () => {
    let turns = 0;
    for (let s = 0; s < 4 * 3600; s += 0.5) {
      const v = auroraFlow(s);
      if (Math.abs(v) > FLOW_MAX - 0.001) { turns++; expect(speed(s)).toBeLessThan(0.002); }
    }
    expect(turns).toBeGreaterThan(0);
  });
  it('is what the shader reads instead of raw seconds', () => {
    expect(AURORA_FRAGMENT).toContain('uniform float uFlow;');
    expect(AURORA_FRAGMENT).not.toContain('uTime');
  });
});
