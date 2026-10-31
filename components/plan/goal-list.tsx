'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, CircleAlert, Ellipsis, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { formatDate } from '@/lib/dates';
import { appBaseUrl, goalFilename, hasDueDate, workspaceGoalEvent } from '@/lib/calendar/events';
import { goalsByApplication, isOverdue, type GoalGroup } from '@/lib/plan/selectors';
import { completesApplication } from '@/lib/plan/progress';
import { cheer, goalsDoneCheer, originOf } from '@/lib/celebrate';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { AddToCalendar } from '@/components/calendar/add-to-calendar';
import { Art } from '@/components/ui/art';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/field';
import { focusRing } from '@/components/ui/focus-ring';
import { LIST_FRAME } from '@/components/ui/list';
import { Menu } from '@/components/ui/menu';
import { GoalEditor } from './goal-editor';

const STATUS_LABELS: Record<Goal['status'], string> = { todo: 'To do', doing: 'In progress', blocked: 'Blocked', done: 'Done' };
const HIGHLIGHT_MS = 4000;

type Editing = { goal?: Goal; applicationId?: string } | null;

/** Goals grouped by application, with done, status, steps, calendar and edit controls on each row. */
export function GoalList({ now, highlightId }: { now: Date; highlightId?: string }) {
  const ws = useWorkspace((s) => s.ws);
  const removeGoal = useWorkspace((s) => s.removeGoal);
  const groups = useMemo(() => goalsByApplication(ws), [ws]);
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Goal>();
  const [highlight, setHighlight] = useState<{ id: string; at: number }>();
  const [announcement, setAnnouncement] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const missing = highlightId !== undefined && !ws.goals.some((g) => g.id === highlightId);

  // Deep link (?goal=) or a just-added goal: scroll to it, focus it and highlight it briefly.
  const target = highlight?.id ?? highlightId;
  const targetKey = highlight ? highlight.at : highlightId;
  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(`goal-${target}`);
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
    el.dataset.highlight = 'true';
    const t = setTimeout(() => { delete el.dataset.highlight; }, HIGHLIGHT_MS);
    return () => { clearTimeout(t); delete el.dataset.highlight; };
  }, [target, targetKey]);

  const openGoals = ws.goals.filter((g) => g.status !== 'done').length;
  const visible = groups.filter((g) => g.goals.length > 0 || g.application);

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">{announcement}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-fg">
          <span className="num text-fg">{openGoals}</span> open {openGoals === 1 ? 'goal' : 'goals'}
          {ws.goals.length > openGoals && <>, <span className="num text-fg">{ws.goals.length - openGoals}</span> done</>}
        </p>
        <Button ref={addRef} variant="primary" onClick={() => setEditing({})}>
          <Plus aria-hidden="true" size={16} />
          Add goal
        </Button>
      </div>

      {missing && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <CircleAlert aria-hidden="true" size={16} className="mt-[3px] shrink-0 text-muted-fg" />
          That goal is no longer in your plan. It may have been completed elsewhere or removed.
        </p>
      )}

      {visible.length === 0 ? (
        /* The searching platypus, as on the directory's empty state; decorative, the copy says it. */
        <EmptyState
          art={<Art name="platypus-search" alt="" sizes="(min-width: 48rem) 128px, 96px" className="w-24 md:w-32" />}
          title="Big applications get done one small goal at a time."
          description="Add a program to your pipeline and its checklist becomes your first goals. You can also add your own."
          action={<Link href="/programs/" className={cn('inline-flex min-h-11 items-center rounded-sm text-sm text-accent underline-offset-4 hover:underline', focusRing)}>Browse programs</Link>}
        />
      ) : (
        visible.map((group) => (
          <GoalGroupSection
            key={group.id}
            group={group}
            now={now}
            onAdd={() => setEditing({ applicationId: group.application?.id })}
            onEdit={(goal) => setEditing({ goal })}
            onRemove={setRemoving}
          />
        ))
      )}

      <GoalEditor
        open={editing !== null}
        goal={editing?.goal}
        applicationId={editing?.applicationId}
        onClose={() => setEditing(null)}
        onSaved={(id) => {
          setHighlight({ id, at: Date.now() });
          setAnnouncement(editing?.goal ? 'Goal saved.' : 'Goal added.');
        }}
      />
      <ConfirmDialog
        open={removing !== undefined}
        title="Remove this goal?"
        description={removing && <>&ldquo;{removing.title}&rdquo; and its steps will be deleted. This can&rsquo;t be undone.</>}
        confirmLabel="Remove goal"
        onCancel={() => setRemoving(undefined)}
        onConfirm={() => {
          if (removing) removeGoal(removing.id);
          setRemoving(undefined);
          setAnnouncement('Goal removed.');
          requestAnimationFrame(() => addRef.current?.focus());
        }}
      />
    </div>
  );
}

