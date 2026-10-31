'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { planProgress } from '@/lib/plan/progress';
import { goalHref, parsePlanTab, type PlanTab } from '@/lib/plan/routes';
import { useNow } from '@/lib/use-now';
import { useWorkspace } from '@/lib/store/use-workspace';
import { focusRing } from '@/components/ui/focus-ring';
import { Tabs } from '@/components/ui/tabs';
import { WINDOW_BAR, WINDOW_FRAME, WindowControls } from '@/components/ui/window';
import { BackupPrompt } from '@/components/layout/backup-prompt';
import { ProgressRing } from './progress-ring';
import { CalendarView } from './calendar-view';
import { DueThisWeek } from './due-this-week';
import { GoalList } from './goal-list';
import { PipelineBoard } from './pipeline-board';

/**
 * The plan workspace: pipeline board, goals and calendar tabs. The tab lives in `?tab=` and a goal
 * deep link in `?goal=`. Needs the stored workspace and "now", so static HTML is a skeleton.
 */
export function Plan() {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <UrlPlan />
    </Suspense>
  );
}

function UrlPlan() {
  const params = useSearchParams();
  const goalId = params.get('goal') ?? undefined;
  const tab = parsePlanTab(params.get('tab'), params.get('goal'));
  const ready = useWorkspace((s) => s.ready);
  const now = useNow();
  if (!ready || !now) return <PlanSkeleton />;
  return <PlanView tab={tab} goalId={goalId} now={now} />;
}

function PlanView({ tab, goalId, now }: { tab: PlanTab; goalId?: string; now: Date }) {
  const goals = useWorkspace((s) => s.ws.goals);
  const pipeline = useWorkspace((s) => s.ws.pipeline);
  const applications = pipeline.length;
  const openGoals = useMemo(() => goals.filter((g) => g.status !== 'done').length, [goals]);
  const { done, total, percent, next } = useMemo(() => planProgress({ goals, pipeline }), [goals, pipeline]);

  const select = (next: PlanTab) => {
    // Next.js syncs native history calls with useSearchParams. Replace, so tabs don't fill the back
    // stack; switching tabs also drops a ?goal= deep link.
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const count = (n: number, label: string) => (
    <>{label} <span className="num font-normal text-muted-fg">{n}</span></>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl">My plan</h1>
        <p className="text-muted-fg">Track the programs you are applying for, the goals that get each application done, and the dates that matter.</p>
        {total > 0 && (
          <div className="mt-2 flex items-center gap-4">
            <ProgressRing percent={percent} />
            <p className="min-w-0 text-sm text-muted-fg">
              <span className="num text-fg">{done}</span> of <span className="num text-fg">{total}</span> {total === 1 ? 'goal' : 'goals'} done
              {next ? (
                <>
                  . Next:{' '}
                  <Link href={goalHref(next.id)} className={cn('break-words rounded-sm font-medium text-accent underline-offset-4 hover:underline', focusRing)}>{next.title}</Link>
                  , due <time dateTime={next.dueDate} className="whitespace-nowrap">{formatDate(next.dueDate)}</time>.
                </>
              ) : '.'}
            </p>
          </div>
        )}
      </header>

      <BackupPrompt />

      <DueThisWeek />

      <Tabs
        label="Plan views"
        value={tab}
        onValueChange={select}
        tabs={[
          { value: 'pipeline', label: count(applications, 'Pipeline'), content: <PipelineBoard now={now} /> },
          { value: 'goals', label: count(openGoals, 'Goals'), content: <GoalList now={now} highlightId={goalId} /> },
          { value: 'calendar', label: 'Calendar', content: <CalendarView now={now} /> },
        ]}
      />
    </div>
  );
}

function PlanSkeleton() {
  // The heading, the tabs and the four pipeline windows with their bars and glyphs, so the page does
  // not jump when the workspace loads. A status, so "Loading your plan" is announced as text (a plain
  // div cannot take an aria-label).
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading your plan</span>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex max-w-3xl flex-col gap-2">
          <div className="h-9 w-48 rounded bg-surface" />
          <div className="h-6 rounded bg-surface" />
        </div>
        <div className="h-11 w-80 max-w-full rounded bg-surface" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(WINDOW_FRAME, 'border-border')}>
              <div className={WINDOW_BAR}>
                <div className="h-6 flex-1">
                  <div className="h-full w-28 rounded bg-surface" />
                </div>
                <WindowControls />
              </div>
              <div className="h-56" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
