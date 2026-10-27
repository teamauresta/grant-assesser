'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * Fades and lifts its content in when it scrolls into view, once. Content is never hidden in the
 * exported HTML: only an element that starts below the first screen is hidden, and only after
 * hydration. `delay` (ms) staggers items in a list, e.g. index * 40.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = 'hidden';
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      el.dataset.reveal = 'shown';
      io.disconnect();
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}