function GoalGroupSection({ group, now, onAdd, onEdit, onRemove }: {
  group: GoalGroup; now: Date; onAdd: () => void; onEdit: (g: Goal) => void; onRemove: (g: Goal) => void;
}) {
  const headingId = `group-${group.id}`;
  const program = group.application?.programSlug ? getProgram(group.application.programSlug) : undefined;
  const done = group.goals.filter((g) => g.status === 'done').length;
  const sectionRef = useRef<HTMLElement>(null);
  const celebrate = (appId: string) => {
    void cheer(`${appId}:goals-done`, goalsDoneCheer(group.name), originOf(sectionRef.current));
  };
  return (
    <section ref={sectionRef} id={headingId} aria-labelledby={`${headingId}-h`} className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`${headingId}-h`} className="text-xl">
          {program
            ? <Link href={`/programs/${program.slug}/`} className={cn('rounded-sm underline-offset-4 hover:underline', focusRing)}>{group.name}</Link>
            : group.name}
        </h2>
        {group.goals.length > 0 && (
          <p className="num text-sm text-muted-fg">
            {done}/{group.goals.length}<span className="sr-only"> goals done</span>
          </p>
        )}
      </div>
      {group.goals.length ? (
        <ul className={LIST_FRAME}>
          {group.goals.map((g) => <GoalRow key={g.id} goal={g} now={now} onEdit={() => onEdit(g)} onRemove={() => onRemove(g)} onCompletesApplication={celebrate} />)}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border-strong px-4 py-2 text-sm text-muted-fg">
          No goals for this application yet.
          <Button variant="ghost" onClick={onAdd}>
            <Plus aria-hidden="true" size={16} />
            Add a goal<span className="sr-only"> for {group.name}</span>
          </Button>
        </div>
      )}
    </section>
  );
}

function GoalRow({ goal, now, onEdit, onRemove, onCompletesApplication }: {
  goal: Goal; now: Date; onEdit: () => void; onRemove: () => void; onCompletesApplication: (appId: string) => void;
}) {
  const ws = useWorkspace((s) => s.ws);
  const updateGoal = useWorkspace((s) => s.updateGoal);
  const toggleStep = useWorkspace((s) => s.toggleStep);
  const id = useId();
  const [showSteps, setShowSteps] = useState(false);
  const done = goal.status === 'done';
  const overdue = isOverdue(goal, now);
  const stepsDone = goal.steps.filter((s) => s.done).length;
  // Work out before saving whether this change finishes the application's last open goal.
  const setStatus = (status: Goal['status']) => {
    const appId = completesApplication(useWorkspace.getState().ws, goal.id, status);
    updateGoal(goal.id, { status });
    if (appId) onCompletesApplication(appId);
  };
  const event = useMemo(() => (hasDueDate(goal) ? workspaceGoalEvent(ws, goal, appBaseUrl()) : undefined), [ws, goal]);

  return (
    <li
      id={`goal-${goal.id}`}
      tabIndex={-1}
      className={cn(
        'flex scroll-mt-24 flex-col gap-3 p-4 transition-colors duration-200 focus:outline-none',
        'data-[highlight=true]:bg-neutral-bg data-[highlight=true]:ring-2 data-[highlight=true]:ring-inset data-[highlight=true]:ring-accent',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <label className="-m-3 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md has-focus-visible:outline-2 has-focus-visible:outline-accent">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setStatus(e.target.checked ? 'done' : 'todo')}
              className="size-5 accent-accent outline-none"
            />
            <span className="sr-only">Done: {goal.title}</span>
          </label>
          <div className="flex min-w-0 flex-col gap-1">
            <p id={`${id}-title`} className={cn('break-words font-medium', done && 'text-muted-fg line-through')}>{goal.title}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              {goal.dueDate ? (
                <span className={cn('inline-flex items-center gap-1', overdue ? 'text-danger' : 'text-muted-fg')}>
                  {overdue && <CircleAlert aria-hidden="true" size={16} className="shrink-0" />}
                  {overdue && <span className="font-medium">Overdue</span>}
                  <span className={cn(overdue && 'sr-only')}>Due</span>
                  <time dateTime={goal.dueDate} className="num">{formatDate(goal.dueDate)}</time>
                </span>
              ) : (
                <span className="text-muted-fg">No due date</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-8 sm:shrink-0 sm:pl-0">
          <label htmlFor={`${id}-status`} className="sr-only">Status of {goal.title}</label>
          <div className="w-36">
            <Select
              id={`${id}-status`}
              value={goal.status}
              onChange={(e) => setStatus(e.target.value as Goal['status'])}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          {event && !done && (
            <AddToCalendar
              event={event}
              filename={goalFilename(goal)}
              aria-label={`Add to calendar: ${goal.title}`}
              variant="ghost"
              align="end"
            />
          )}
          <Menu
            label={<span className="sr-only">More</span>}
            icon={Ellipsis}
            iconOnly
            variant="ghost"
            align="end"
            aria-label={`More actions for “${goal.title}”`}
            items={[
              { id: 'edit', label: 'Edit goal', icon: Pencil, onSelect: onEdit },
              { id: 'remove', label: 'Remove goal', icon: Trash2, onSelect: onRemove },
            ]}
          />
        </div>
      </div>

      {goal.steps.length > 0 && (
        <div className="pl-8">
          <button
            type="button"
            aria-expanded={showSteps}
            aria-controls={`${id}-steps`}
            onClick={() => setShowSteps((v) => !v)}
            className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-fg hover:text-accent', focusRing)}
          >
            <ListChecks aria-hidden="true" size={16} className="text-muted-fg" />
            Steps <span className="num text-muted-fg">{stepsDone}/{goal.steps.length}</span>
            <ChevronDown aria-hidden="true" size={16} className={cn('text-muted-fg transition-transform duration-150', showSteps && 'rotate-180')} />
          </button>
          <ul id={`${id}-steps`} hidden={!showSteps} className="flex flex-col">
            {goal.steps.map((s) => (
              <li key={s.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent">
                  <input type="checkbox" checked={s.done} onChange={() => toggleStep(goal.id, s.id)} className="size-4 shrink-0 accent-accent outline-none" />
                  <span className={cn(s.done && 'text-muted-fg line-through')}>{s.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
