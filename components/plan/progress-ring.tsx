'use client';

import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { CountUp } from '@/components/motion/count-up';

const R = 26;
const C = 2 * Math.PI * R;

/**
 * A ring in the Liftoff gradient. The arc draws in from empty; the number counts up. Assistive tech
 * reads it as one image, "40% of goals done"; the counting number inside is hidden from it.
 */
export function ProgressRing({ percent, size = 64, className }: { percent: number; size?: number; className?: string }) {
  const id = useId();
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const [drawn, setDrawn] = useState(0);
  // On the next frame, so the arc transitions from where it was (empty at first) to the new value.
  useEffect(() => {
    const f = requestAnimationFrame(() => setDrawn(p));
    return () => cancelAnimationFrame(f);
  }, [p]);
  return (
    <span
      role="img"
      aria-label={`${p}% of goals done`}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--lift-1)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--lift-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--lift-3)' }} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={R} fill="none" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - drawn / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span aria-hidden="true" className="relative inline-flex">
        <CountUp value={p} format={(n) => `${Math.round(n)}%`} className="text-sm font-semibold" />
      </span>
    </span>
  );
}
