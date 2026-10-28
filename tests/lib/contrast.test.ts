import { describe, it, expect } from 'vitest';
import { contrast, luminance, mixHex } from '@/lib/contrast';

describe('contrast', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#0f766e', '#0f766e')).toBe(1);
  });
  it('is symmetric', () => {
    expect(contrast('#2563eb', '#ffffff')).toBeCloseTo(contrast('#ffffff', '#2563eb'), 10);
  });
  it('rejects anything but #rrggbb', () => {
    expect(() => luminance('teal')).toThrow(/#rrggbb/);
  });
});

describe('mixHex', () => {
  it('blends two colours channel by channel', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#0000ff', 0.25)).toBe('#bf0040');
  });
});
