'use client';

import { useMemo, type ReactNode } from 'react';
import { PROGRAMS } from '@/content/programs';
import { programStats, STATS_CLOSING_DAYS } from '@/lib/programs/stats';
import { useNow } from '@/lib/use-now';
import { CountUp } from '@/components/motion/count-up';

/** Holds the space of a two-digit number until "now" is known, so nothing shifts. */
const placeholder = <span aria-hidden="true" className="inline-block w-[2ch]">&nbsp;</span>;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Spans both rows of the list's grid, so every number sits on the same line even when a label
    // wraps (as "Closing in 30 days" does on phones).
    <div className="row-span-2 grid grid-rows-subgrid">
      <dt className="text-sm text-muted-fg">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight md:text-5xl">{children}</dd>
    </div>
  );
}

/**
 * The hero's three numbers. The program count is static and in the HTML; "Open now" and
 * "Closing in 30 days" depend on `now`, so they appear (and count up) on the client only.
 */
export function HeroStats() {
  const now = useNow();
  const stats = useMemo(() => (now ? programStats(PROGRAMS, now) : null), [now]);
  return (
    <dl className="grid w-full grid-cols-3 grid-rows-[auto_auto] gap-x-4 gap-y-1 border-t border-border pt-6">
      <Stat label="Programs"><CountUp value={PROGRAMS.length} /></Stat>
      <Stat label="Open now">{stats ? <CountUp value={stats.openNow} /> : placeholder}</Stat>
      <Stat label={`Closing in ${STATS_CLOSING_DAYS} days`}>{stats ? <CountUp value={stats.closingSoon} /> : placeholder}</Stat>
    </dl>
  );
}
