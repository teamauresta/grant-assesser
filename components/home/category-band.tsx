'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';
import { useScroll, useTransform } from 'motion/react';
// `m` from its own entry: importing it from 'motion/react' added about 40 KB gzipped to the home page.
import * as m from 'motion/react-m';
import { Banknote, Cloud, Handshake, Landmark, Receipt, Rocket, Ticket, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { PROGRAM_TYPES } from '@/lib/programs/filter';
import { TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], drift ? [24, -24] : [0, 0]);
  return (
    <section ref={ref} aria-labelledby="types-heading" className="flex flex-col gap-4 overflow-hidden py-2">
      <h2 id="types-heading" className="text-xl">Browse by type</h2>
      <m.ul style={{ x }} className="grid grid-cols-4 gap-3 px-1 md:flex md:justify-center md:gap-4">
        {PROGRAM_TYPES.map((type, i) => {
          const Icon = ICONS[type];
          return (
            <li key={type} className="animate-[lift-float_6s_ease-in-out_infinite]" style={{ animationDelay: `${i * -0.45}s` }}>
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
      </m.ul>
    </section>
  );
}
