// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from '@/lib/use-debounced-value';

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers());

  it('starts with the value and follows it only once it has been still for the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 500), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ v: 'abc' });
    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('abc');
  });
});
