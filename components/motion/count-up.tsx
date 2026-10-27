'use client';

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { prefersReducedMotion, tween } from '@/lib/motion';

const noop = () => () => {};
/** False while hydrating server HTML, true for anything rendered on the client after that. */
const useAfterHydration = () => useSyncExternalStore(noop, () => true, () => false);

export type CountUpProps = { value: number; format?: (n: number) => string; ms?: number; className?: string };

/**
 * A number that counts up from 0. The final value is in the HTML and always available to screen
 * readers. It animates when it first appears on the client (e.g. after "now" is known) or when it
 * scrolls into view; a value already on screen at hydration stays still, so nothing flashes.
 */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-AU'), ms = 900, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const mountedOnClient = useRef(useAfterHydration()).current;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const run = () => {
      // Start from 0 before the first paint, so the final value never flashes first.
      el.textContent = format(0);
      return tween(0, value, ms, (v) => { el.textContent = format(v); });
    };
    if (mountedOnClient) return run();
    if (typeof IntersectionObserver === 'undefined' || el.getBoundingClientRect().top < window.innerHeight) return;
    el.textContent = format(0);
    let cancel: (() => void) | undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      cancel = run();
    });
    io.observe(el);
    return () => { io.disconnect(); cancel?.(); };
    // Re-run only when the value changes; format is expected to be stable in meaning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true" className="num">{format(value)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
