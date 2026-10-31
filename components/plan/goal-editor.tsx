'use client';

import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LIMITS, type Goal } from '@/lib/schema';
import { newId } from '@/lib/id';
import { applicationName } from '@/lib/plan/applications';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { focusRing } from '@/components/ui/focus-ring';

const REMINDER_OPTIONS = [14, 7, 3, 1] as const;

type Step = Goal['steps'][number];

export type GoalEditorProps = {
  open: boolean;
  onClose: () => void;
  /** The goal to edit; omit to add a new one. */
  goal?: Goal;
  /** Preselected application for a new goal. */
  applicationId?: string;
  /** Called with the saved goal's id. */
  onSaved?: (id: string) => void;
};

/** Add or edit a goal in a dialog. Mounts its form fresh on every opening. */
export function GoalEditor(props: GoalEditorProps) {
  const { open, onClose, goal } = props;
  const titleRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'Add goal'}
      initialFocusRef={titleRef}
      footer={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId}>{goal ? 'Save changes' : 'Add goal'}</Button>
        </>
      )}
    >
      <GoalForm {...props} formId={formId} titleRef={titleRef} />
    </Dialog>
  );
}

function GoalForm({ goal, applicationId, onClose, onSaved, formId, titleRef }: GoalEditorProps & { formId: string; titleRef: RefObject<HTMLInputElement | null> }) {
  const pipeline = useWorkspace((s) => s.ws.pipeline);
  const remindersDefault = useWorkspace((s) => s.ws.settings.remindersDefault);
  const addGoal = useWorkspace((s) => s.addGoal);
  const updateGoal = useWorkspace((s) => s.updateGoal);

  const [title, setTitle] = useState(goal?.title ?? '');
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? '');
  const [appId, setAppId] = useState(goal ? (goal.applicationId ?? '') : (applicationId ?? ''));
  const [steps, setSteps] = useState<Step[]>(() => goal?.steps.map((s) => ({ ...s })) ?? []);
  const [reminders, setReminders] = useState<string[]>(() => (goal?.reminderOffsetsDays ?? remindersDefault).map(String));
  const [error, setError] = useState<string>();
  const [reminderError, setReminderError] = useState<string>();
  const stepRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusStep = useRef<number | null>(null);

  // Options outside 14/7/3/1 (e.g. from an import) are kept so editing never drops them silently.
  const reminderValues = [...new Set([...REMINDER_OPTIONS.map(String), ...reminders])].sort((a, b) => Number(b) - Number(a));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a title, for example "Draft the project budget".');
      titleRef.current?.focus();
      return;
    }
    if (reminders.length > LIMITS.reminders) {
      setReminderError(`Choose at most ${LIMITS.reminders} reminders.`);
      return;
    }
    const fields = {
      title: trimmed,
      dueDate: dueDate || undefined,
      applicationId: appId || undefined,
      steps: steps.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title),
      reminderOffsetsDays: reminders.map(Number).sort((a, b) => b - a),
    };
    let id: string;
    if (goal) {
      updateGoal(goal.id, fields);
      id = goal.id;
    } else {
      id = addGoal({ ...fields, source: 'user' });
    }
    onClose();
    onSaved?.(id);
  };

  const addStep = () => {
    focusStep.current = steps.length;
    setSteps((s) => [...s, { id: newId(), title: '', done: false }]);
  };

  return (
    <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Title" required error={error}>
        {(control) => (
          <Input
            {...control}
            ref={titleRef}
            value={title}
            maxLength={LIMITS.title}
            autoComplete="off"
            onChange={(e) => { setTitle(e.target.value); if (error && e.target.value.trim()) setError(undefined); }}
          />
        )}
      </Field>

      <Field label="Due date" help="Optional. Goals with a due date can go in your calendar.">
        {(control) => <Input {...control} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
      </Field>

      <Field label="Application">
        {(control) => (
          <Select {...control} value={appId} onChange={(e) => setAppId(e.target.value)}>
            <option value="">None (Other goals)</option>
            {pipeline.map((a) => <option key={a.id} value={a.id}>{applicationName(a) ?? 'Untitled application'}</option>)}
          </Select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Steps</legend>
        {steps.length > 0 && (
          <ol className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span aria-hidden="true" className="num w-5 shrink-0 text-right text-sm text-muted-fg">{i + 1}</span>
                <Input
                  ref={(el) => {
                    stepRefs.current[i] = el;
                    if (el && focusStep.current === i) { focusStep.current = null; el.focus(); }
                  }}
                  aria-label={`Step ${i + 1}`}
                  value={s.title}
                  maxLength={LIMITS.title}
                  onChange={(e) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
                />
                <button
                  type="button"
                  aria-label={`Remove step ${i + 1}`}
                  onClick={() => {
                    setSteps((all) => all.filter((x) => x.id !== s.id));
                    // Keep focus in the list: the previous step, or the Add step button.
                    requestAnimationFrame(() => (stepRefs.current[i - 1] ?? document.getElementById(`${formId}-add-step`))?.focus());
                  }}
                  className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-fg hover:bg-neutral-bg hover:text-fg', focusRing)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <Button id={`${formId}-add-step`} variant="ghost" onClick={addStep} className="self-start">
          <Plus aria-hidden="true" size={16} />
          Add step
        </Button>
      </fieldset>

      <ChoiceGroup
        type="checkbox"
        name={`${formId}-reminders`}
        legend="Calendar reminders"
        help="Alarms on the calendar event before the due date."
        columns={2}
        value={reminders}
        onChange={(v) => { setReminders(v); if (v.length <= LIMITS.reminders) setReminderError(undefined); }}
        error={reminderError}
        options={reminderValues.map((v) => ({ value: v, label: `${v} ${v === '1' ? 'day' : 'days'} before` }))}
      />
    </form>
  );
}
