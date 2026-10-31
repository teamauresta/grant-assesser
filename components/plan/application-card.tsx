'use client';

import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, CircleAlert, Ellipsis, GripVertical, NotebookPen, Pencil, Trash2, Trophy, CircleX, Undo2, type LucideIcon } from 'lucide-react';
import type { Application, Goal } from '@/lib/schema';
import { getProgram } from '@/content/programs';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { STAGE_LABELS, applicationName, columnOf, parseAmount, type Stage } from '@/lib/plan/applications';
import { goalHref } from '@/lib/plan/routes';
import { applicationProgress, isOverdue } from '@/lib/plan/selectors';
import { STAGES } from '@/lib/schema';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/field';
import { focusRing } from '@/components/ui/focus-ring';
import { Menu, type MenuItem } from '@/components/ui/menu';
import { ProgramStatusPill } from '@/components/programs/program-status';

const OUTCOME_ICONS: Partial<Record<Stage, LucideIcon>> = { awarded: Trophy, declined: CircleX, withdrawn: Undo2 };

const linkClass = cn('rounded-sm underline-offset-4 hover:underline', focusRing);

export type ApplicationCardProps = {
  application: Application;
  goals: readonly Goal[];
  now: Date;
  onMove: (stage: Stage) => void;
  onEditNotes: () => void;
  onRemove: () => void;
  /** Focus the card, e.g. after it moved to another column; onFocused is called once it has focus. */
  autoFocus?: boolean;
  onFocused?: () => void;
  onDragStart?: (e: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
};

/** One application on the pipeline board. Dragging uses the grip; the Move to… menu is the keyboard and touch path. */
export function ApplicationCard({ application: a, goals, now, onMove, onEditNotes, onRemove, autoFocus, onFocused, onDragStart, onDragEnd, dragging }: ApplicationCardProps) {
  const program = a.programSlug ? getProgram(a.programSlug) : undefined;
  const name = applicationName(a) ?? 'Untitled application';
  const progress = applicationProgress(goals, a.id);
  const outcome = columnOf(a.stage).id === 'outcome';
  const OutcomeIcon = OUTCOME_ICONS[a.stage];
  const cardRef = useRef<HTMLElement>(null);
  const headingId = useId();
  // The card is draggable only while the grip is pressed, so text in the card stays selectable.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!autoFocus) return;
    cardRef.current?.focus();
    onFocused?.();
  }, [autoFocus, onFocused]);

  const moveItems: MenuItem[] = STAGES.filter((s) => s !== a.stage).map((s) => ({
    id: s, label: columnOf(s).id === 'outcome' ? `Outcome: ${STAGE_LABELS[s]}` : STAGE_LABELS[s], onSelect: () => onMove(s),
  }));
  const moreItems: MenuItem[] = [
    { id: 'notes', label: a.notes ? 'Edit notes' : 'Add notes', icon: NotebookPen, onSelect: onEditNotes },
    { id: 'remove', label: 'Remove from pipeline', icon: Trash2, onSelect: onRemove },
  ];

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      draggable={armed}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', a.id); onDragStart?.(e); }}
      onDragEnd={() => { setArmed(false); onDragEnd?.(); }}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-opacity duration-150',
        focusRing,
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 id={headingId} className="text-base leading-snug break-words">
            {program ? <Link href={`/programs/${program.slug}/`} className={linkClass}>{name}</Link> : name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {outcome && OutcomeIcon && (
              <Badge>
                <OutcomeIcon aria-hidden="true" size={16} />
                {STAGE_LABELS[a.stage]}
              </Badge>
            )}
            {program ? <ProgramStatusPill program={program} /> : <Badge>Custom</Badge>}
          </div>
        </div>
        {onDragStart && (
          <span
            aria-hidden="true"
            title="Drag to another column"
            onPointerDown={() => setArmed(true)}
            onPointerUp={() => setArmed(false)}
            className="-mr-1 hidden size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-fg hover:bg-neutral-bg hover:text-fg active:cursor-grabbing md:inline-flex"
          >
            <GripVertical size={16} />
          </span>
        )}
      </div>

      <ExpectedAmount application={a} name={name} />

      <div className="flex flex-col gap-1.5 text-sm">
        {progress.total > 0 ? (
          <>
            <p className="flex items-baseline justify-between gap-2">
              <Link href={`/plan/?tab=goals#group-${a.id}`} className={cn(linkClass, 'text-fg')}>
                <span className="num">{progress.done}</span> of <span className="num">{progress.total}</span> goals done
              </Link>
            </p>
            <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border">
              <div className="h-full origin-left rounded-full bg-accent transition-transform duration-200" style={{ transform: `scaleX(${progress.done / progress.total})` }} />
            </div>
          </>
        ) : (
          <p className="text-muted-fg">No goals yet</p>
        )}
        {progress.next && <NextGoal goal={progress.next} now={now} />}
      </div>

      {a.notes && <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-fg">{a.notes}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Menu label="Move to…" icon={ArrowRightLeft} items={moveItems} aria-label={`Move ${name} to…`} />
        <Menu
          label={<span className="sr-only">More</span>}
          icon={Ellipsis}
          iconOnly
          items={moreItems}
          variant="ghost"
          align="end"
          aria-label={`More actions for ${name}`}
          className="ml-auto"
        />
      </div>
    </article>
  );
}

