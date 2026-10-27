'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { Banknote, Cloud, Handshake, Landmark, Receipt, Rocket, Ticket, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/motion';
import { focusRing } from '@/components/ui/focus-ring';

const ICONS: Record<Program['type'], LucideIcon> = {
  grant: Landmark, voucher: Ticket, 'tax-incentive': Receipt, credits: Cloud,
  accelerator: Rocket, capital: Banknote, service: Handshake, 'investor-incentive': TrendingUp,
};

// The sideways drift runs only on wide screens (on phones the grid fills the width, so moving it
// would clip the outer labels) and never under reduced motion.
const DRIFT_QUERIES = ['(min-width: 48rem)', '(prefers-reduced-motion: no-preference)'];

function subscribeDrift(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const lists = DRIFT_QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener?.('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener?.('change', onChange));
}
const driftSnapshot = () => typeof window.matchMedia === 'function' && DRIFT_QUERIES.every((q) => window.matchMedia(q).matches);
// Off in the server HTML and while hydrating, so the first client render matches it.
const driftServerSnapshot = () => false;

/** Program types as floating circles: a gentle wave, and a slight sideways drift as the page scrolls. */
export function CategoryBand() {
  const ref = useRef<HTMLElement>(null);
  const drift = useSyncExternalStore(subscribeDrift, driftSnapshot, driftServerSnapshot);
  const list = useRef<HTMLUListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // The drift is written straight to the list's style rather than through an `m.ul` motion value:
  // after hydration, LazyMotion loads its features late, and an m component drops motion value
  // changes made before then, so the band would sit still (then jump) until the first scroll.
  const place = useCallback((progress: number) => {
    const el = list.current;
    if (el) el.style.transform = drift ? `translateX(${Math.round((24 - 48 * progress) * 10) / 10}px)` : '';
  }, [drift]);
  useEffect(() => place(scrollYProgress.get()), [place, scrollYProgress]);
  useMotionValueEvent(scrollYProgress, 'change', place);
  // The float plays once, the first time the band comes into view, so people actually see it.
  // It rests in the server HTML, under reduced motion and without IntersectionObserver.
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      setFloating(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} aria-labelledby="types-heading" className="flex flex-col gap-4 overflow-hidden py-2">
      <h2 id="types-heading" className="text-xl">Browse by type</h2>
      <ul ref={list} className="grid grid-cols-4 gap-3 px-1 md:flex md:justify-center md:gap-4">
        {PROGRAM_TYPES.map((type, i) => {
          const Icon = ICONS[type];
          return (
            // Two 2.4s waves, started part-way by the negative stagger, so each circle moves for at
            // most 4.8s and rests at the keyframes' end (WCAG 2.2.2: no automatic motion past 5s).
            <li key={type} className={floating ? 'animate-[lift-float_2.4s_ease-in-out_2]' : undefined} style={{ animationDelay: `${i * -0.45}s` }}>
              <Link
                href={`/programs/?type=${type}`}
                className={cn('group flex flex-col items-center gap-2 rounded-lg p-1 text-center text-xs text-muted-fg hover:text-fg', focusRing)}
              >
                <span className="flex size-14 items-center justify-center rounded-full border border-border bg-surface transition-[border-color,box-shadow] duration-150 group-hover:border-border-strong group-hover:glow-lift">
                  <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="text-fg" />
                </span>
                {TYPE_LABELS[type]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
