'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { daysBetween, formatDate, todayISO } from '@/lib/dates';
import { applicationName } from '@/lib/plan/applications';
import { dueWithin } from '@/lib/plan/selectors';
import { useNow } from '@/lib/use-now';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { LIST_FRAME } from '@/components/ui/list';
import { goalHref } from '@/lib/plan/routes';

const MAX_ITEMS = 5;
const WINDOW_DAYS = 7;

function when(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return formatDate(dueDate);
}

/**
 * Open goals due in the next 7 days, overdue ones first. Renders nothing before the workspace has
 * loaded (so server and first client render match) and when nothing is due.
 */
export function DueThisWeek({ className }: { className?: string }) {
  const ready = useWorkspace((s) => s.ready);
  const goals = useWorkspace((s) => s.ws.goals);
  const pipeline = useWorkspace((s) => s.ws.pipeline);
  const now = useNow();
  const due = useMemo(() => (ready && now ? dueWithin(goals, now, WINDOW_DAYS) : []), [ready, now, goals]);
  if (!now || !due.length) return null;
  const today = todayISO(now);
  const names = new Map(pipeline.map((a) => [a.id, applicationName(a)]));

  return (
    <section aria-labelledby="due-this-week-heading" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="due-this-week-heading" className="text-xl">Due this week</h2>
        <Link href="/plan/?tab=goals" className={cn('inline-flex min-h-11 items-center gap-1 rounded-md text-sm text-accent hover:underline', focusRing)}>
          {due.length > MAX_ITEMS ? <>See all <span className="num">{due.length}</span></> : 'See all goals'}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
      <ul className={LIST_FRAME}>
        {due.slice(0, MAX_ITEMS).map((g) => {
          const overdue = g.dueDate < today;
          const context = g.applicationId ? names.get(g.applicationId) : undefined;
          return (
            <li key={g.id} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-neutral-bg has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent">
              <div className="min-w-0">
                <Link href={goalHref(g.id)} className="break-words font-medium after:absolute after:inset-0 focus-visible:outline-none">{g.title}</Link>
                {context && <p className="text-xs text-muted-fg">{context}</p>}
              </div>
              <span className={cn('inline-flex items-center gap-1 text-sm', overdue ? 'font-medium text-danger' : 'text-muted-fg')}>
                {overdue && <CircleAlert aria-hidden="true" size={16} className="shrink-0" />}
                {overdue && <span>Overdue</span>}
                <time dateTime={g.dueDate} className="num">{when(g.dueDate, today)}</time>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
