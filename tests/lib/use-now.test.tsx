// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { useNow, NOW_REFRESH_MS } from '@/lib/use-now';

function Probe() {
  const now = useNow();
  return <span>{now === null ? 'null' : 'date'}</span>;
}

describe('useNow', () => {
  afterEach(() => vi.useRealTimers());

  it('returns null when rendered on the server', () => {
    expect(renderToString(<Probe />)).toContain('null');
  });

  it('returns a Date on the client and refreshes every 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));
    const { result } = renderHook(() => useNow());
    expect(result.current).toBeInstanceOf(Date);
    const first = result.current!.getTime();
    act(() => { vi.advanceTimersByTime(NOW_REFRESH_MS); });
    expect(result.current!.getTime()).toBe(first + NOW_REFRESH_MS);
  });
});