function NextGoal({ goal, now }: { goal: Goal & { dueDate: string }; now: Date }) {
  const overdue = isOverdue(goal, now);
  return (
    <p className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-fg">Next goal</span>
      <Link href={goalHref(goal.id)} className={cn(linkClass, 'font-medium break-words')}>{goal.title}</Link>
      <span className={cn('inline-flex items-center gap-1 text-xs', overdue ? 'text-danger' : 'text-muted-fg')}>
        {overdue && <CircleAlert aria-hidden="true" size={16} className="shrink-0" />}
        {overdue && <span className="font-medium">Overdue ·</span>}
        <time dateTime={goal.dueDate} className="num">{formatDate(goal.dueDate)}</time>
      </span>
    </p>
  );
}

/** The expected amount, edited in place. Blank clears it. */
function ExpectedAmount({ application: a, name }: { application: Application; name: string }) {
  const updateApplication = useWorkspace((s) => s.updateApplication);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const start = () => { setText(a.expectedAmount ? String(a.expectedAmount) : ''); setError(undefined); setEditing(true); };
  const stop = () => { setEditing(false); requestAnimationFrame(() => editRef.current?.focus()); };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = parseAmount(text);
    if (Number.isNaN(n) || (n !== undefined && n <= 0)) {
      setError('Enter an amount in dollars, like 50000 or 50k.');
      inputRef.current?.focus();
      return;
    }
    updateApplication(a.id, { expectedAmount: n });
    stop();
  };

  if (editing) {
    return (
      <form onSubmit={save} noValidate className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs text-muted-fg">Expected amount (AUD)</label>
        <input
          ref={inputRef}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder="e.g. 50k"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); stop(); } }}
          className={cn('num min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-base aria-invalid:border-danger', focusRing)}
        />
        {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button variant="ghost" onClick={stop}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex flex-col">
        <span className="text-xs text-muted-fg">Expected amount</span>
        {a.expectedAmount
          ? <span className="num text-sm">{formatMoney(a.expectedAmount, 'AUD')}</span>
          : <span className="text-sm text-muted-fg">Not set</span>}
      </p>
      <button
        ref={editRef}
        type="button"
        onClick={start}
        aria-label={`${a.expectedAmount ? 'Edit' : 'Set'} expected amount for ${name}`}
        className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-fg hover:bg-neutral-bg hover:text-fg', focusRing)}
      >
        <Pencil aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
