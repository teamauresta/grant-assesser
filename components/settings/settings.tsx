'use client';

import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { LIMITS, PERSONAS } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';
import { QUESTIONS } from '@/lib/assessment/questions';
import { formatDate, todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { applyTheme, getStoredTheme, type ThemePreference } from '@/lib/theme';
import { exportWorkspaceFile, importSizeError, parseImport, type ImportSummary } from '@/lib/store/transfer';
import { useWorkspace } from '@/lib/store/use-workspace';
import type { Workspace } from '@/lib/schema';
import { BackupPrompt } from '@/components/layout/backup-prompt';
import { Button } from '@/components/ui/button';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { ErrorText, Field, HelpText, Input, Select } from '@/components/ui/field';
import { focusRing } from '@/components/ui/focus-ring';

const FY_QUESTION = QUESTIONS.find((q) => q.id === 'fyEndMonth')!;
const REMINDER_OPTIONS = [14, 7, 3, 1] as const;
const THEME_OPTIONS = [
  { value: 'system', label: 'System', description: 'Match your device setting' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function describeSummary(s: ImportSummary): string {
  return `${s.hasProfile ? '1 profile' : 'no profile'}, ${plural(s.applications, 'application')}, ${plural(s.goals, 'goal')}`;
}

/** The settings page body. Needs the stored workspace, so static HTML is a skeleton. */
export function Settings() {
  const ready = useWorkspace((s) => s.ready);
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Settings</h1>
        <p className="text-muted-fg">Your persona, company basics, appearance and reminders, and a backup of your workspace.</p>
      </header>
      {ready ? <SettingsBody /> : <SettingsSkeleton />}
    </div>
  );
}

function SettingsBody() {
  return (
    <>
      <BackupPrompt />
      <PersonaSection />
      <CompanySection />
      <AppearanceSection />
      <RemindersSection />
      <DataSection />
      <Section id="privacy" title="Privacy">
        <p className="flex items-start gap-2 text-sm text-muted-fg">
          <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
          <span className="pt-0.5">Your workspace is stored only in this browser. Nothing is sent to a server.</span>
        </p>
      </Section>
    </>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-xl">{title}</h2>
        {description && <p className="text-sm text-muted-fg">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PersonaSection() {
  const persona = useWorkspace((s) => s.ws.profile.persona);
  const setProfile = useWorkspace((s) => s.setProfile);
  return (
    <Section id="persona" title="Persona" description="Sets how results are ranked and which starter goals are suggested.">
      <ChoiceGroup
        type="radio"
        name="persona"
        legend="Which best describes your company?"
        columns={3}
        value={persona}
        onChange={(v) => setProfile({ persona: v })}
        options={PERSONAS.map((p) => ({ value: p, label: PERSONAS_INFO[p].label, description: PERSONAS_INFO[p].description }))}
      />
    </Section>
  );
}

function CompanySection() {
  const fyEndMonth = useWorkspace((s) => s.ws.profile.fyEndMonth);
  const setProfile = useWorkspace((s) => s.setProfile);
  return (
    <Section id="company" title="Company basics">
      <Field label={FY_QUESTION.label} help={FY_QUESTION.help} className="max-w-xs">
        {(control) => (
          <Select
            {...control}
            value={fyEndMonth === undefined ? '' : String(fyEndMonth)}
            onChange={(e) => setProfile({ fyEndMonth: e.currentTarget.value ? Number(e.currentTarget.value) : undefined })}
          >
            <option value="">Not sure</option>
            {FY_QUESTION.options!.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
          </Select>
        )}
      </Field>
      <p className="text-sm">
        <Link href="/assess/" className={cn('font-medium text-accent underline underline-offset-2', focusRing)}>
          Review all your answers in the assessment
        </Link>
      </p>
    </Section>
  );
}

function AppearanceSection() {
  const stored = useWorkspace((s) => s.ws.settings.theme);
  const setSettings = useWorkspace((s) => s.setSettings);
  // What this browser actually applies (the pre-paint script reads it); the workspace copy is a
  // fallback. Read on every render: choosing a theme or importing a workspace changes both together.
  const theme = getStoredTheme() ?? stored;
  const choose = (next: ThemePreference) => {
    applyTheme(next);
    setSettings({ theme: next });
  };
  return (
    <Section id="appearance" title="Appearance">
      <ChoiceGroup type="radio" name="theme" legend="Theme" columns={3} value={theme} onChange={choose} options={THEME_OPTIONS} />
    </Section>
  );
}

function RemindersSection() {
  const current = useWorkspace((s) => s.ws.settings.remindersDefault);
  const setSettings = useWorkspace((s) => s.setSettings);
  const [error, setError] = useState<string>();
  const standard = new Set<number>(REMINDER_OPTIONS);
  const onChange = (values: string[]) => {
    if (values.length === 0) {
      setError('Keep at least one reminder. Turn another on before turning this one off.');
      return;
    }
    // Keep any non-standard offsets (e.g. from an imported file) that this form doesn't show.
    const extras = current.filter((d) => !standard.has(d));
    const next = [...new Set([...extras, ...values.map(Number)])].sort((a, b) => b - a);
    if (next.length > LIMITS.reminders) {
      setError(`Choose at most ${LIMITS.reminders} reminders. Turn one off before turning this one on.`);
      return;
    }
    setError(undefined);
    setSettings({ remindersDefault: next });
  };
  return (
    <Section id="reminders" title="Reminders">
      <ChoiceGroup
        type="checkbox"
        name="reminders"
        legend="Default reminders for new goals"
        help="Used when you add a goal and in calendar exports. Goals you already have keep their own reminders."
        columns={2}
        value={current.filter((d) => standard.has(d)).map(String)}
        onChange={onChange}
        error={error}
        options={REMINDER_OPTIONS.map((d) => ({ value: String(d), label: `${plural(d, 'day')} before` }))}
      />
    </Section>
  );
}

type PendingImport = { ws: Workspace; summary: ImportSummary };

function DataSection() {
  const ws = useWorkspace((s) => s.ws);
  const { markExported, importWorkspace, reset } = useWorkspace.getState();
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState<string>();
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const fileId = useId();
  const helpId = `${fileId}-help`;
  const errorId = `${fileId}-error`;

  const onExport = () => {
    exportWorkspaceFile(ws, new Date());
    markExported();
    setMessage('Workspace exported. Check your downloads folder.');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    input.value = '';
    if (!file) return;
    setMessage('');
    const tooLarge = importSizeError(file.size);
    if (tooLarge) { setImportError(tooLarge); return; }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError("This file couldn't be opened. Check it is on this device and try again.");
      return;
    }
    const r = parseImport(text);
    if (!r.ok) { setImportError(r.error); return; }
    setImportError(undefined);
    setPending({ ws: r.ws, summary: r.summary });
  };

  const confirmImport = () => {
    if (!pending) return;
    importWorkspace(pending.ws);
    // The file's theme becomes this browser's choice too, as if it had been picked here.
    applyTheme(pending.ws.settings.theme);
    setMessage(`Workspace imported: ${describeSummary(pending.summary)}.`);
    setPending(null);
  };

  const confirmReset = () => {
    reset();
    setResetOpen(false);
    setImportError(undefined);
    setMessage('Your workspace was reset.');
  };

  return (
    <Section id="your-data" title="Your data">
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Export</h3>
        <HelpText>Downloads everything in your workspace as a .json file you can import later, or in another browser.</HelpText>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={onExport}>
            <Download aria-hidden="true" size={16} strokeWidth={1.5} />
            Export workspace (.json)
          </Button>
          <span className="text-sm text-muted-fg">
            {ws.lastExportedAt ? `Last exported ${formatDate(todayISO(new Date(ws.lastExportedAt)))}` : 'Not exported yet'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Import</h3>
        <label htmlFor={fileId} className="text-sm font-medium">Choose a workspace file (.json)</label>
        <HelpText id={helpId}>Replaces your current workspace. You&apos;ll see what the file contains before anything changes.</HelpText>
        <input
          id={fileId}
          type="file"
          accept=".json,application/json"
          onChange={onFile}
          aria-invalid={importError ? true : undefined}
          aria-describedby={importError ? `${helpId} ${errorId}` : helpId}
          className={cn(
            'w-full max-w-md rounded-md text-sm text-muted-fg',
            'file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-solid file:border-border-strong file:bg-bg file:px-4 file:text-sm file:font-medium file:text-fg hover:file:bg-surface',
            focusRing,
          )}
        />
        <div role="alert">{importError && <ErrorText id={errorId}>{importError}</ErrorText>}</div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Reset</h3>
        <HelpText>Deletes your profile, pipeline, goals and settings from this browser.</HelpText>
        <div>
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
            Reset everything
          </Button>
        </div>
      </div>

      {/* Always rendered so screen readers have the live region before a message arrives. */}
      <div role="status" className="text-sm font-medium">{message && <p>{message}</p>}</div>

      <ConfirmDialog
        open={pending !== null}
        title="Replace your workspace?"
        description={pending && `Replace your current workspace with: ${describeSummary(pending.summary)}? This can't be undone. Export first if you're unsure.`}
        confirmLabel="Replace workspace"
        onConfirm={confirmImport}
        onCancel={() => setPending(null)}
      />
      <ResetDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={confirmReset} />
    </Section>
  );
}

function ResetDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toLowerCase() === 'reset';
  const close = () => { setTyped(''); onClose(); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    setTyped('');
    onConfirm();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Reset everything?"
      description="This deletes your profile, pipeline, goals and settings from this browser. It can't be undone. Export first if you might need them."
      initialFocusRef={inputRef}
      size="sm"
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" form={formId} variant="danger" disabled={!matches}>Reset everything</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={submit}>
        <Field label={<>Type <span className="font-mono">reset</span> to confirm</>}>
          {(control) => (
            <Input
              {...control}
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your settings" className="flex flex-col gap-10">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 border-t border-border pt-8">
          <div className="h-7 w-40 rounded bg-surface" />
          <div className="h-24 rounded-lg border border-border bg-surface" />
        </div>
      ))}
    </div>
  );
}
