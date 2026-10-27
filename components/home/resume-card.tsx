'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { planProgress } from '@/lib/plan/progress';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { focusRing } from '@/components/ui/focus-ring';
import { ProgressRing } from '@/components/plan/progress-ring';

/**
 * For returning users: progress across the plan and the next goal. Renders nothing until the
 * workspace has loaded and has at least one application, so it never changes the server HTML.
 */
export function ResumeCard() {
  const ready = useWorkspace((s) => s.ready);
  const ws = useWorkspace((s) => s.ws);
  const progress = useMemo(() => planProgress(ws), [ws]);
  if (!ready || !ws.pipeline.length) return null;
  const { done, total, percent, next } = progress;
  return (
    <Card as="section" aria-labelledby="resume-heading" className="flex items-center gap-4">
      <ProgressRing percent={percent} size={56} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="resume-heading" className="text-base font-semibold">Pick up where you left off</h2>
        <p className="text-sm text-muted-fg">
          <span className="num">{done}</span> of <span className="num">{total}</span> goals done
          {next && (
            <>
              . Next: <span className="break-words text-fg">{next.title}</span>, due{' '}
              <time dateTime={next.dueDate} className="whitespace-nowrap">{formatDate(next.dueDate)}</time>
            </>
          )}
        </p>
        <Link href="/plan/" className={cn('inline-flex min-h-11 items-center gap-1 self-start rounded-md text-sm font-medium text-accent hover:underline', focusRing)}>
          Open My plan
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </Card>
  );
}
