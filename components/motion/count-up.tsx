'use client';

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { prefersReducedMotion, tween } from '@/lib/motion';

const noop = () => () => {};
/** False while hydrating server HTML, true for anything rendered on the client after that. */
const useAfterHydration = () => useSyncExternalStore(noop, () => true, () => false);

export type CountUpProps = { value: number; format?: (n: number) => string; ms?: number; className?: string };

/**
 * A number that counts up from 0. The final value is in the HTML and always available to screen
 * readers. It animates when it first appears on the client (e.g. after "now" is known) or when it
 * scrolls into view; a value already on screen at hydration stays still, so nothing flashes. When
 * the value changes later, it counts on from the number already shown.
 *
 * An invisible copy of the final value shares the animated number's grid cell, so the width is
 * fixed from the first frame and counting never shifts the layout.
 */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-AU'), ms = 900, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const mountedOnClient = useRef(useAfterHydration()).current;
  /** The number on screen now; null until this CountUp has shown anything. */
  const shown = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.textContent = format(value);
      shown.current = value;
      return;
    }
    const run = (from: number) => {
      // Set the start before the first paint, so the final value never flashes first.
      el.textContent = format(from);
      shown.current = from;
      return tween(from, value, ms, (v) => { el.textContent = format(v); shown.current = v; });
    };
    if (shown.current !== null) return shown.current === value ? undefined : run(shown.current);
    if (mountedOnClient) return run(0);
    if (typeof IntersectionObserver === 'undefined' || el.getBoundingClientRect().top < window.innerHeight) {
      shown.current = value;
      return;
    }
    el.textContent = format(0);
    let cancel: (() => void) | undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      cancel = run(0);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancel?.();
      // Not started yet: let the next run wait for the scroll again rather than count at once.
      if (!cancel) shown.current = null;
    };
    // Re-run only when the value changes; format is expected to be stable in meaning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className={cn('inline-grid', className)}>
      <span aria-hidden="true" className="num invisible [grid-area:1/1]">{format(value)}</span>
      <span ref={ref} data-count="" aria-hidden="true" className="num [grid-area:1/1]">{format(value)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
