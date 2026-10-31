'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { closingSoon } from '@/lib/programs/filter';
import { formatDate } from '@/lib/dates';
import { formatBenefit } from '@/lib/format';
import { useNow } from '@/lib/use-now';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

const WINDOW_DAYS = 30;

/**
 * Programs whose applications close in the next 30 days. Depends on "now", so it renders only the
 * heading until the client mounts; no build-time dates reach the HTML.
 */
export function ClosingSoonStrip({ programs, className }: { programs: Program[]; className?: string }) {
  const now = useNow();
  const items = useMemo(() => (now ? closingSoon(programs, now, WINDOW_DAYS) : null), [programs, now]);

  return (
    <section aria-labelledby="closing-soon-heading" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="closing-soon-heading" className="text-xl">Closing soon</h2>
        <Link href="/programs/" className={cn('inline-flex min-h-11 items-center gap-1 rounded-md text-sm text-accent hover:underline', focusRing)}>
          All programs
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </Link>
      </div>
      {items === null ? (
        <div className="min-h-24 rounded-lg border border-border bg-surface" aria-hidden="true" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted-fg">
          Nothing closes in the next {WINDOW_DAYS} days. Rolling programs are open year-round.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items.map(({ program, deadline, daysLeft, status }) => (
            <li key={program.slug} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 first:rounded-t-[7px] last:rounded-b-[7px] hover:bg-neutral-bg has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
              <div className="min-w-0">
                <Link
                  href={`/programs/${program.slug}/`}
                  className="font-medium after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {program.name}
                </Link>
                <p className="num text-xs text-muted-fg">{formatBenefit(program.benefit)}</p>
              </div>
              <div className="flex items-center gap-3">
                <time dateTime={deadline.date} className="num text-sm">{formatDate(deadline.date)}</time>
                {status.state !== 'closing-soon' && <span className="num text-xs text-muted-fg">In {daysLeft} days</span>}
                <StatusPill declared={status.declared} derived={status.state} daysToClose={status.daysToClose} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
