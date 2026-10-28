// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AURORA_ALPHA, AURORA_KEY, hexToRgb, readAuroraPaused, writeAuroraPaused } from '@/lib/aurora';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('hexToRgb', () => {
  it('turns #rrggbb into 0..1 channels', () => {
    expect(hexToRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
  });
  it('falls back to black for anything else, so a missing token never throws mid-frame', () => {
    expect(hexToRgb('')).toEqual([0, 0, 0]);
  });
});

describe('aurora pause preference', () => {
  it('defaults to playing and remembers a pause', () => {
    expect(readAuroraPaused()).toBe(false);
    writeAuroraPaused(true);
    expect(localStorage.getItem(AURORA_KEY)).toBe('paused');
    expect(readAuroraPaused()).toBe(true);
    writeAuroraPaused(false);
    expect(readAuroraPaused()).toBe(false);
  });
  it('ignores blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => writeAuroraPaused(true)).not.toThrow();
    expect(readAuroraPaused()).toBe(false);
  });
});

it('is weaker in the dark theme, where the stops are brighter', () => {
  expect(AURORA_ALPHA.dark).toBeLessThan(AURORA_ALPHA.light);
});
