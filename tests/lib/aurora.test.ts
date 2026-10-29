// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AURORA_ALPHA, AURORA_KEY, readAuroraPaused, writeAuroraPaused } from '@/lib/aurora';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

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

// Pale sage lines on a near-black page read stronger than dark green lines on sand at the same strength.
it('is weaker in the dark theme, where pale lines on a dark page read stronger', () => {
  expect(AURORA_ALPHA.dark).toBeLessThan(AURORA_ALPHA.light);
});
