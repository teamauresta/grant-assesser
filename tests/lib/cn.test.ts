import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins class names with single spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('supports conditional classes', () => {
    const active = true;
    const disabled = false;
    expect(cn('base', active && 'font-semibold', disabled && 'opacity-50')).toBe('base font-semibold');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', ['b', false]], 'c')).toBe('a b c');
  });

  it('trims and collapses whitespace inside values', () => {
    expect(cn('  a   b ', ' c')).toBe('a b c');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, null)).toBe('');
  });
});
