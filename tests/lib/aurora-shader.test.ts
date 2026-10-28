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
    root.style.setProperty('--lift-1', 'teal');
    root.style.setProperty('--lift-2', '#2563eb');
    root.style.setProperty('--lift-3', '#7c3aed');
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
    const colours = readAuroraColours();
    expect(colours.bg).toEqual([1, 1, 1]);
    expect(colours.stops[0]).toEqual([0, 128 / 255, 128 / 255]);
    expect(colours.alpha).toBe(AURORA_ALPHA.dark);
  });
});

describe('auroraFlow', () => {
  it('moves at a steady pace from the start', () => {
    expect(auroraFlow(0)).toBe(0);
    expect(auroraFlow(10)).toBeCloseTo(auroraFlow(5) * 2, 10);
  });
  // A 16-bit float only has about three significant digits, so the shader's time must stay small.
  it('stays within FLOW_MAX for hours, without a jump: it turns back at the ends', () => {
    let previous = auroraFlow(0);
    for (let s = 0.5; s < 4 * 3600; s += 0.5) {
      const v = auroraFlow(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(FLOW_MAX);
      expect(Math.abs(v - previous)).toBeLessThan(0.05);
      previous = v;
    }
  });
  it('is what the shader reads instead of raw seconds', () => {
    expect(AURORA_FRAGMENT).toContain('uniform float uFlow;');
    expect(AURORA_FRAGMENT).not.toContain('uTime');
  });
});
