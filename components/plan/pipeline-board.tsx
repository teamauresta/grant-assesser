'use client';

import { useCallback, useId, useRef, useState, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, CircleX, Plus, SquareKanban, Trophy, Undo2 } from 'lucide-react';
import { LIMITS, type Application } from '@/lib/schema';
import { BOARD_COLUMNS, STAGE_LABELS, applicationName, columnOf, type BoardColumn, type Stage } from '@/lib/plan/applications';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cheer, originOf, stageCheer } from '@/lib/celebrate';
import { cn } from '@/lib/cn';
import { Button, buttonClasses } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { focusRing } from '@/components/ui/focus-ring';
import { Field, Input, Textarea } from '@/components/ui/field';
import { useMotionReady } from '@/components/motion/motion-provider';
import { ApplicationCard } from './application-card';

const OUTCOMES = [
  { stage: 'awarded', icon: Trophy, description: 'You received the funding or place.' },
  { stage: 'declined', icon: CircleX, description: 'The application was not successful.' },
  { stage: 'withdrawn', icon: Undo2, description: 'You decided not to go ahead.' },
] as const;

/** Pipeline board: four columns, drag and drop on desktop, and a Move to… menu on every card. */
export function PipelineBoard({ now }: { now: Date }) {
  const pipeline = useWorkspace((s) => s.ws.pipeline);
  const goals = useWorkspace((s) => s.ws.goals);
  const moveApplication = useWorkspace((s) => s.moveApplication);
  const removeApplication = useWorkspace((s) => s.removeApplication);

  const [announcement, setAnnouncement] = useState('');
  const [focusId, setFocusId] = useState<string>();
  const [dragId, setDragId] = useState<string>();
  const [overColumn, setOverColumn] = useState<BoardColumn['id']>();
  const [notesFor, setNotesFor] = useState<Application>();
  const [removing, setRemoving] = useState<Application>();
  const [outcomeFor, setOutcomeFor] = useState<Application>();
  const [adding, setAdding] = useState(false);
  /** Cards glide once motion has loaded, never under reduced motion (not even for one frame). */
  const glide = useMotionReady();
  const headingRefs = useRef<Partial<Record<BoardColumn['id'], HTMLHeadingElement | null>>>({});
  const addRef = useRef<HTMLButtonElement>(null);

  const clearFocus = useCallback(() => setFocusId(undefined), []);
  const nameOf = (a: Application) => applicationName(a) ?? 'Untitled application';

  const move = (a: Application, stage: Stage) => {
    if (a.stage === stage) return;
    moveApplication(a.id, stage);
    setFocusId(a.id);
    setAnnouncement(`Moved ${nameOf(a)} to ${STAGE_LABELS[stage]}.`);
    const c = stageCheer(stage);
    if (c) void cheer(`${a.id}:${stage}`, c, originOf(document.querySelector(`[data-app-id="${a.id}"]`)));
  };

  const onDrop = (e: DragEvent, column: BoardColumn) => {
    e.preventDefault();
    setOverColumn(undefined);
    const app = pipeline.find((a) => a.id === (dragId ?? e.dataTransfer.getData('text/plain')));
    setDragId(undefined);
    if (!app || column.stages.includes(app.stage)) return;
    // Outcome holds three stages, so ask which one.
    if (column.id === 'outcome') setOutcomeFor(app);
    else move(app, column.stages[0]);
  };

  const confirmRemove = () => {
    if (!removing) return;
    const column = columnOf(removing.stage).id;
    removeApplication(removing.id);
    setAnnouncement(`Removed ${nameOf(removing)} and its goals.`);
    setRemoving(undefined);
    // The card (and the menu that opened the dialog) is gone; keep focus in the same column.
    requestAnimationFrame(() => headingRefs.current[column]?.focus());
  };

  const status = <p role="status" className="sr-only">{announcement}</p>;

  const addButton = (
    <Button ref={addRef} onClick={() => setAdding(true)}>
      <Plus aria-hidden="true" size={16} strokeWidth={1.5} />
      Add custom application
    </Button>
  );
  const addDialog = <AddCustomDialog open={adding} onClose={() => setAdding(false)} onAdded={(id, name) => { setFocusId(id); setAnnouncement(`Added ${name} to Considering.`); }} />;

  if (!pipeline.length) {
    return (
      <div className="flex flex-col gap-4">
        {status}
        <EmptyState
          icon={SquareKanban}
          title="Every funded startup started with one application."
          description="Add your first from your results, or browse programs."
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/programs/" className={buttonClasses({ variant: 'primary' })}>Browse programs<ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} /></Link>
              <Link href="/assess/results/" className={buttonClasses()}>See your results</Link>
              {addButton}
            </div>
          )}
        />
        {addDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-fg">
          <span className="hidden md:inline">Drag a card by its grip, or use </span>
          <span className="md:hidden">Use </span>
          <span className="font-medium text-fg">Move to…</span> to change its stage.
        </p>
        {addButton}
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {BOARD_COLUMNS.map((column) => {
            const apps = pipeline.filter((a) => column.stages.includes(a.stage));
            const headingId = `column-${column.id}`;
            const dropTarget = dragId !== undefined && !apps.some((a) => a.id === dragId);
            return (
              <section
                key={column.id}
                aria-labelledby={headingId}
                onDragOver={(e) => {
                  if (!dropTarget) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overColumn !== column.id) setOverColumn(column.id);
                }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn((c) => (c === column.id ? undefined : c)); }}
                onDrop={(e) => onDrop(e, column)}
                className={cn(
                  'flex min-w-0 flex-col gap-3 rounded-lg border bg-surface p-3 transition-[border-color,background-color] duration-150',
                  overColumn === column.id ? 'border-accent' : dropTarget ? 'border-dashed border-border-strong' : 'border-border',
                )}
              >
                <h2
                  id={headingId}
                  ref={(el) => { headingRefs.current[column.id] = el; }}
                  tabIndex={-1}
                  className="flex items-baseline justify-between gap-2 px-1 text-base focus:outline-none"
                >
                  {column.label}
                  <span className="num font-mono text-sm font-normal text-muted-fg">
                    {apps.length}<span className="sr-only"> {apps.length === 1 ? 'application' : 'applications'}</span>
                  </span>
                </h2>
                {apps.length ? (
                  <ul className="flex flex-col gap-3">
                    {apps.map((a) => (
                      // A moved card glides to its new column (layoutId). Position only, so a card
                      // that changes height never stretches its text; never while being dragged, so
                      // the drag image and the animation do not fight; never under reduced motion.
                      // Nothing starts hidden.
                      <m.li
                        key={a.id}
                        data-app-id={a.id}
                        layout={glide && dragId !== a.id ? 'position' : false}
                        layoutId={glide ? a.id : undefined}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <ApplicationCard
                          application={a}
                          goals={goals}
                          now={now}
                          autoFocus={focusId === a.id}
                          onFocused={clearFocus}
                          dragging={dragId === a.id}
                          onDragStart={() => setDragId(a.id)}
                          onDragEnd={() => { setDragId(undefined); setOverColumn(undefined); }}
                          onMove={(stage) => move(a, stage)}
                          onEditNotes={() => setNotesFor(a)}
                          onRemove={() => setRemoving(a)}
                        />
                      </m.li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-fg">
                    {column.id === 'outcome' ? 'Awarded, declined and withdrawn applications appear here.' : 'Nothing here yet.'}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </LayoutGroup>

      {addDialog}
      {notesFor && <NotesDialog application={notesFor} name={nameOf(notesFor)} onClose={() => setNotesFor(undefined)} />}
      <ConfirmDialog
        open={removing !== undefined}
        title={removing ? `Remove ${nameOf(removing)}?` : ''}
        description={removing && <RemoveDescription application={removing} goals={goals.filter((g) => g.applicationId === removing.id).length} />}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(undefined)}
      />
      <Dialog
        open={outcomeFor !== undefined}
        onClose={() => setOutcomeFor(undefined)}
        title="What was the outcome?"
        description={outcomeFor && <>Choose where {nameOf(outcomeFor)} ended up.</>}
        size="sm"
        footer={<Button onClick={() => setOutcomeFor(undefined)}>Cancel</Button>}
      >
        <div className="flex flex-col gap-2">
          {OUTCOMES.map(({ stage, icon: Icon, description }) => (
            <button
              key={stage}
              type="button"
              className={cn('flex min-h-11 items-center gap-3 rounded-md border border-border bg-bg px-4 py-3 text-left text-sm font-medium hover:border-border-strong hover:bg-surface', focusRing)}
              onClick={() => { if (outcomeFor) move(outcomeFor, stage); setOutcomeFor(undefined); }}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0 text-muted-fg" />
              <span className="flex flex-col">
                <span>{STAGE_LABELS[stage]}</span>
                <span className="font-normal text-muted-fg">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function RemoveDescription({ application, goals }: { application: Application; goals: number }) {
  return (
    <>
      {goals > 0
        ? <>This also deletes its <span className="num font-mono">{goals}</span> {goals === 1 ? 'goal' : 'goals'}{application.notes ? ' and your notes' : ''}. </>
        : application.notes ? <>This also deletes your notes. </> : null}
      This can&rsquo;t be undone.
    </>
  );
}

function NotesDialog({ application, name, onClose }: { application: Application; name: string; onClose: () => void }) {
  const updateApplication = useWorkspace((s) => s.updateApplication);
  const [notes, setNotes] = useState(application.notes);
  const formId = useId();
  const save = (e: FormEvent) => {
    e.preventDefault();
    updateApplication(application.id, { notes: notes.trim() });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Notes"
      description={name}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form={formId}>Save notes</Button></>}
    >
      <form id={formId} onSubmit={save}>
        <Field label="Notes" help="Contacts, reference numbers, what the assessor asked. Saved in this browser only.">
          {(control) => <Textarea {...control} rows={6} maxLength={LIMITS.notes} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}

function AddCustomDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string, name: string) => void }) {
  const addCustomApplication = useWorkspace((s) => s.addCustomApplication);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const close = () => { setName(''); setError(undefined); onClose(); };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name, for example "Angel round" or a grant that isn\'t listed.');
      inputRef.current?.focus();
      return;
    }
    const id = addCustomApplication(trimmed);
    close();
    onAdded(id, trimmed);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add custom application"
      description="Track funding that isn't in the directory, such as a local council grant or an angel round."
      initialFocusRef={inputRef}
      size="sm"
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" type="submit" form={formId}>Add to pipeline</Button></>}
    >
      <form id={formId} noValidate onSubmit={save}>
        <Field label="Name" required error={error}>
          {(control) => (
            <Input {...control} ref={inputRef} value={name} maxLength={LIMITS.name} autoComplete="off" onChange={(e) => { setName(e.target.value); if (error && e.target.value.trim()) setError(undefined); }} />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
