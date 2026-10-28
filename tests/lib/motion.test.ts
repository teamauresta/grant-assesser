// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion, tween } from '@/lib/motion';

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion', () => {
  it('follows the media query and is false without matchMedia', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('tween', () => {
  it('eases from one value to another and ends exactly on the target', () => {
    const frames: ((t: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const seen: number[] = [];
    tween(0, 100, 1000, (v) => seen.push(v));
    frames.shift()!(0);
    frames.shift()!(500);
    frames.shift()!(1000);
    expect(seen[0]).toBe(0);
    expect(seen[1]).toBeGreaterThan(50); // ease-out is past halfway at the midpoint
    expect(seen.at(-1)).toBe(100);
    expect(frames).toHaveLength(0);
  });

  it('takes another easing, such as linear, when the caller shapes the motion itself', () => {
    const frames: ((t: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const seen: number[] = [];
    tween(0, 100, 1000, (v) => seen.push(v), (t) => t);
    frames.shift()!(0);
    frames.shift()!(250);
    frames.shift()!(1000);
    expect(seen).toEqual([0, 25, 100]);
  });
});
